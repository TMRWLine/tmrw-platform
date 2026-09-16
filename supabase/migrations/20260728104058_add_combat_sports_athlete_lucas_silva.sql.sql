/*
# Add Combat Sports athlete: Lucas Silva (BJJ / Regional MMA)

1. Data Changes
- Inserts 1 new athlete representing Combat Sports:
  - Lucas Silva, BJJ / Regional MMA, Bondi Junction NSW 2026, 5,100 followers, male.

2. Schema Changes
- No new columns required (gender column already exists).

3. Security
- No RLS policy changes.
*/

INSERT INTO athletes (
  name, sport, current_club, agreement_status, location,
  postcode, latitude, longitude, follower_count, gender,
  master_licence_signed, nrl_tpa_registered, shute_shield_compliant,
  profile_data
) VALUES
  (
    'Lucas Silva', 'Combat Sports', 'Bondi BJJ Academy (Regional MMA)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(151.2489, -33.8900), 4326)::geography,
    '2026', -33.8900, 151.2489, 5100, 'male',
    true, false, false,
    '{"specialty":"BJJ / MMA","age":26,"market_value_aud":35000}'::jsonb
  );
