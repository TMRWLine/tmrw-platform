CREATE TABLE public.whitelisting_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id text NOT NULL UNIQUE,
  athlete_id text NOT NULL,
  athlete_name text NOT NULL,
  flight_tier_id text NOT NULL,
  postcode text NOT NULL CHECK (postcode ~ '^[0-9]{4}$'),
  radius_km smallint NOT NULL CHECK (radius_km IN (5, 15, 50)),
  tiktok_spark_code text NOT NULL,
  meta_partnership_token text NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > issued_at)
);

COMMENT ON COLUMN public.whitelisting_grants.tiktok_spark_code IS 'Internal grant reference, not a TikTok-issued Spark Ads code.';
COMMENT ON COLUMN public.whitelisting_grants.meta_partnership_token IS 'Internal grant reference, not a Meta-issued authorisation token.';

ALTER TABLE public.whitelisting_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whitelisting_grants FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT, SELECT ON TABLE public.whitelisting_grants TO service_role;
