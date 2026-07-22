-- Employee files table (CV, diplomas, certificates, contracts, etc.)
CREATE TABLE IF NOT EXISTS public.employee_files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    file_type   TEXT NOT NULL DEFAULT 'autre', -- cv | diplome | certificat | contrat | autre
    file_path   TEXT NOT NULL,
    file_size   INTEGER,
    mime_type   TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookups by employee
CREATE INDEX IF NOT EXISTS idx_employee_files_employee_id ON public.employee_files(employee_id);

-- RLS: allow HR/admin to read & write all; employees to read their own
ALTER TABLE public.employee_files ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (HR reads all, employee reads own — you can tighten this)
CREATE POLICY "employee_files_select" ON public.employee_files
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert
CREATE POLICY "employee_files_insert" ON public.employee_files
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "employee_files_delete" ON public.employee_files
    FOR DELETE TO authenticated USING (true);

-- Optional: AI analysis results cache
CREATE TABLE IF NOT EXISTS public.employee_analyses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id    UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    extracted_data JSONB,
    files_analyzed INTEGER DEFAULT 0,
    analyzed_by    UUID REFERENCES auth.users(id),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.employee_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_analyses_all" ON public.employee_analyses
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
