/*
# Create get_athletes_in_radius stored procedure

1. New Functions
- `get_athletes_in_radius(origin_postcode text, radius_km double precision)`
  - Resolves the centroid of `origin_postcode` from every athlete and sponsor row that carries a coordinate for that postcode.
  - Returns each athlete within `radius_km` of that centroid, nearest first, with the distance in kilometres and the compass bearing in degrees (0 is north, clockwise).
  - Returns an empty set when the postcode is unknown or the radius is not positive.

2. Security
- `SECURITY INVOKER` so existing row level security on `athletes` and `sponsors` continues to apply.
- Execute is granted to `anon` and `authenticated`.

3. Notes
- Uses the existing GiST index `idx_athletes_location` through `ST_DWithin` on geography values.
- Idempotent: uses DROP + CREATE OR REPLACE.
- The radius is capped at 100 km so a client cannot request an unbounded scan.
*/

DROP FUNCTION IF EXISTS get_athletes_in_radius(text, double precision);

CREATE OR REPLACE FUNCTION get_athletes_in_radius(
  origin_postcode text,
  radius_km double precision
)
RETURNS TABLE (
  id uuid,
  name text,
  sport text,
  current_club text,
  agreement_status text,
  postcode text,
  latitude double precision,
  longitude double precision,
  follower_count integer,
  master_licence_signed boolean,
  nrl_tpa_registered boolean,
  shute_shield_compliant boolean,
  distance_km double precision,
  bearing_degrees double precision
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  origin_point geography;
  capped_radius_m double precision;
BEGIN
  IF origin_postcode IS NULL OR radius_km IS NULL OR radius_km <= 0 THEN
    RETURN;
  END IF;

  capped_radius_m := LEAST(radius_km, 100) * 1000.0;

  SELECT ST_SetSRID(ST_MakePoint(AVG(p.lng), AVG(p.lat)), 4326)::geography
  INTO origin_point
  FROM (
    SELECT a.longitude AS lng, a.latitude AS lat
    FROM athletes a
    WHERE a.postcode = origin_postcode
      AND a.latitude IS NOT NULL
      AND a.longitude IS NOT NULL
    UNION ALL
    SELECT s.longitude AS lng, s.latitude AS lat
    FROM sponsors s
    WHERE s.postcode = origin_postcode
      AND s.latitude IS NOT NULL
      AND s.longitude IS NOT NULL
  ) AS p;

  IF origin_point IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.sport,
    a.current_club,
    a.agreement_status,
    a.postcode,
    a.latitude,
    a.longitude,
    a.follower_count,
    a.master_licence_signed,
    a.nrl_tpa_registered,
    a.shute_shield_compliant,
    (ST_Distance(a.location, origin_point) / 1000.0)::double precision AS distance_km,
    COALESCE(degrees(ST_Azimuth(origin_point::geometry, a.location::geometry)), 0)::double precision AS bearing_degrees
  FROM athletes a
  WHERE a.location IS NOT NULL
    AND ST_DWithin(a.location, origin_point, capped_radius_m)
  ORDER BY distance_km ASC, a.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_athletes_in_radius(text, double precision) TO anon, authenticated;
