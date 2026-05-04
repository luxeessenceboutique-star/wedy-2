-- Intern Onboarding Migration
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS intern_onboarding (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id     uuid REFERENCES employees(id) ON DELETE CASCADE UNIQUE NOT NULL,
  phase         text DEFAULT 'pre' CHECK (phase IN ('pre','integration','evaluation','completed')),
  mentor_name   text,
  mentor_email  text,
  checklist     jsonb DEFAULT '[]',
  objectives    jsonb DEFAULT '[]',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intern_evaluations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id        uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  evaluation_type  text DEFAULT 'weekly' CHECK (evaluation_type IN ('weekly','final','self')),
  week_number      int,
  evaluator_name   text,
  amana_score      int DEFAULT 0 CHECK (amana_score BETWEEN 0 AND 5),
  itkan_score      int DEFAULT 0 CHECK (itkan_score BETWEEN 0 AND 5),
  iltizam_score    int DEFAULT 0 CHECK (iltizam_score BETWEEN 0 AND 5),
  ibdaa_score      int DEFAULT 0 CHECK (ibdaa_score BETWEEN 0 AND 5),
  nama_score       int DEFAULT 0 CHECK (nama_score BETWEEN 0 AND 5),
  comment          text,
  created_at       timestamptz DEFAULT now()
);

-- Enable RLS (optional, adjust to your policies)
ALTER TABLE intern_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE intern_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_intern_onboarding" ON intern_onboarding FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_intern_evaluations" ON intern_evaluations FOR ALL USING (true) WITH CHECK (true);
