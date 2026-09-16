/*
# Create NIL marketplace tables (single-tenant, no auth)

1. New Tables
- `athletes`
  - `id` (uuid, primary key, auto-generated)
  - `name` (text, not null) — athlete's full name
  - `profile_data` (jsonb, nullable) — flexible profile metadata (sport, position, bio, social handles)
  - `current_club` (text, nullable) — current club affiliation
  - `agreement_status` (text, not null, default 'no_agreement') — one of 'no_agreement', 'pending', 'active', 'expired'
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

- `sponsors`
  - `id` (uuid, primary key, auto-generated)
  - `business_name` (text, not null) — sponsor's business name
  - `merchant_category` (text, nullable) — business/merchant category (e.g. hospitality, retail, fitness)
  - `budget_allocation` (numeric, nullable, default 0) — total budget allocated for NIL deals
  - `contact_email` (text, nullable) — sponsor contact
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

- `agreements`
  - `id` (uuid, primary key, auto-generated)
  - `athlete_id` (uuid, not null, references athletes(id) ON DELETE CASCADE)
  - `sponsor_id` (uuid, not null, references sponsors(id) ON DELETE CASCADE)
  - `status` (text, not null, default 'pending') — one of 'pending', 'active', 'expired', 'terminated'
  - `deal_value` (numeric, nullable) — agreed deal value in AUD
  - `start_date` (date, nullable) — agreement start date
  - `end_date` (date, nullable) — agreement end date
  - `terms` (text, nullable) — free-text summary of agreement terms
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on all three tables.
- Allow anon + authenticated full CRUD because the marketplace is intentionally shared/public (single-tenant app with no sign-in).
- `USING (true)` is acceptable here because the data is intentionally public/shared.

3. Indexes
- Index on `athletes.agreement_status` for filtering by status.
- Index on `athletes.current_club` for filtering by club.
- Index on `sponsors.merchant_category` for filtering by category.
- Index on `agreements.status` for filtering by status.
- Index on `agreements.athlete_id` and `agreements.sponsor_id` for join performance.

4. Notes
- This is a single-tenant app with no authentication.
- All users (anon + authenticated) can read, create, update, and delete all marketplace records.
- The `updated_at` columns are maintained via triggers that set them to `now()` on every UPDATE.
- `agreements` rows cascade-delete when a parent athlete or sponsor is deleted, preserving referential integrity.
*/

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  profile_data jsonb,
  current_club text,
  agreement_status text NOT NULL DEFAULT 'no_agreement' CHECK (agreement_status IN ('no_agreement', 'pending', 'active', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athletes_agreement_status ON athletes(agreement_status);
CREATE INDEX IF NOT EXISTS idx_athletes_current_club ON athletes(current_club);

DROP TRIGGER IF EXISTS athletes_updated_at ON athletes;
CREATE TRIGGER athletes_updated_at
  BEFORE UPDATE ON athletes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_athletes" ON athletes;
CREATE POLICY "anon_select_athletes" ON athletes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_athletes" ON athletes;
CREATE POLICY "anon_insert_athletes" ON athletes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_athletes" ON athletes;
CREATE POLICY "anon_update_athletes" ON athletes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_athletes" ON athletes;
CREATE POLICY "anon_delete_athletes" ON athletes FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  merchant_category text,
  budget_allocation numeric(12, 2) NOT NULL DEFAULT 0,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsors_merchant_category ON sponsors(merchant_category);

DROP TRIGGER IF EXISTS sponsors_updated_at ON sponsors;
CREATE TRIGGER sponsors_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sponsors" ON sponsors;
CREATE POLICY "anon_select_sponsors" ON sponsors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sponsors" ON sponsors;
CREATE POLICY "anon_insert_sponsors" ON sponsors FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sponsors" ON sponsors;
CREATE POLICY "anon_update_sponsors" ON sponsors FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sponsors" ON sponsors;
CREATE POLICY "anon_delete_sponsors" ON sponsors FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  sponsor_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'terminated')),
  deal_value numeric(12, 2),
  start_date date,
  end_date date,
  terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_athlete_id ON agreements(athlete_id);
CREATE INDEX IF NOT EXISTS idx_agreements_sponsor_id ON agreements(sponsor_id);

DROP TRIGGER IF EXISTS agreements_updated_at ON agreements;
CREATE TRIGGER agreements_updated_at
  BEFORE UPDATE ON agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_agreements" ON agreements;
CREATE POLICY "anon_select_agreements" ON agreements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_agreements" ON agreements;
CREATE POLICY "anon_insert_agreements" ON agreements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_agreements" ON agreements;
CREATE POLICY "anon_update_agreements" ON agreements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_agreements" ON agreements;
CREATE POLICY "anon_delete_agreements" ON agreements FOR DELETE
  TO anon, authenticated USING (true);
