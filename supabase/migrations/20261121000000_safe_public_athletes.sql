-- Public contracts: src/api.ts, src/types.ts SPATIAL_TIERS and server/index.js.
-- The public catalogue/dossier uses bundled profiles; live rows enrich matching
-- valuations and power search. The legacy workspace is not publicly reachable,
-- so agreements, messages, campaigns and campaign_applications are not created.
-- No sample athletes are published. Only trusted server roles can write.

begin;
set local search_path = public, extensions, pg_catalog;
create extension if not exists postgis;

-- Match-sponsors needs these optional columns on the existing sponsors table.
-- Existing columns, values, policies and privileges are left unchanged.
lock table public.sponsors in access exclusive mode;
select set_config('tmrw.sponsors_rows_before', (select count(*)::text from public.sponsors), true);

alter table public.sponsors
  add column if not exists business_name text,
  add column if not exists merchant_category text,
  add column if not exists budget_allocation numeric(12, 2),
  add column if not exists contact_email text,
  add column if not exists target_radius_meters integer default 1000,
  add column if not exists location geography(Point, 4326),
  add column if not exists postcode text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists currency text default 'AUD',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

-- Includes normalizeAthlete's legacy aliases. profile_data retains its JSON
-- position/ranking/specialty/age/market_value_aud/market_value_nzd/intake_status.
-- distance_km is origin-dependent and is computed by the RPCs, not stored.
alter table public.athletes
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists name text,
  add column if not exists full_name text,
  add column if not exists sport text,
  add column if not exists current_club text,
  add column if not exists club text,
  add column if not exists agreement_status text default 'no_agreement',
  add column if not exists licence_status text,
  add column if not exists profile_data jsonb,
  add column if not exists location geography(Point, 4326),
  add column if not exists postcode text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists follower_count integer,
  add column if not exists gender text,
  add column if not exists initials text,
  add column if not exists tier_tag text,
  add column if not exists media_intelligence jsonb,
  add column if not exists ip_lock boolean,
  add column if not exists master_licence_signed boolean default false,
  add column if not exists nrl_tpa_registered boolean default false,
  add column if not exists shute_shield_compliant boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists safe_athletes_location_gist on public.athletes using gist (location);
create index if not exists safe_athletes_created_at on public.athletes (created_at);
create index if not exists safe_athletes_postcode on public.athletes (postcode);
create index if not exists safe_athletes_sport on public.athletes (sport);

alter table public.athletes enable row level security;

-- Remove historical policies, including permissive ALL policies which would
-- otherwise combine with the read policy. service_role bypasses RLS.
do $$
declare
  policy_name text;
  column_names text;
begin
  for policy_name in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'athletes'
  loop
    execute format('drop policy if exists %I on public.athletes', policy_name);
  end loop;
  select string_agg(quote_ident(attname), ', ') into column_names
    from pg_attribute where attrelid = 'public.athletes'::regclass
      and attnum > 0 and not attisdropped;
  execute format(
    'revoke insert (%1$s), update (%1$s), references (%1$s) on public.athletes from public, anon, authenticated',
    column_names
  );
end;
$$;

drop policy if exists public_athletes_read on public.athletes;
create policy public_athletes_read on public.athletes for select
  to anon, authenticated
  using (profile_data ->> 'intake_status' is distinct from 'scouted');

revoke all privileges on public.athletes from public, anon, authenticated;
grant select on public.athletes to anon, authenticated;
grant all privileges on public.athletes to service_role;

-- PostgreSQL cannot replace input argument names or a function's return type.
-- Retire incompatible historical signatures without CASCADE. Dependencies cause
-- an atomic rollback rather than being removed. Reruns preserve current RPCs.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature, p.proname, p.proargnames, p.prorettype, p.proretset
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (
      p.oid = to_regprocedure('public.get_athletes_nearby(double precision,double precision,double precision)')
      or p.oid = to_regprocedure('public.get_athletes_by_tier(double precision,double precision,text)')
      or p.oid = to_regprocedure('public.match_sponsors_for_athlete(uuid)')
    )
  loop
    if not fn.proretset or fn.prorettype <> 'jsonb'::regtype or fn.proargnames is distinct from
      (case fn.proname
        when 'get_athletes_nearby' then array['store_lat', 'store_lon', 'radius_meters']
        when 'get_athletes_by_tier' then array['store_lat', 'store_lon', 'tier_code']
        else array['athlete_id']
      end)
    then
      execute format('drop function %s', fn.signature);
    end if;
  end loop;
end;
$$;

-- PostgREST returns an array of athlete objects, with all table fields plus
-- numeric distance_km and resolved latitude/longitude. Radius input is metres.
-- Missing/invalid coordinates, negative/non-finite radii return an empty array.
create or replace function public.get_athletes_nearby(
  store_lat double precision, store_lon double precision, radius_meters double precision
)
returns setof jsonb
language plpgsql stable security invoker
set search_path = pg_catalog, public, extensions
as $$
declare
  origin geography;
begin
  if store_lat is null or store_lon is null or radius_meters is null
    or not (store_lat between -90 and 90 and store_lon between -180 and 180)
    or not (radius_meters >= 0 and radius_meters < 'Infinity'::double precision)
  then return; end if;
  origin := st_setsrid(st_makepoint(store_lon, store_lat), 4326)::geography;
  return query
    select to_jsonb(a) || jsonb_build_object(
      'latitude', st_y(p.point::geometry), 'longitude', st_x(p.point::geometry),
      'distance_km', st_distance(p.point, origin) / 1000.0
    )
    from public.athletes a
    cross join lateral (select coalesce(a.location,
      case when a.latitude between -90 and 90 and a.longitude between -180 and 180
        then st_setsrid(st_makepoint(a.longitude, a.latitude), 4326)::geography end
    ) as point) p
    where p.point is not null and st_distance(p.point, origin) <= radius_meters
    order by st_distance(p.point, origin), a.id;
end;
$$;

-- SPATIAL_TIERS and fetchAthletesByTier's fallback use inclusive boundaries:
-- '01': 0 <= km <= 5; '02': 5 <= km <= 25; '03': km >= 25 (no upper bound).
-- Boundary athletes intentionally count in both adjacent bands. These spatial
-- codes are not checkout/package IDs or the static catalogue's commercial tiers.
-- Return shape matches nearby; unknown codes/invalid coordinates return [].
create or replace function public.get_athletes_by_tier(
  store_lat double precision, store_lon double precision, tier_code text
)
returns setof jsonb
language plpgsql stable security invoker
set search_path = pg_catalog, public, extensions
as $$
declare
  origin geography;
begin
  if store_lat is null or store_lon is null or tier_code is null
    or not (store_lat between -90 and 90 and store_lon between -180 and 180)
    or tier_code not in ('01', '02', '03')
  then return; end if;
  origin := st_setsrid(st_makepoint(store_lon, store_lat), 4326)::geography;
  return query
    select to_jsonb(a) || jsonb_build_object(
      'latitude', st_y(p.point::geometry), 'longitude', st_x(p.point::geometry),
      'distance_km', d.metres / 1000.0
    )
    from public.athletes a
    cross join lateral (select coalesce(a.location,
      case when a.latitude between -90 and 90 and a.longitude between -180 and 180
        then st_setsrid(st_makepoint(a.longitude, a.latitude), 4326)::geography end
    ) as point) p
    cross join lateral (select st_distance(p.point, origin) as metres) d
    where p.point is not null and case tier_code
      when '01' then d.metres between 0 and 5000
      when '02' then d.metres between 5000 and 25000
      when '03' then d.metres >= 25000
      else false end
    order by d.metres, a.id;
end;
$$;

-- Server GET /api/match-sponsors posts {athlete_id} with the public key.
-- Existing sponsor fields plus distance_meters/distance_km are returned. Spatial
-- fallback uses stored coordinates without updating any sponsor or athlete row.
create or replace function public.match_sponsors_for_athlete(athlete_id uuid)
returns setof jsonb
language sql stable security invoker
set search_path = pg_catalog, public, extensions
as $$
  with athlete_point as (
    select coalesce(a.location,
      case when a.latitude between -90 and 90 and a.longitude between -180 and 180
        then st_setsrid(st_makepoint(a.longitude, a.latitude), 4326)::geography end
    ) as point from public.athletes a where a.id = athlete_id
  )
  select to_jsonb(s) || jsonb_build_object(
    'latitude', st_y(p.point::geometry), 'longitude', st_x(p.point::geometry),
    'distance_meters', st_distance(p.point, a.point),
    'distance_km', st_distance(p.point, a.point) / 1000.0
  )
  from public.sponsors s cross join athlete_point a
  cross join lateral (select coalesce(s.location,
    case when s.latitude between -90 and 90 and s.longitude between -180 and 180
      then st_setsrid(st_makepoint(s.longitude, s.latitude), 4326)::geography end
  ) as point) p
  where a.point is not null and p.point is not null
    and s.target_radius_meters >= 0
    and st_distance(p.point, a.point) <= s.target_radius_meters
  order by st_distance(p.point, a.point), s.id;
$$;

revoke all on function public.get_athletes_nearby(double precision, double precision, double precision) from public;
revoke all on function public.get_athletes_by_tier(double precision, double precision, text) from public;
revoke all on function public.match_sponsors_for_athlete(uuid) from public;
grant execute on function public.get_athletes_nearby(double precision, double precision, double precision) to anon, authenticated, service_role;
grant execute on function public.get_athletes_by_tier(double precision, double precision, text) to anon, authenticated, service_role;
grant execute on function public.match_sponsors_for_athlete(uuid) to anon, authenticated, service_role;

do $$
begin
  if (select count(*) from public.sponsors) <> current_setting('tmrw.sponsors_rows_before')::bigint
  then raise exception 'Sponsor row count changed; rolling back'; end if;
end;
$$;
select current_setting('tmrw.sponsors_rows_before')::bigint as sponsors_before,
  count(*) as sponsors_after,
  count(*) = current_setting('tmrw.sponsors_rows_before')::bigint as sponsors_unchanged
from public.sponsors;
commit;

/* Verification queries (read-only, run as the SQL Editor owner):
select table_name, column_name, data_type, udt_schema, udt_name
from information_schema.columns
where table_schema = 'public' and table_name in ('athletes', 'sponsors')
order by table_name, ordinal_position;

select relname, relrowsecurity from pg_class
where oid = 'public.athletes'::regclass;
select policyname, roles, cmd, qual, with_check from pg_policies
where schemaname = 'public' and tablename = 'athletes';
select role_name,
  has_table_privilege(role_name, 'public.athletes', 'SELECT') as can_select,
  has_any_column_privilege(role_name, 'public.athletes', 'INSERT') as can_insert,
  has_any_column_privilege(role_name, 'public.athletes', 'UPDATE') as can_update,
  has_table_privilege(role_name, 'public.athletes', 'DELETE') as can_delete,
  has_table_privilege(role_name, 'public.athletes', 'TRUNCATE') as can_truncate
from unnest(array['anon', 'authenticated', 'service_role']) as role_name;

select p.oid::regprocedure as signature, p.proargnames, p.provolatile,
  p.prosecdef, p.proconfig, pg_get_function_result(p.oid),
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in
  ('get_athletes_nearby', 'get_athletes_by_tier', 'match_sponsors_for_athlete');

select count(*) as sponsors_rows_now from public.sponsors;
-- Compare with sponsors_before/sponsors_after/sponsors_unchanged printed by the
-- migration. It holds the sponsors lock until that check and commit complete.
*/
notify pgrst, 'reload schema';
