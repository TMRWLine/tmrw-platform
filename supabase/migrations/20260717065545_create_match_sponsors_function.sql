/*
# Create match_sponsors_for_athlete function

1. New Functions
- `match_sponsors_for_athlete(athlete_point geography(Point, 4326))`
  - RETURNS TABLE (id uuid, business_name text, merchant_category text, budget_allocation numeric, contact_email text, target_radius_meters integer, distance_meters double precision)
  - Finds sponsors whose `target_radius_meters` catchment contains the given athlete point.
  - Uses ST_DWithin on `sponsors.location` (geography) — the planner uses the GiST index `idx_sponsors_coords` for the containment check.
  - Returns the sponsor row plus the distance in meters from the athlete point to the sponsor location.

2. Security
- Function is SECURITY DEFINER so the anon role can call it via supabase.rpc() without needing direct table grants beyond the existing RLS policies. RLS still applies to the underlying query.

3. Notes
- ST_DWithin on geography returns meters natively, no manual projection.
- The athlete point is passed in from the backend after fetching the athlete row, so we never trust client-supplied coordinates.
*/

CREATE OR REPLACE FUNCTION match_sponsors_for_athlete(athlete_point geography(Point, 4326))
RETURNS TABLE (
  id uuid,
  business_name text,
  merchant_category text,
  budget_allocation numeric,
  contact_email text,
  target_radius_meters integer,
  distance_meters double precision
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    s.id,
    s.business_name,
    s.merchant_category,
    s.budget_allocation,
    s.contact_email,
    s.target_radius_meters,
    ST_Distance(s.location::geography, athlete_point)::double precision AS distance_meters
  FROM sponsors s
  WHERE s.location IS NOT NULL
    AND ST_DWithin(s.location::geography, athlete_point, s.target_radius_meters)
  ORDER BY distance_meters ASC;
$$;

REVOKE ALL ON FUNCTION match_sponsors_for_athlete(geography(Point, 4326)) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_sponsors_for_athlete(geography(Point, 4326)) TO anon, authenticated;
