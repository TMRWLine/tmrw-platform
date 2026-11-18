BEGIN;

ALTER TABLE public.athlete_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.athlete_leads FROM PUBLIC, anon, authenticated;

WITH intake (full_name, sport, league, club, verification_source_url, age_band, age_evidence) AS (
  VALUES
    ('Luca Slade', 'Australian Rules Football', 'SANFL', 'Sturt',
     'https://sanfl.com.au/league/news/luca-slade-wins-2026-powerade-breakthrough-player/',
     '18-23', 'Official SANFL report dated 21 September 2026 identifies him as 20.'),
    ('Zakaria Taibi', 'Rugby League', 'Hostplus Cup', 'Norths Devils',
     'https://www.qrl.com.au/players/qrl-premiership/norths-devils/zak-taibi/',
     '24-29', 'Official QRL profile gives date of birth 1 April 1998; age 28 on intake date. Profile URL uses Zak Taibi.'),
    ('Sophia Lafaiali''i', 'Netball', 'ANZ Premiership', 'Mystics',
     'https://anzpremiership.co.nz/premiership/teams/mystics/sophia-lafaiali-i.html',
     '18-23', 'Official ANZ Premiership profile gives date of birth 27 May 2005; age 21 on intake date.')
)
INSERT INTO public.athlete_leads (
  full_name, sport, league, club, verification_source_url, where_found, is_minor, athlete_details
)
SELECT full_name, sport, league, club, verification_source_url,
  'Daily scout 2026-11-19 Australia/Sydney. Official public sporting profile or league report fetched and verified: '
    || verification_source_url || ' ' || age_evidence
    || ' Adult based on public evidence; claimant date of birth and guardian consent rules still apply. Private research only; no contact or publication authorised.',
  false,
  jsonb_build_object(
    'intake_date', '2026-11-19',
    'intake_timezone', 'Australia/Sydney',
    'age_band', age_band,
    'instagram_handle', NULL,
    'follower_count', NULL,
    'engagement_rate', NULL,
    'outreach_status', 'draft_only_pending_verified_sender_and_origin'
  )
FROM intake
WHERE NOT EXISTS (
  SELECT 1 FROM public.athlete_leads existing
  WHERE lower(trim(existing.full_name)) = lower(trim(intake.full_name))
     OR existing.verification_source_url = intake.verification_source_url
     OR (intake.full_name = 'Zakaria Taibi' AND lower(trim(existing.full_name)) = 'zak taibi')
)
AND NOT EXISTS (
  SELECT 1 FROM public.athletes existing
  WHERE lower(trim(existing.name)) = lower(trim(intake.full_name))
     OR existing.profile_data->>'verification_source_url' = intake.verification_source_url
     OR (intake.full_name = 'Zakaria Taibi' AND lower(trim(existing.name)) = 'zak taibi')
);

COMMIT;
