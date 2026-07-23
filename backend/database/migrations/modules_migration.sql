-- ══════════════════════════════════════════════════════════════
-- MODULES MIGRATION: Onboarding Salariés + Formation + Talents
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── Onboarding Salariés ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_onboarding (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid REFERENCES employees(id) ON DELETE CASCADE UNIQUE NOT NULL,
  phase               text DEFAULT 'day30' CHECK (phase IN ('day30','day60','day90','completed')),
  buddy_name          text,
  buddy_email         text,
  contract_signed     boolean DEFAULT false,
  contract_signed_at  timestamptz,
  plan_30             jsonb DEFAULT '[]',
  plan_60             jsonb DEFAULT '[]',
  plan_90             jsonb DEFAULT '[]',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pulse_surveys (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  week_number         int,
  satisfaction_score  int CHECK (satisfaction_score BETWEEN 1 AND 5),
  integration_score   int CHECK (integration_score BETWEEN 1 AND 5),
  clarity_score       int CHECK (clarity_score BETWEEN 1 AND 5),
  comment             text,
  created_at          timestamptz DEFAULT now()
);

-- ── Formation ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  category        text DEFAULT 'technique',
  provider        text,
  duration_hours  int DEFAULT 0,
  cost_dh         numeric(10,2) DEFAULT 0,
  description     text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_trainings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  training_id   uuid REFERENCES training_catalog(id) ON DELETE CASCADE NOT NULL,
  status        text DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  assigned_at   timestamptz DEFAULT now(),
  completed_at  timestamptz,
  score         int,
  notes         text
);

-- ── Talents ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS talent_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid REFERENCES employees(id) ON DELETE CASCADE UNIQUE NOT NULL,
  performance_score   int DEFAULT 3 CHECK (performance_score BETWEEN 1 AND 5),
  potential_score     int DEFAULT 3 CHECK (potential_score BETWEEN 1 AND 5),
  amana_score         int DEFAULT 0 CHECK (amana_score BETWEEN 0 AND 5),
  itkan_score         int DEFAULT 0 CHECK (itkan_score BETWEEN 0 AND 5),
  iltizam_score       int DEFAULT 0 CHECK (iltizam_score BETWEEN 0 AND 5),
  ibdaa_score         int DEFAULT 0 CHECK (ibdaa_score BETWEEN 0 AND 5),
  nama_score          int DEFAULT 0 CHECK (nama_score BETWEEN 0 AND 5),
  talent_category     text DEFAULT 'solid',
  flight_risk         text DEFAULT 'low' CHECK (flight_risk IN ('low','medium','high')),
  is_critical_position boolean DEFAULT false,
  successor_names     jsonb DEFAULT '[]',
  career_path         text,
  next_role           text,
  notes               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_okrs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  title       text NOT NULL,
  description text,
  quarter     text,
  progress    int DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status      text DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE employee_onboarding   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_surveys         ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_catalog      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_trainings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_okrs         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_emp_onboarding"  ON employee_onboarding  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pulse"           ON pulse_surveys         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_training_cat"    ON training_catalog      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_emp_trainings"   ON employee_trainings    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_talent"          ON talent_profiles       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_okrs"            ON employee_okrs         FOR ALL USING (true) WITH CHECK (true);
