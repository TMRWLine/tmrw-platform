BEGIN;

-- Public sporting identity only; commercial clearance remains pending.
WITH intake (id, name, sport, current_club, league, verification_source_url) AS (
  VALUES
    ('973302d2-bc62-47ce-9311-c1052fe13a01'::uuid, 'Onitoni Large', 'Rugby League', 'Manly-Warringah Sea Eagles', 'NSW Cup',
     'https://www.nswrl.com.au/players/nsw-cup/manly-warringah-sea-eagles/onitoni-large/'),
    ('973302d2-bc62-47ce-9311-c1052fe13a02'::uuid, 'Luke Aiken', 'Rugby Union', 'Western Force', 'Super Rugby Pacific Academy',
     'https://www.rugby.com.au/news/emerging-academy-halfback-aiken-elevated-force-squad-2026824'),
    ('973302d2-bc62-47ce-9311-c1052fe13a03'::uuid, 'Erana Ngarimu', 'Netball', 'Pulse', 'ANZ Premiership',
     'https://anzpremiership.co.nz/premiership/teams/pulse/erana-ngarimu.html')
)
INSERT INTO public.athletes (
  id, name, sport, current_club, agreement_status,
  postcode, location, latitude, longitude, follower_count,
  master_licence_signed, nrl_tpa_registered, shute_shield_compliant, profile_data
)
SELECT
  id, name, sport, current_club, 'no_agreement',
  NULL, NULL, NULL, NULL, NULL,
  false, false, false,
  jsonb_build_object(
    'intake_status', 'scouted',
    'intake_date', '2026-11-19',
    'status', 'PENDING VERIFICATION',
    'league', league,
    'verification_source_url', verification_source_url,
    'legal_full_name', NULL,
    'radiusKm', NULL,
    'image', NULL,
    'market_value_aud', NULL,
    'tier', NULL,
    'instagram_handle', NULL,
    'engagement_rate', NULL,
    'sanctioned', NULL,
    'tpa_compliant', NULL,
    'document_verified', NULL,
    'branding_categories', NULL
  )
FROM intake
WHERE NOT EXISTS (
  SELECT 1 FROM public.athletes existing
  WHERE lower(trim(existing.name)) = lower(trim(intake.name))
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
