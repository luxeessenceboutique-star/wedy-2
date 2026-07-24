-- ============================================================
-- WEDY RH PLATFORM — AI-powered employee/intern import support
-- ============================================================

-- custom_fields was already declared in the Pydantic schemas (EmployeeCreate/
-- EmployeeUpdate/EmployeeOut) but was never added to the actual table —
-- this migration fixes that drift. Required so unmapped spreadsheet columns
-- can be preserved instead of silently dropped during import.
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Dedicated import history — richer than audit_logs (which only has
-- action/entity/entity_id, no room for row-count breakdowns or the
-- detected column mapping).
CREATE TABLE IF NOT EXISTS public.import_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL,              -- 'employee' | 'intern'
    filename        TEXT,
    total_rows      INTEGER NOT NULL DEFAULT 0,
    created_count   INTEGER NOT NULL DEFAULT 0,
    updated_count   INTEGER NOT NULL DEFAULT 0,
    skipped_count   INTEGER NOT NULL DEFAULT 0,
    failed_count    INTEGER NOT NULL DEFAULT 0,
    column_mapping  JSONB DEFAULT '{}'::jsonb,
    initiated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON public.import_logs(created_at DESC);
