/*
# Re-seed athletes: one representative per sport with gender and local postcodes

1. Data Changes
- Deletes all existing athletes and re-seeds with 11 athletes covering 10 sports:
  - Rugby Union: Liam Toole (Shute Shield, Sydney), Tane Edmonds (Auckland NPC)
  - Rugby League: Lachlan Miller (NSW Cup, Newtown)
  - Basketball: Hunter Bligh (NBL1, Melbourne)
  - Soccer: Marco Rossi (NPL NSW, Sydney)
  - Cricket: Mitchell Vance (NSW Premier Cricket, Sydney)
  - Surfing: Kai Slater (Boardriders Club / WSL Regional, Gold Coast)
  - AFL: Sam Sterling (VFL / State League, Melbourne)
  - Netball: Maya Lin (State League, Melbourne)
  - Triathlon: Sarah Jenkins (AusTriathlon Premier, Gold Coast)
  - Para-Triathlon: Alex Taylor (World Triathlon Para Series, Sydney)
- Sets gender ('male' or 'female') for each athlete.
- All athletes have local suburb postcodes and coordinates.

2. Schema Changes
- No new columns (gender column already added in prior migration).

3. Security
- No RLS policy changes.

4. Notes
- Sponsors are not modified.
- Idempotent: DELETE + INSERT replaces all athletes.
*/

DELETE FROM athletes;

INSERT INTO athletes (
  name, sport, current_club, agreement_status, location,
  postcode, latitude, longitude, follower_count, gender,
  master_licence_signed, nrl_tpa_registered, shute_shield_compliant,
  profile_data
) VALUES
  (
    'Liam Toole', 'Rugby Union', 'Northern Suburbs (Shute Shield)', 'active',
    ST_SetSRID(ST_MakePoint(151.1789, -33.8148), 4326)::geography,
    '2088', -33.8148, 151.1789, 4200, 'male',
    true, false, true,
    '{"position":"Lock","age":23,"market_value_aud":45000}'::jsonb
  ),
  (
    'Tane Edmonds', 'Rugby Union', 'Auckland (NPC)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(174.7633, -36.8485), 4326)::geography,
    '1010', -36.8485, 174.7633, 5300, 'male',
    false, false, false,
    '{"position":"Winger","age":22,"market_value_nzd":38000}'::jsonb
  ),
  (
    'Lachlan Miller', 'Rugby League', 'Newtown Jets (NSW Cup)', 'pending',
    ST_SetSRID(ST_MakePoint(151.1792, -33.8986), 4326)::geography,
    '2042', -33.8986, 151.1792, 8700, 'male',
    true, true, false,
    '{"position":"Five-Eighth","age":25,"market_value_aud":65000}'::jsonb
  ),
  (
    'Hunter Bligh', 'Basketball', 'Melbourne Tigers (NBL1)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(144.9631, -37.8136), 4326)::geography,
    '3000', -37.8136, 144.9631, 6100, 'male',
    true, false, false,
    '{"position":"Forward","age":24,"market_value_aud":40000}'::jsonb
  ),
  (
    'Marco Rossi', 'Soccer', 'Sydney United 58 (NPL NSW)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(151.0094, -33.8790), 4326)::geography,
    '2145', -33.8790, 151.0094, 9200, 'male',
    true, false, false,
    '{"position":"Midfielder","age":26,"market_value_aud":38000}'::jsonb
  ),
  (
    'Mitchell Vance', 'Cricket', 'Sydney Sixers (NSW Premier Cricket)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(151.2093, -33.8688), 4326)::geography,
    '2000', -33.8688, 151.2093, 3400, 'male',
    true, false, false,
    '{"position":"All-rounder","age":27,"market_value_aud":35000}'::jsonb
  ),
  (
    'Kai Slater', 'Surfing', 'Snapper Rocks Boardriders (WSL Regional)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(153.4146, -28.0024), 4326)::geography,
    '4217', -28.0024, 153.4146, 7800, 'male',
    true, false, false,
    '{"specialty":"Shortboard","age":21,"market_value_aud":30000}'::jsonb
  ),
  (
    'Sam Sterling', 'AFL', 'Williamstown Seagulls (VFL)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(144.8820, -37.8600), 4326)::geography,
    '3016', -37.8600, 144.8820, 5500, 'male',
    true, false, false,
    '{"position":"Midfielder","age":23,"market_value_aud":42000}'::jsonb
  ),
  (
    'Maya Lin', 'Netball', 'Melbourne Lightning (State League)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(144.9631, -37.8136), 4326)::geography,
    '3000', -37.8136, 144.9631, 4600, 'female',
    true, false, false,
    '{"position":"Goal Shooter","age":24,"market_value_aud":32000}'::jsonb
  ),
  (
    'Sarah Jenkins', 'Triathlon', 'Gold Coast Tri Club (AusTriathlon Premier)', 'no_agreement',
    ST_SetSRID(ST_MakePoint(153.4146, -28.0024), 4326)::geography,
    '4217', -28.0024, 153.4146, 3800, 'female',
    true, false, false,
    '{"specialty":"Olympic Distance","age":28,"market_value_aud":28000}'::jsonb
  ),
  (
    'Alex Taylor', 'Para-Triathlon', 'World Triathlon Para Series', 'no_agreement',
    ST_SetSRID(ST_MakePoint(151.2093, -33.8688), 4326)::geography,
    '2000', -33.8688, 151.2093, 2900, 'male',
    true, false, false,
    '{"specialty":"PTVI","age":30,"market_value_aud":25000}'::jsonb
  );
