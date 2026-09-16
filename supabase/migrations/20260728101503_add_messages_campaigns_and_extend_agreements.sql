/*
# Add campaign messaging, GST, and contract tenure support

1. New Tables
- `messages`
  - `id` (uuid, primary key, auto-generated)
  - `agreement_id` (uuid, not null, references agreements(id) ON DELETE CASCADE)
  - `sender_type` (text, not null) — who sent the message: 'sponsor', 'athlete', or 'platform'
  - `content` (text, not null) — message body
  - `created_at` (timestamptz, default now())
- `campaigns`
  - `id` (uuid, primary key, auto-generated)
  - `sponsor_id` (uuid, not null, references sponsors(id) ON DELETE CASCADE)
  - `title` (text, not null) — campaign name
  - `description` (text, nullable) — campaign description
  - `budget_aud` (numeric(12,2), nullable) — campaign budget in AUD
  - `radius_km` (numeric(8,2), nullable) — targeting radius in kilometres
  - `sport_category` (text, nullable) — sport this campaign targets (e.g. 'Rugby League')
  - `status` (text, not null, default 'draft') — one of 'draft', 'active', 'paused', 'completed'
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Modified Tables
- `agreements` — added columns:
  - `gst_amount` (numeric(12,2), nullable) — GST component of the deal value
  - `total_inc_gst` (numeric(12,2), nullable) — total deal value including GST
  - `exclusivity_category` (text, nullable) — category the sponsor has exclusivity over
  - `auto_renew_flag` (boolean, not null, default false) — whether the agreement auto-renews
  (Note: `start_date` and `end_date` already exist on the agreements table.)

3. Security
- Enable RLS on `messages` and `campaigns`.
- Allow anon + authenticated full CRUD because the marketplace is intentionally shared/public (single-tenant app with no sign-in).
- `USING (true)` is acceptable here because the data is intentionally public/shared.

4. Indexes
- Index on `messages.agreement_id` for join performance.
- Index on `campaigns.sponsor_id` for join performance.
- Index on `campaigns.status` for filtering by status.
- Index on `campaigns.sport_category` for filtering by sport.

5. Notes
- This is a single-tenant app with no authentication.
- All users (anon + authenticated) can read, create, update, and delete all records.
- The `updated_at` column on `campaigns` is maintained via the existing `update_updated_at_column()` trigger function.
- `messages` cascade-delete when a parent agreement is deleted.
- `campaigns` cascade-delete when a parent sponsor is deleted.
- New `agreements` columns are nullable (or have defaults) so existing rows are unaffected.
*/

-- ===== messages table =====
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('sponsor', 'athlete', 'platform')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_agreement_id ON messages(agreement_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE
  TO anon, authenticated USING (true);

-- ===== campaigns table =====
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  budget_aud numeric(12, 2),
  radius_km numeric(8, 2),
  sport_category text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_sponsor_id ON campaigns(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_sport_category ON campaigns(sport_category);

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_campaigns" ON campaigns;
CREATE POLICY "anon_select_campaigns" ON campaigns FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_campaigns" ON campaigns;
CREATE POLICY "anon_insert_campaigns" ON campaigns FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_campaigns" ON campaigns;
CREATE POLICY "anon_update_campaigns" ON campaigns FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_campaigns" ON campaigns;
CREATE POLICY "anon_delete_campaigns" ON campaigns FOR DELETE
  TO anon, authenticated USING (true);

-- ===== Extend agreements table =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agreements' AND column_name = 'gst_amount') THEN
    ALTER TABLE agreements ADD COLUMN gst_amount numeric(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agreements' AND column_name = 'total_inc_gst') THEN
    ALTER TABLE agreements ADD COLUMN total_inc_gst numeric(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agreements' AND column_name = 'exclusivity_category') THEN
    ALTER TABLE agreements ADD COLUMN exclusivity_category text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agreements' AND column_name = 'auto_renew_flag') THEN
    ALTER TABLE agreements ADD COLUMN auto_renew_flag boolean NOT NULL DEFAULT false;
  END IF;
END $$;
