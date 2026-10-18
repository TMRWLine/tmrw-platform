-- ==============================================================================
-- TMRW PLATFORM: GUARDIAN VERIFICATION TOKENS + ABN MODULUS 89 VERIFICATION FLAG
-- Supports the public /guardian-verify countersign page and the ABN badge in the Talent Terminal.
-- ==============================================================================

alter table public.athlete_profiles
  add column if not exists guardian_token uuid,
  add column if not exists guardian_signed_at timestamp with time zone,
  add column if not exists abn_verified boolean not null default false;

create unique index if not exists idx_athlete_profiles_guardian_token
  on public.athlete_profiles (guardian_token)
  where guardian_token is not null;

-- ------------------------------------------------------------------------------
-- ABN Modulus 89 (ATO): 11 digits, first digit minus 1, weighted sum divisible by 89.
-- ------------------------------------------------------------------------------
create or replace function public.is_valid_abn(p_abn text)
returns boolean
language plpgsql
immutable
as $$
declare
  digits text;
  weights int[] := array[10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  total int := 0;
  d int;
  i int;
begin
  if p_abn is null then
    return false;
  end if;
  digits := regexp_replace(p_abn, '\D', '', 'g');
  if length(digits) <> 11 then
    return false;
  end if;
  for i in 1..11 loop
    d := substr(digits, i, 1)::int;
    if i = 1 then
      d := d - 1;
    end if;
    total := total + d * weights[i];
  end loop;
  return total % 89 = 0;
end;
$$;

-- ------------------------------------------------------------------------------
-- Row-level backstop (runs on every insert/update of athlete_profiles):
--   * abn_verified is always derived server-side from the stored ABN,
--   * minors always hold a guardian_token; adults never do,
--   * guardian_signed_at can only be written by countersign_guardian_agreement().
-- ------------------------------------------------------------------------------
create or replace function public.athlete_profiles_guardian_abn_guard()
returns trigger
language plpgsql
as $$
begin
  new.abn_verified := public.is_valid_abn(new.abn);

  if new.is_minor then
    if new.guardian_token is null then
      new.guardian_token := gen_random_uuid();
    end if;
  else
    new.guardian_token := null;
  end if;

  if coalesce(current_setting('app.guardian_countersign', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      new.guardian_signed_at := null;
    else
      new.guardian_signed_at := old.guardian_signed_at;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_athlete_profiles_guardian_abn_guard on public.athlete_profiles;
create trigger tr_athlete_profiles_guardian_abn_guard
  before insert or update on public.athlete_profiles
  for each row execute procedure public.athlete_profiles_guardian_abn_guard();

-- Backfill existing rows (fires the guard trigger).
update public.athlete_profiles set id = id where abn is not null or is_minor = true;

-- ------------------------------------------------------------------------------
-- Public guardian access. Guardians are not authenticated users, so the token is the
-- credential and access is limited to two SECURITY DEFINER functions that expose only
-- the fields required to render and countersign the agreement.
-- ------------------------------------------------------------------------------
create or replace function public.get_guardian_agreement(p_token uuid)
returns table (
  athlete_name text,
  sport_discipline text,
  master_licence_mou_status text,
  guardian_signed_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  select ap.legal_full_name, ap.sport_discipline, ap.master_licence_mou_status, ap.guardian_signed_at
  from public.athlete_profiles ap
  where ap.guardian_token = p_token
    and ap.is_minor = true
  limit 1;
$$;

create or replace function public.countersign_guardian_agreement(
  p_token uuid,
  p_signed_at timestamp with time zone default null
)
returns table (
  master_licence_mou_status text,
  guardian_signed_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_row public.athlete_profiles%rowtype;
  v_signed_at timestamp with time zone;
  v_hash text;
begin
  select * into v_row
  from public.athlete_profiles
  where guardian_token = p_token and is_minor = true
  for update;

  if not found then
    raise exception 'Invalid or expired guardian link.' using errcode = 'P0002';
  end if;

  -- Idempotent: a countersigned agreement is never re-stamped.
  if v_row.guardian_signed_at is not null and v_row.master_licence_mou_status = 'signed' then
    return query select v_row.master_licence_mou_status, v_row.guardian_signed_at;
    return;
  end if;

  -- Honour the client timestamp only when it is plausible; otherwise use the server clock.
  if p_signed_at is null or abs(extract(epoch from (p_signed_at - now()))) > 300 then
    v_signed_at := now();
  else
    v_signed_at := p_signed_at;
  end if;

  v_hash := encode(
    sha256(convert_to('v1.0-2026|' || v_row.id::text || '|' || p_token::text || '|' || v_signed_at::text, 'utf8')),
    'hex'
  );

  perform set_config('app.guardian_countersign', 'on', true);

  update public.athlete_profiles
  set master_licence_mou_status = 'signed',
      guardian_signed_at = v_signed_at,
      master_licence_signed_at = coalesce(v_row.master_licence_signed_at, v_signed_at),
      master_licence_mou_hash = v_hash,
      guardian_consent_recorded = true
  where id = v_row.id;

  insert into public.compliance_audit_logs
    (entity_type, record_id, action, event_type, document_version, actor_id, change_payload)
  values (
    'athlete_profile', v_row.id, 'GUARDIAN_COUNTERSIGNED', 'GUARDIAN_COUNTERSIGNED', 'v1.0-2026', null,
    jsonb_build_object(
      'athlete_id', v_row.id,
      'guardian_email', v_row.guardian_email,
      'guardian_signed_at', v_signed_at,
      'master_licence_mou_hash', v_hash
    )
  );

  return query select 'signed'::text, v_signed_at;
end;
$$;

revoke all on function public.get_guardian_agreement(uuid) from public;
revoke all on function public.countersign_guardian_agreement(uuid, timestamp with time zone) from public;
grant execute on function public.get_guardian_agreement(uuid) to anon, authenticated;
grant execute on function public.countersign_guardian_agreement(uuid, timestamp with time zone) to anon, authenticated;
