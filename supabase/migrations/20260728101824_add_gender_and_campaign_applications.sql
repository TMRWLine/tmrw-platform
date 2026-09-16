/*
# Add gender filter and campaign applications

1. Modified Tables
- `athletes` — added column:
  - `gender` (text, nullable) — athlete gender for filtering: 'male', 'female', 'non-binary', or null

2. New Tables
- `campaign_applications`
  - `id` (uuid, primary key, auto-generated)
  - `campaign_id` (uuid, not null, references campaigns(id) ON DELETE CASCADE)
  - `athlete_id` (uuid, not null, references athletes(id) ON DELETE CASCADE)
  - `pitch` (text, nullable) — athlete's application pitch message
  - `status` (text, not null, default 'pending') — one of 'pending', 'accepted', 'declined'
  - `created_at` (timestamptz, default now())

3. Security
- Enable RLS on `campaign_applications`.
- Allow anon + authenticated full CRUD (single-tenant, no auth, public data).

4. Indexes
- Index on `athletes.gender` for filtering.
- Index on `campaign_applications.campaign_id` and `campaign_applications.athlete_id`.

5. Notes
- Single-tenant app with no authentication.
- `gender` is nullable so existing athlete rows are unaffected.
- `campaign_applications` cascade-delete when parent campaign or athlete is deleted.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'gender') THEN
    ALTER TABLE athletes ADD COLUMN gender text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_athletes_gender ON athletes(gender);

CREATE TABLE IF NOT EXISTS campaign_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  pitch text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_applications_campaign_id ON campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_athlete_id ON campaign_applications(athlete_id);

ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_campaign_applications" ON campaign_applications;
CREATE POLICY "anon_select_campaign_applications" ON campaign_applications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_campaign_applications" ON campaign_applications;
CREATE POLICY "anon_insert_campaign_applications" ON campaign_applications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_campaign_applications" ON campaign_applications;
CREATE POLICY "anon_update_campaign_applications" ON campaign_applications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_campaign_applications" ON campaign_applications;
CREATE POLICY "anon_delete_campaign_applications" ON campaign_applications FOR DELETE
  TO anon, authenticated USING (true);
