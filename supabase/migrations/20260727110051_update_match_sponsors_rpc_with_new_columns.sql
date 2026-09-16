/*
# Update match_sponsors_for_athlete RPC to return new columns

1. Modified Functions
- `match_sponsors_for_athlete(athlete_id uuid)`: dropped and recreated to return the new `postcode`, `latitude`, `longitude`, and `currency` columns from the sponsors table.

2. Security
- No policy changes. `SECURITY DEFINER` with anon/authenticated grants retained.

3. Notes
- Idempotent: uses DROP + CREATE OR REPLACE.
- Returns empty set if the athlete has no location.
*/

DROP FUNCTION IF EXISTS match_sponsors_for_athlete(uuid);

CREATE OR REPLACE FUNCTION match_sponsors_for_athlete(athlete_id uuid)
RETURNS TABLE (
  id uuid,
  business_name text,
  merchant_category text,
  budget_allocation numeric,
  contact_email text,
  target_radius_meters integer,
  location geography,
  postcode text,
  latitude double precision,
  longitude double precision,
  currency text,
  created_at timestamptz,
  updated_at timestamptz,
  distance_meters double precision,
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  athlete_loc geography;
BEGIN
  SELECT a.location INTO athlete_loc
  FROM athletes a
  WHERE a.id = athlete_id;

  IF athlete_loc IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.business_name,
    s.merchant_category,
    s.budget_allocation,
    s.contact_email,
    s.target_radius_meters,
    s.location,
    s.postcode,
    s.latitude,
    s.longitude,
    s.currency,
    s.created_at,
    s.updated_at,
    ST_Distance(s.location, athlete_loc)::double precision AS distance_meters,
    (ST_Distance(s.location, athlete_loc) / 1000.0)::double precision AS distance_km
  FROM sponsors s
  WHERE ST_DWithin(s.location, athlete_loc, s.target_radius_meters)
  ORDER BY distance_meters ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION match_sponsors_for_athlete(uuid) TO anon, authenticated;
