-- ══════════════════════════════════════════════════════════════
-- PORTAL MIGRATION: Employee Portal + Account Management
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── Ensure user_roles exists ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE,
  role       text NOT NULL DEFAULT 'employee',
  created_at timestamptz DEFAULT now()
);

-- Drop old check constraint that blocked 'employee' role
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- ── Ensure profiles exists ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE,
  full_name  text,
  created_at timestamptz DEFAULT now()
);

-- ── Ensure notifications exists ────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  type       text DEFAULT 'info',
  title      text NOT NULL,
  body       text,
  link       text,
  is_read    boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── Document requests (employee → HR) ─────────────────────────
CREATE TABLE IF NOT EXISTS document_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  doc_type    text NOT NULL,
  comment     text,
  status      text DEFAULT 'pending'
                   CHECK (status IN ('pending','in_progress','completed','rejected')),
  hr_note     text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE user_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_user_roles"     ON user_roles;
DROP POLICY IF EXISTS "allow_all_profiles"       ON profiles;
DROP POLICY IF EXISTS "allow_all_notifications"  ON notifications;
DROP POLICY IF EXISTS "allow_all_doc_requests"   ON document_requests;

CREATE POLICY "allow_all_user_roles"     ON user_roles        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_profiles"       ON profiles          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_notifications"  ON notifications     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_doc_requests"   ON document_requests FOR ALL USING (true) WITH CHECK (true);
