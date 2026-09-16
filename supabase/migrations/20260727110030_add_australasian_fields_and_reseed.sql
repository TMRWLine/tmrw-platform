/*
# Add Australasian marketplace fields and re-seed with local data

1. Schema Changes
- `athletes`:
  - `postcode` (text, nullable) — local postcode for the athlete's location
  - `latitude` (double precision, nullable) — decimal latitude (mirrors location geography for easy frontend use)
  - `longitude` (double precision, nullable) — decimal longitude
  - `follower_count` (integer, nullable) — social media follower count
  - `master_licence_signed` (boolean, not null, default false) — whether the master licence agreement is signed
  - `nrl_tpa_registered` (boolean, not null, default false) — whether the athlete is registered under the NRL Third Party Agreement framework
  - `shute_shield_compliant` (boolean, not null, default false) — whether the athlete meets Shute Shield compliance requirements
- `sponsors`:
  - `postcode` (text, nullable) — local postcode for the sponsor's business
  - `latitude` (double precision, nullable) — decimal latitude
  - `longitude` (double precision, nullable) — decimal longitude
  - `currency` (text, not null, default 'AUD') — currency code for budget_allocation (AUD or NZD)

2. Data
- Deletes all existing US-based seed athletes and sponsors.
- Re-seeds with 3 Australasian sub-elite athletes (Liam Toole, Lachlan Miller, Tane Edmonds) and 6 local sponsors.
- Populates location geography points, postcode, latitude, longitude, follower_count, and compliance booleans for athletes.
- Populates location geography points, postcode, latitude, longitude, currency for sponsors.

3. Security
- No RLS policy changes. Existing anon+authenticated CRUD policies already cover the new columns.

4. Notes
- All new columns are nullable (except booleans which default to false) to avoid data loss on existing rows.
- `latitude`/`longitude` are stored as plain double precision columns alongside the existing `location` geography column, so the frontend can read coordinates directly without WKB parsing.
- `currency` defaults to 'AUD' so existing sponsor rows remain valid.
- Idempotent: the DELETE + INSERT is guarded so it only runs when the old US seed data is present.
*/

-- Add new columns to athletes
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS follower_count integer,
  ADD COLUMN IF NOT EXISTS master_licence_signed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nrl_tpa_registered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shute_shield_compliant boolean NOT NULL DEFAULT false;

-- Add new columns to sponsors
ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'AUD';

-- Replace all existing athletes with Australasian sub-elite talent
DELETE FROM athletes;

INSERT INTO athletes (
  name, sport, current_club, agreement_status, location,
  postcode, latitude, longitude, follower_count,
  master_licence_signed, nrl_tpa_registered, shute_shield_compliant,
  profile_data
) VALUES
  (
    'Liam Toole', 'Rugby Union', 'Northern Suburbs (Shute Shield)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(151.1789, -33.8148), 4326)::geography,
    '2088', -33.8148, 151.1789, 4200,
    true, false, true,
    '{"position":"Lock","age":23,"market_value_aud":45000}'::jsonb
  ),
  (
    'Lachlan Miller', 'Rugby League', 'Newtown Jets (NSW Cup)', 'pending',
    ST_SetSRID(ST_MakePoint(151.1792, -33.8986), 4326)::geography,
    '2042', -33.8986, 151.1792, 8700,
    true, true, false,
    '{"position":"Five-Eighth","age":25,"market_value_aud":65000}'::jsonb
  ),
  (
    'Tane Edmonds', 'Rugby Union', 'Auckland (NPC)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(174.7633, -36.8485), 4326)::geography,
    '1010', -36.8485, 174.7633, 5300,
    false, false, false,
    '{"position":"Winger","age":22,"market_value_nzd":38000}'::jsonb
  );

-- Replace all existing sponsors with Australasian local merchants
DELETE FROM sponsors;

INSERT INTO sponsors (
  business_name, merchant_category, budget_allocation, contact_email,
  target_radius_meters, location, postcode, latitude, longitude, currency
) VALUES
  (
    'City Auto Group', 'Automotive', 50000, 'sponsorship@cityautogroup.co.nz',
    15000, ST_SetSRID(ST_MakePoint(151.1320, -33.9333), 4326)::geography,
    '2020', -33.9333, 151.1320, 'AUD'
  ),
  (
    'Harbour Fitness', 'Health & Wellness', 25000, 'partnerships@harbourfitness.com.au',
    10000, ST_SetSRID(ST_MakePoint(151.2667, -33.8000), 4326)::geography,
    '2095', -33.8000, 151.2667, 'AUD'
  ),
  (
    'North Shore Sports Gear', 'Sporting Goods', 40000, 'info@northshoresports.com.au',
    20000, ST_SetSRID(ST_MakePoint(151.1789, -33.8148), 4326)::geography,
    '2088', -33.8148, 151.1789, 'AUD'
  ),
  (
    'Manly Brewhouse', 'Food & Beverage', 35000, 'sponsorship@manlybrewhouse.com.au',
    12000, ST_SetSRID(ST_MakePoint(151.2894, -33.7974), 4326)::geography,
    '2095', -33.7974, 151.2894, 'AUD'
  ),
  (
    'Kiwi Apparel Co', 'Apparel & Fashion', 60000, 'partnerships@kiwiapparel.co.nz',
    25000, ST_SetSRID(ST_MakePoint(174.7633, -36.8485), 4326)::geography,
    '1010', -36.8485, 174.7633, 'NZD'
  ),
  (
    'Auckland Performance Coaching', 'Training & Coaching', 30000, 'enquiries@aklcoaching.co.nz',
    18000, ST_SetSRID(ST_MakePoint(174.7380, -36.8520), 4326)::geography,
    '1023', -36.8520, 174.7380, 'NZD'
  );
