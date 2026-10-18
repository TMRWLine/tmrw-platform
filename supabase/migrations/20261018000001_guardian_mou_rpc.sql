-- ==============================================================================
-- TMRW PLATFORM: GUARDIAN MOU RPC SURFACE
-- Replaces the table-returning get_guardian_agreement(p_token) with a json-returning
-- version keyed on `lookup_token`, and adds countersign_guardian_mou(lookup_token).
-- The token is the credential; only the fields needed to render/sign are exposed.
-- ==============================================================================

drop function if exists public.get_guardian_agreement(uuid);

create or replace function public.get_guardian_agreement(lookup_token uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'athlete_name', ap.legal_full_name,
    'sport', ap.sport_discipline,
    'club', ap.current_club,
    'mou_status', ap.master_licence_mou_status,
    'guardian_signed_at', ap.guardian_signed_at,
    'mou_text', E'Master Licence MOU (v1.0-2026) - 2-year non-exclusive.\n'
      || E'Term: 2 years from the date of countersignature.\n'
      || E'Non-exclusive: the athlete grants tmrw/. a licence to commercialise their Name, Image and Likeness (NIL) across digital content, local apparel drops and platform-brokered retail partnerships.\n'
      || E'Category exclusivity applies only during active, paid campaign windows.\n'
      || E'All commercial engagements remain subject to National Sporting Organisation (NSO) regulations and amateur pathway eligibility.'
  )
  from public.athlete_profiles ap
  where ap.guardian_token = lookup_token
    and ap.is_minor = true
  limit 1;
$$;

-- Thin wrapper around the existing countersign logic (stamping, hash, audit log).
create or replace function public.countersign_guardian_mou(lookup_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_signed_at timestamp with time zone;
begin
  select r.master_licence_mou_status, r.guardian_signed_at
    into v_status, v_signed_at
  from public.countersign_guardian_agreement(lookup_token, null) r;

  return jsonb_build_object(
    'mou_status', v_status,
    'guardian_signed_at', v_signed_at
  );
end;
$$;

revoke all on function public.get_guardian_agreement(uuid) from public;
revoke all on function public.countersign_guardian_mou(uuid) from public;
revoke all on function public.countersign_guardian_agreement(uuid, timestamp with time zone) from public, anon, authenticated;
grant execute on function public.get_guardian_agreement(uuid) to anon, authenticated;
grant execute on function public.countersign_guardian_mou(uuid) to anon, authenticated;
