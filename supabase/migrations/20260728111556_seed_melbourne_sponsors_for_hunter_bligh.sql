/*
# Seed 5 local Melbourne sponsors for Hunter Bligh (Basketball)

1. Data Changes
- Inserts 5 new sponsors located within 2-15 km of Melbourne CBD (postcode 3000),
  matching Hunter Bligh's catchment area:
  - Fitzroy Hoops & Performance: Gym / Fitness, Postcode 3065 (Fitzroy, ~2.5 km), $35,000 AUD, 2500 m radius
  - Southbank Sports Recovery: Allied Health / Physio, Postcode 3006 (Southbank, ~1.2 km), $20,000 AUD, 1200 m radius
  - Richmond Auto Group: Automotive Dealership, Postcode 3121 (Richmond, ~3.8 km), $50,000 AUD, 3800 m radius
  - St Kilda Beach Nutrition: Health Foods / Cafe, Postcode 3182 (St Kilda, ~6.1 km), $15,000 AUD, 6100 m radius
  - Melbourne City Hoops Apparel: Sporting Goods, Postcode 3000 (Melbourne CBD, ~0.8 km), $40,000 AUD, 800 m radius
- All sponsors use AUD currency.
- Coordinates are approximate suburb centroids around Melbourne CBD.

2. Schema Changes
- No new columns or tables.

3. Security
- No RLS policy changes. Existing anon+authenticated CRUD policies cover the new rows.

4. Notes
- Idempotent: each insert is guarded by a NOT EXISTS check on business_name so re-running
  the migration does not create duplicates.
- Hunter Bligh is already seeded at postcode 3000, latitude -37.8136, longitude 144.9631
  (from the prior reseed migration), so no athlete changes are needed.
*/

INSERT INTO sponsors (
  business_name, merchant_category, budget_allocation, contact_email,
  target_radius_meters, location, postcode, latitude, longitude, currency
)
SELECT
  'Fitzroy Hoops & Performance', 'Gym / Fitness', 35000, 'partnerships@fitzroyhoops.com.au',
  2500, ST_SetSRID(ST_MakePoint(144.9784, -37.7980), 4326)::geography,
  '3065', -37.7980, 144.9784, 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM sponsors WHERE business_name = 'Fitzroy Hoops & Performance');

INSERT INTO sponsors (
  business_name, merchant_category, budget_allocation, contact_email,
  target_radius_meters, location, postcode, latitude, longitude, currency
)
SELECT
  'Southbank Sports Recovery', 'Allied Health / Physio', 20000, 'info@southbankrecovery.com.au',
  1200, ST_SetSRID(ST_MakePoint(144.9650, -37.8210), 4326)::geography,
  '3006', -37.8210, 144.9650, 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM sponsors WHERE business_name = 'Southbank Sports Recovery');

INSERT INTO sponsors (
  business_name, merchant_category, budget_allocation, contact_email,
  target_radius_meters, location, postcode, latitude, longitude, currency
)
SELECT
  'Richmond Auto Group', 'Automotive Dealership', 50000, 'sponsorship@richmondauto.com.au',
  3800, ST_SetSRID(ST_MakePoint(145.0010, -37.8230), 4326)::geography,
  '3121', -37.8230, 145.0010, 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM sponsors WHERE business_name = 'Richmond Auto Group');

INSERT INTO sponsors (
  business_name, merchant_category, budget_allocation, contact_email,
  target_radius_meters, location, postcode, latitude, longitude, currency
)
SELECT
  'St Kilda Beach Nutrition', 'Health Foods / Cafe', 15000, 'hello@stkildanutrition.com.au',
  6100, ST_SetSRID(ST_MakePoint(144.9730, -37.8670), 4326)::geography,
  '3182', -37.8670, 144.9730, 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM sponsors WHERE business_name = 'St Kilda Beach Nutrition');

INSERT INTO sponsors (
  business_name, merchant_category, budget_allocation, contact_email,
  target_radius_meters, location, postcode, latitude, longitude, currency
)
SELECT
  'Melbourne City Hoops Apparel', 'Sporting Goods', 40000, 'team@cityhoopsapparel.com.au',
  800, ST_SetSRID(ST_MakePoint(144.9610, -37.8110), 4326)::geography,
  '3000', -37.8110, 144.9610, 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM sponsors WHERE business_name = 'Melbourne City Hoops Apparel');