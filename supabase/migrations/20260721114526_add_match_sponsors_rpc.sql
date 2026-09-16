/*
# Add match_sponsors_for_athlete PostGIS RPC

1. New Functions
- `match_sponsors_for_athlete(athlete_id uuid)`: given an athlete's id, looks up the athlete's `location` geography point and returns all sponsors whose `location` is within that sponsor's own `target_radius_meters` of the athlete (ST_DWithin). Each returned row includes the sponsor columns plus `distance_meters` and `distance_km`, ordered closest first.
2. Security
- `SECURITY DEFINER` so the function can run the spatial join in one round trip; granted to `anon` and `authenticated` because the underlying tables already have anon SELECT policies and this function only reads.
3. Notes
- Idempotent: uses `CREATE OR REPLACE`.
- Returns empty set (not an error) if the athlete has no location.
*/

CREATE OR REPLACE FUNCTION match_sponsors_for_athlete(athlete_id uuid)
RETURNS TABLE (
  id uuid,
  business_name text,
  merchant_category text,
  budget_allocation numeric,
  contact_email text,
  target_radius_meters integer,
  location geography,
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
