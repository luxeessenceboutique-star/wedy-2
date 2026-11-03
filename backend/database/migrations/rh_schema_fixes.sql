-- Columns and tables that older migrations created in the `public` schema only, while the API reads and writes
-- the `rh` schema (SUPABASE_SCHEMA=rh). Symptom: « Could not find the 'custom_fields' column of 'employees' in the
-- schema cache » (PGRST204), or a 503 on the interns' onboarding. Everything is IF NOT EXISTS: safe to run again.
-- Run once in the Supabase SQL editor.

-- employees.custom_fields: recruitment stage of candidates, careers-page application (job post, CV, LinkedIn),
-- interview score, unmapped columns of spreadsheet imports (was only in employee_import_support.sql → public).
ALTER TABLE rh.employees ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

-- employees.remuneration: interns' stipend (was only in interns_advanced_migration.sql → public).
ALTER TABLE rh.employees ADD COLUMN IF NOT EXISTS remuneration numeric(12,2) DEFAULT 0;

-- Interns' onboarding and Moovwin evaluations (were only created in public by master / onboarding migrations).
CREATE TABLE IF NOT EXISTS rh.intern_onboarding (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id    uuid UNIQUE NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    phase        text DEFAULT 'pre' CHECK (phase IN ('pre','integration','evaluation','completed')),
    mentor_name  text,
    mentor_email text,
    checklist    jsonb DEFAULT '[]'::jsonb,
    objectives   jsonb DEFAULT '[]'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rh.intern_evaluations (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id        uuid NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
    evaluation_type  text DEFAULT 'weekly' CHECK (evaluation_type IN ('weekly','final','self')),
    week_number      integer,
    evaluator_name   text,
    amana_score      integer DEFAULT 0 CHECK (amana_score BETWEEN 0 AND 5),
    itkan_score      integer DEFAULT 0 CHECK (itkan_score BETWEEN 0 AND 5),
    iltizam_score    integer DEFAULT 0 CHECK (iltizam_score BETWEEN 0 AND 5),
    ibdaa_score      integer DEFAULT 0 CHECK (ibdaa_score BETWEEN 0 AND 5),
    nama_score       integer DEFAULT 0 CHECK (nama_score BETWEEN 0 AND 5),
    comment          text,
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intern_evaluations_intern ON rh.intern_evaluations (intern_id);

-- Import history of the smart import (was only created in public by employee_import_support.sql).
CREATE TABLE IF NOT EXISTS rh.import_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     text NOT NULL,              -- 'employee' | 'intern'
    filename        text,
    total_rows      integer NOT NULL DEFAULT 0,
    created_count   integer NOT NULL DEFAULT 0,
    updated_count   integer NOT NULL DEFAULT 0,
    skipped_count   integer NOT NULL DEFAULT 0,
    failed_count    integer NOT NULL DEFAULT 0,
    column_mapping  jsonb DEFAULT '{}'::jsonb,
    initiated_by    uuid,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON rh.import_logs (created_at DESC);

-- interviews.candidate_id must point to employees (candidates are employees rows), not profiles.
ALTER TABLE rh.interviews DROP CONSTRAINT IF EXISTS interviews_candidate_id_fkey;
ALTER TABLE rh.interviews
  ADD CONSTRAINT interviews_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES rh.employees(id) ON DELETE CASCADE NOT VALID;

-- the API uses the service role, which bypasses RLS
ALTER TABLE rh.intern_onboarding  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.intern_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh.import_logs        ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
