/*
# get_athletes_nearby RPC

Returns athlete rows whose PostGIS `location` falls within `radius_km` of
the given WGS84 point (ST_DWithin on geography).
*/

CREATE OR REPLACE FUNCTION get_athletes_nearby(
  lat double precision,
  lng double precision,
  radius_km double precision
)
RETURNS SETOF athletes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.*
  FROM athletes a
  WHERE a.location IS NOT NULL
    AND ST_DWithin(
      a.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_km * 1000.0
    );
$$;

GRANT EXECUTE ON FUNCTION get_athletes_nearby(double precision, double precision, double precision)
  TO anon, authenticated;
