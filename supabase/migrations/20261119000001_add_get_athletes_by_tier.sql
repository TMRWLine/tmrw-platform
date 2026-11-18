/*
# get_athletes_by_tier RPC

Returns athlete rows whose PostGIS `location` falls inside a spatial
catchment band around the given WGS84 point. Bands match SPATIAL_TIERS in
src/types.ts: '01' = 0-5 km, '02' = 5-25 km, '03' = more than 25 km.
*/

CREATE OR REPLACE FUNCTION get_athletes_by_tier(
  lat double precision,
  lng double precision,
  tier_code text
)
RETURNS SETOF athletes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH origin AS (
    SELECT ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography AS point
  )
  SELECT a.*
  FROM athletes a, origin o
  WHERE a.location IS NOT NULL
    AND CASE tier_code
      WHEN '01' THEN ST_DWithin(a.location, o.point, 5000.0)
      WHEN '02' THEN ST_Distance(a.location, o.point) >= 5000.0
                 AND ST_DWithin(a.location, o.point, 25000.0)
      WHEN '03' THEN ST_Distance(a.location, o.point) >= 25000.0
      ELSE false
    END
  ORDER BY ST_Distance(a.location, o.point);
$$;

GRANT EXECUTE ON FUNCTION get_athletes_by_tier(double precision, double precision, text)
  TO anon, authenticated;
