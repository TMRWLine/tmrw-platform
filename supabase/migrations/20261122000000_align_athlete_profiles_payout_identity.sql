begin;

do $$
begin
  if to_regclass('public.athlete_profiles') is null then
    raise exception 'Expected the existing public.athlete_profiles table; review the profile schema before applying this migration.';
  end if;
end;
$$;

alter table public.athlete_profiles
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists stripe_account_id text,
  add column if not exists current_club text;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'athlete_profiles'
      and column_name = 'id' and udt_schema = 'pg_catalog' and udt_name = 'uuid'
  ) then
    raise exception 'athlete_profiles.id must be uuid; existing identity values need an owner-reviewed mapping.';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'athlete_profiles'
      and column_name in ('stripe_account_id', 'current_club')
      and udt_name not in ('text', 'varchar', 'bpchar')
  ) then
    raise exception 'Existing payout account and club columns must be text-compatible; no values have been converted.';
  end if;
end;
$$;

alter table public.athlete_profiles alter column id set default gen_random_uuid();
update public.athlete_profiles set id = gen_random_uuid() where id is null;
alter table public.athlete_profiles alter column id set not null;

do $$
declare
  id_attribute smallint;
begin
  select attnum into id_attribute
  from pg_catalog.pg_attribute
  where attrelid = 'public.athlete_profiles'::regclass and attname = 'id' and not attisdropped;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.athlete_profiles'::regclass and contype = 'p'
  ) then
    alter table public.athlete_profiles add primary key (id);
  elsif not exists (
    select 1 from pg_catalog.pg_index
    where indrelid = 'public.athlete_profiles'::regclass
      and indisunique and indisvalid and indimmediate
      and indpred is null and indexprs is null
      and indnkeyatts = 1 and indkey[0] = id_attribute
  ) then
    alter table public.athlete_profiles add unique (id);
  end if;
end;
$$;

grant select (id, stripe_account_id, current_club) on public.athlete_profiles to service_role;

notify pgrst, 'reload schema';
commit;

-- Apply this alignment before 20261120000005_club_payouts.sql on a legacy database.
-- Generated ids do not establish an auth identity, slug mapping or Connect account.
-- Compare these results and the row count with the owner's pre-migration snapshot.
-- select count(*) as profile_count, count(distinct id) as unique_ids,
--   count(*) filter (where id is null) as null_ids from public.athlete_profiles;
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns where table_schema = 'public'
--   and table_name = 'athlete_profiles' and column_name in ('id', 'stripe_account_id', 'current_club');
-- select conname, contype, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = 'public.athlete_profiles'::regclass and contype in ('p', 'u');
-- select relrowsecurity, relforcerowsecurity from pg_class
-- where oid = 'public.athlete_profiles'::regclass;
-- select * from pg_policies where schemaname = 'public' and tablename = 'athlete_profiles';
-- select column_name, has_column_privilege('service_role', 'public.athlete_profiles', column_name, 'SELECT')
-- from information_schema.columns where table_schema = 'public' and table_name = 'athlete_profiles'
--   and column_name in ('id', 'stripe_account_id', 'current_club');
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = to_regclass('public.club_payouts') and contype = 'f';
