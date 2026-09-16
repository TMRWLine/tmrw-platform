/*
# Add sport column to athletes and seed sample data

1. Schema Changes
- `athletes.sport` (text, nullable): the athlete's primary sport type (e.g. "Soccer", "Tennis"). Stored in profile_data today is inconsistent; promoting to a first-class column makes it queryable and type-safe for the outreach generator.
2. Data
- Seeds 4 sample athletes (with point geographies in the US) and 6 sample sponsors (with point geographies, merchant categories, budgets, target radii) so the dashboard and matching panel have real content on first load.
3. Security
- No policy changes. Existing anon/authenticated CRUD policies on `athletes` and `sponsors` already cover the new column.
4. Notes
- Uses `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` to populate the existing `location` geography column.
- Idempotent: only inserts when the table is empty (guarded by NOT EXISTS checks on a sentinel name).
*/

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS sport text;

-- Seed athletes (only if empty)
INSERT INTO athletes (name, sport, current_club, agreement_status, location, profile_data)
SELECT * FROM (VALUES
  ('Alex Rivera', 'Soccer', 'Seattle FC', 'no_agreement',
    ST_SetSRID(ST_MakePoint(-122.3321, 47.6062), 4326)::geography,
    '{"position":"Forward","age":24,"market_value_usd":2500000}'::jsonb),
  ('Jordan Lee', 'Tennis', 'Independent', 'active',
    ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326)::geography,
    '{"ranking":42,"age":29,"market_value_usd":1800000}'::jsonb),
  ('Sam Carter', 'Basketball', 'Portland Pioneers', 'pending',
    ST_SetSRID(ST_MakePoint(-122.6765, 45.5152), 4326)::geography,
    '{"position":"Guard","age":22,"market_value_usd":3200000}'::jsonb),
  ('Morgan Blake', 'Track & Field', 'Bay Track Club', 'no_agreement',
    ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
    '{"specialty":"Sprint","age":27,"market_value_usd":900000}'::jsonb)
) AS v(name, sport, current_club, agreement_status, location, profile_data)
WHERE NOT EXISTS (SELECT 1 FROM athletes);

-- Seed sponsors (only if empty)
INSERT INTO sponsors (business_name, merchant_category, budget_allocation, contact_email, target_radius_meters, location)
SELECT * FROM (VALUES
  ('Cascade Sports Gear', 'Sporting Goods', 75000, 'partners@cascade.example', 25000,
    ST_SetSRID(ST_MakePoint(-122.3340, 47.6080), 4326)::geography),
  ('Emerald City Brews', 'Food & Beverage', 120000, 'sponsorships@emeraldcitybrew.example', 30000,
    ST_SetSRID(ST_MakePoint(-122.3300, 47.6050), 4326)::geography),
  ('Pacific Wellness Co', 'Health & Wellness', 200000, 'partnerships@pacificwellness.example', 40000,
    ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography),
  ('LA Tennis Academy', 'Training & Coaching', 50000, 'info@latennis.example', 20000,
    ST_SetSRID(ST_MakePoint(-118.2500, 34.0500), 4326)::geography),
  ('Rose City Auto Group', 'Automotive', 300000, 'marketing@rosecityauto.example', 60000,
    ST_SetSRID(ST_MakePoint(-122.6760, 45.5160), 4326)::geography),
  ('Golden State Apparel', 'Apparel & Fashion', 150000, 'sponsorships@goldenstateapparel.example', 50000,
    ST_SetSRID(ST_MakePoint(-122.4200, 37.7750), 4326)::geography)
) AS v(business_name, merchant_category, budget_allocation, contact_email, target_radius_meters, location)
WHERE NOT EXISTS (SELECT 1 FROM sponsors);
