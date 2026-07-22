-- ══════════════════════════════════════════════════════════════
-- PDI + Compétences Migration
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── Référentiel Compétences ────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text DEFAULT 'technique',
  description text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  skill_id    uuid REFERENCES skills(id) ON DELETE CASCADE,
  level       text DEFAULT 'beginner',
  assessed_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, skill_id)
);

-- ── Plan de Développement Individuel ──────────────────────────
CREATE TABLE IF NOT EXISTS pdi_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  title       text NOT NULL,
  action_type text DEFAULT 'formation',
  target_date date,
  status      text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE skills          ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdi_items       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_skills"     ON skills          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_emp_skills" ON employee_skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pdi"        ON pdi_items       FOR ALL USING (true) WITH CHECK (true);
