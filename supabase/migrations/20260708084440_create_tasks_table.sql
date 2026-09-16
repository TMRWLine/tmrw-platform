/*
# Create tasks table (single-tenant, no auth)

1. New Tables
- `tasks`
  - `id` (uuid, primary key, auto-generated)
  - `title` (text, not null) — the task name
  - `description` (text, nullable) — optional details about the task
  - `status` (text, not null, default 'pending') — one of 'pending', 'in_progress', 'completed'
  - `priority` (text, not null, default 'medium') — one of 'low', 'medium', 'high'
  - `created_at` (timestamptz, default now()) — creation timestamp
  - `updated_at` (timestamptz, default now()) — last update timestamp

2. Security
- Enable RLS on `tasks`.
- Allow anon + authenticated full CRUD because the data is intentionally shared/public (single-tenant app with no sign-in).

3. Indexes
- Index on `status` for filtering by status.
- Index on `priority` for filtering by priority.
- Index on `created_at` for ordering by creation date.

4. Notes
- This is a single-tenant app with no authentication.
- All users (anon + authenticated) can read, create, update, and delete all tasks.
- The `updated_at` column is maintained via a trigger that sets it to `now()` on every UPDATE.
*/

-- Create the helper function first (must exist before trigger)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
  TO anon, authenticated USING (true);
