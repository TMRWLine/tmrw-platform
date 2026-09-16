/*
# Add spatial columns and index for sponsor matching

1. Extensions
- Enable `postgis` extension (provides geometry/geography types, GiST indexing, and ST_DWithin/ST_MakePoint functions).

2. Modified Tables
- `athletes`
  - Add `location geography(Point, 4326)` — athlete's spatial coordinate (WGS84 lon/lat). Nullable so existing rows remain valid.
- `sponsors`
  - Add `target_radius_meters integer NOT NULL DEFAULT 1000` — catchment radius in meters around the sponsor's location.
  - Add `location geography(Point, 4326)` — sponsor's spatial coordinate (WGS84 lon/lat). Nullable so existing rows remain valid.

3. Indexes
- `idx_sponsors_coords` — GiST index on `sponsors.location` to accelerate ST_DWithin containment queries against an athlete point. This is the spatial index the /api/match-sponsors endpoint relies on.
- `idx_athletes_location` — GiST index on `athletes.location` for symmetry and future spatial lookups.

4. Security
- No RLS policy changes. Existing anon+authenticated CRUD policies on athletes and sponsors continue to apply to the new columns.

5. Notes
- Geography (Point, 4326) stores lon/lat on a curved surface; ST_DWithin returns meters natively, no manual projection needed.
- Both new columns are nullable to avoid data loss on existing rows. The match endpoint treats a missing athlete location as a 400 error.
- `target_radius_meters` defaults to 1000m so sponsors without an explicit radius still match athletes within 1km.
*/

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS target_radius_meters integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

CREATE INDEX IF NOT EXISTS idx_sponsors_coords ON sponsors USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_athletes_location ON athletes USING GIST (location);
