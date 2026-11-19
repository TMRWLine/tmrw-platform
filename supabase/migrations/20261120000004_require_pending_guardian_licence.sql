create or replace function public.countersign_guardian_mou(lookup_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.athlete_profiles%rowtype;
  v_status text;
  v_signed_at timestamp with time zone;
begin
  select * into v_profile
  from public.athlete_profiles
  where guardian_token = lookup_token and is_minor = true
  for update;

  if not found then
    raise exception 'Invalid or expired guardian link.' using errcode = 'P0002';
  end if;

  if v_profile.master_licence_mou_status = 'signed' and v_profile.guardian_signed_at is not null then
    return jsonb_build_object('mou_status', 'signed', 'guardian_signed_at', v_profile.guardian_signed_at);
  end if;

  if v_profile.master_licence_mou_status is distinct from 'pending_guardian'
     or v_profile.master_licence_signed_at is null then
    raise exception 'No separately accepted licence is awaiting guardian signature.';
  end if;

  select r.master_licence_mou_status, r.guardian_signed_at
    into v_status, v_signed_at
  from public.countersign_guardian_agreement(lookup_token, null) r;

  return jsonb_build_object('mou_status', v_status, 'guardian_signed_at', v_signed_at);
end;
$$;
