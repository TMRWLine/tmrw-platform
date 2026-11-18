BEGIN;

CREATE TABLE public.athlete_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  sport text,
  league text,
  club text,
  verification_source_url text,
  where_found text,
  region_postcode_prefix text,
  claim_token uuid UNIQUE DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'private' CHECK (status IN ('private', 'previewed', 'claimed', 'consented', 'pending_guardian', 'unsubscribed')),
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  data_consent_at timestamptz,
  public_consent_at timestamptz,
  contact_consent_at timestamptz,
  is_minor boolean,
  date_of_birth date,
  guardian_email text,
  guardian_token uuid UNIQUE,
  guardian_consent_at timestamptz,
  public_fields text[] NOT NULL DEFAULT '{}',
  athlete_details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.athlete_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.athlete_leads FROM PUBLIC, anon, authenticated;

INSERT INTO public.athlete_leads (id, full_name, sport, league, club, verification_source_url, where_found, region_postcode_prefix)
SELECT id, name, sport, profile_data->>'league', current_club,
  profile_data->>'verification_source_url', 'Official league public profile or match report: ' || (profile_data->>'verification_source_url'),
  CASE id::text
    WHEN '973302d2-bc62-47ce-9311-c1052fe13a01' THEN '2'
    WHEN '973302d2-bc62-47ce-9311-c1052fe13a02' THEN '6'
    WHEN '973302d2-bc62-47ce-9311-c1052fe13a04' THEN '3'
    WHEN '973302d2-bc62-47ce-9311-c1052fe13a05' THEN '5'
    WHEN '973302d2-bc62-47ce-9311-c1052fe13a06' THEN '2'
    ELSE NULL END
FROM public.athletes WHERE profile_data->>'intake_status' = 'scouted';
DELETE FROM public.athletes WHERE profile_data->>'intake_status' = 'scouted';

CREATE FUNCTION public.preview_athlete_claim(p_token uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead public.athlete_leads; nearby jsonb;
BEGIN
  SELECT * INTO lead FROM public.athlete_leads
    WHERE claim_token = p_token AND status <> 'unsubscribed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim link is unavailable'; END IF;
  IF lead.status = 'private' THEN
    UPDATE public.athlete_leads SET status = 'previewed' WHERE id = lead.id;
  END IF;
  SELECT coalesce(jsonb_agg(s), '[]'::jsonb) INTO nearby FROM (
    SELECT business_name, merchant_category, postcode FROM public.sponsors
    WHERE lead.region_postcode_prefix IS NOT NULL
      AND postcode LIKE lead.region_postcode_prefix || '%'
    ORDER BY business_name LIMIT 3
  ) s;
  RETURN jsonb_build_object('full_name', lead.full_name, 'sport', lead.sport,
    'league', lead.league, 'club', lead.club, 'verification_source_url', lead.verification_source_url,
    'where_found', lead.where_found, 'status', lead.status, 'sponsors', nearby);
END;
$$;

CREATE FUNCTION public.publish_consented_lead(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead public.athlete_leads; visible jsonb := '{}'; field text;
BEGIN
  SELECT * INTO STRICT lead FROM public.athlete_leads WHERE id = p_id FOR UPDATE;
  IF lead.data_consent_at IS NULL OR lead.public_consent_at IS NULL OR lead.contact_consent_at IS NULL
    OR (lead.is_minor AND lead.guardian_consent_at IS NULL) THEN
    RAISE EXCEPTION 'Consent is incomplete';
  END IF;
  FOREACH field IN ARRAY lead.public_fields LOOP
    IF field = ANY (ARRAY['full_name', 'sport', 'league', 'club', 'bio', 'instagram']) THEN
      visible := visible || jsonb_build_object(field, CASE field
        WHEN 'full_name' THEN lead.full_name WHEN 'sport' THEN lead.sport
        WHEN 'league' THEN lead.league WHEN 'club' THEN lead.club
        ELSE lead.athlete_details->>field END);
    END IF;
  END LOOP;
  INSERT INTO public.athletes (id, name, sport, current_club, agreement_status, master_licence_signed, profile_data)
    VALUES (lead.id, coalesce(visible->>'full_name', 'Athlete'), visible->>'sport',
      visible->>'club', 'no_agreement', false, visible || '{"intake_status":"consented"}'::jsonb);
  UPDATE public.athlete_leads SET status = 'consented', guardian_token = NULL WHERE id = lead.id;
END;
$$;

CREATE FUNCTION public.claim_athlete_profile(
  p_token uuid, p_details jsonb, p_public_fields text[], p_dob date,
  p_under_18 boolean, p_guardian_email text,
  p_data_consent boolean, p_public_consent boolean, p_contact_consent boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead public.athlete_leads; minor boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to claim'; END IF;
  IF NOT (coalesce(p_data_consent, false) AND coalesce(p_public_consent, false) AND coalesce(p_contact_consent, false)) THEN
    RAISE EXCEPTION 'All three consents are required';
  END IF;
  IF p_dob IS NULL OR p_dob > current_date OR p_dob < current_date - interval '120 years' THEN
    RAISE EXCEPTION 'Valid date of birth required';
  END IF;
  IF jsonb_typeof(p_details) <> 'object' OR length(p_details::text) > 10000 THEN RAISE EXCEPTION 'Invalid profile details'; END IF;
  IF NOT coalesce(p_public_fields <@ ARRAY['full_name', 'sport', 'league', 'club', 'bio', 'instagram'], false) THEN
    RAISE EXCEPTION 'Unknown public field';
  END IF;
  minor := coalesce(p_under_18, false) OR p_dob > (current_date - interval '18 years')::date;
  IF minor AND (p_guardian_email IS NULL OR p_guardian_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN
    RAISE EXCEPTION 'Guardian email required';
  END IF;
  SELECT * INTO lead FROM public.athlete_leads WHERE claim_token = p_token FOR UPDATE;
  IF NOT FOUND OR lead.status NOT IN ('private', 'previewed') THEN RAISE EXCEPTION 'Claim link is unavailable or already claimed'; END IF;
  UPDATE public.athlete_leads SET
    full_name = coalesce(nullif(trim(p_details->>'full_name'), ''), full_name),
    sport = coalesce(nullif(trim(p_details->>'sport'), ''), sport),
    league = coalesce(nullif(trim(p_details->>'league'), ''), league),
    club = coalesce(nullif(trim(p_details->>'club'), ''), club),
    athlete_details = jsonb_build_object('bio', p_details->>'bio', 'instagram', p_details->>'instagram'),
    claimed_by = auth.uid(), claimed_at = now(), data_consent_at = now(), public_consent_at = now(), contact_consent_at = now(),
    public_fields = p_public_fields, date_of_birth = p_dob, is_minor = minor,
    guardian_email = CASE WHEN minor THEN trim(p_guardian_email) END,
    guardian_token = CASE WHEN minor THEN gen_random_uuid() END,
    status = CASE WHEN minor THEN 'pending_guardian' ELSE 'claimed' END
  WHERE id = lead.id;
  IF NOT minor THEN PERFORM public.publish_consented_lead(lead.id); END IF;
  RETURN jsonb_build_object('status', CASE WHEN minor THEN 'pending_guardian' ELSE 'consented' END);
END;
$$;

CREATE FUNCTION public.preview_claim_guardian(p_token uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead public.athlete_leads;
BEGIN
  SELECT * INTO lead FROM public.athlete_leads WHERE guardian_token = p_token AND status = 'pending_guardian';
  IF NOT FOUND THEN RAISE EXCEPTION 'Guardian link is unavailable'; END IF;
  RETURN jsonb_build_object('full_name', lead.full_name, 'sport', lead.sport, 'club', lead.club, 'public_fields', lead.public_fields);
END;
$$;

CREATE FUNCTION public.consent_claim_guardian(p_token uuid, p_consent boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead public.athlete_leads;
BEGIN
  IF p_consent IS DISTINCT FROM true THEN RAISE EXCEPTION 'Guardian consent required'; END IF;
  SELECT * INTO lead FROM public.athlete_leads WHERE guardian_token = p_token AND status = 'pending_guardian' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guardian link is unavailable'; END IF;
  UPDATE public.athlete_leads SET guardian_consent_at = now() WHERE id = lead.id;
  PERFORM public.publish_consented_lead(lead.id);
  RETURN '{"status":"consented"}'::jsonb;
END;
$$;

CREATE FUNCTION public.decline_athlete_claim(p_token uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead public.athlete_leads;
BEGIN
  SELECT * INTO lead FROM public.athlete_leads WHERE claim_token = p_token AND status <> 'unsubscribed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim link is unavailable'; END IF;
  IF lead.status = 'consented' THEN DELETE FROM public.athletes WHERE id = lead.id; END IF;
  DELETE FROM public.athlete_leads WHERE id = lead.id;
END;
$$;

CREATE FUNCTION public.unsubscribe_athlete_claim(p_token uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead public.athlete_leads;
BEGIN
  SELECT * INTO lead FROM public.athlete_leads WHERE claim_token = p_token AND status <> 'unsubscribed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim link is unavailable'; END IF;
  IF lead.status = 'consented' THEN DELETE FROM public.athletes WHERE id = lead.id; END IF;
  DELETE FROM public.athlete_leads WHERE id = lead.id;
  INSERT INTO public.athlete_leads (id, status, claim_token)
    VALUES (gen_random_uuid(), 'unsubscribed', p_token);
END;
$$;

REVOKE ALL ON FUNCTION public.preview_athlete_claim(uuid), public.publish_consented_lead(uuid),
  public.claim_athlete_profile(uuid,jsonb,text[],date,boolean,text,boolean,boolean,boolean),
  public.preview_claim_guardian(uuid), public.consent_claim_guardian(uuid,boolean),
  public.decline_athlete_claim(uuid), public.unsubscribe_athlete_claim(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_athlete_claim(uuid), public.preview_claim_guardian(uuid),
  public.consent_claim_guardian(uuid,boolean), public.decline_athlete_claim(uuid), public.unsubscribe_athlete_claim(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_athlete_profile(uuid,jsonb,text[],date,boolean,text,boolean,boolean,boolean) TO authenticated;
COMMIT;
