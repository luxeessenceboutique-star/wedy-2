-- ============================================================
-- TYTHON RH PLATFORM — Full Database Setup
-- Paste this entire file in Supabase SQL Editor and click Run
-- Safe to re-run (uses IF NOT EXISTS everywhere)
-- ============================================================

-- ── EMPLOYEES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       TEXT NOT NULL,
    cin             TEXT,
    matricule       TEXT,
    email           TEXT,
    phone           TEXT,
    position        TEXT,
    department      TEXT,
    status          TEXT NOT NULL DEFAULT 'active',
    hire_date       DATE,
    contract_type   TEXT,
    contract_start  DATE,
    contract_end    DATE,
    salary          NUMERIC,
    birth_date      DATE,
    address         TEXT,
    city            TEXT,
    nationality     TEXT,
    manager         TEXT,
    cnss_number     TEXT,
    bank_account    TEXT,
    notes           TEXT,
    internship_start DATE,
    internship_end   DATE,
    created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── PROFILES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name   TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── USER ROLES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role       TEXT NOT NULL DEFAULT 'hr',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── DOCUMENT TEMPLATES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code          TEXT UNIQUE NOT NULL,
    name_fr       TEXT NOT NULL,
    name_en       TEXT,
    name_ar       TEXT,
    category      TEXT DEFAULT 'autre',
    body_template TEXT NOT NULL DEFAULT '',
    variables     TEXT[] DEFAULT '{}',
    is_active     BOOLEAN DEFAULT true NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── GENERATED DOCUMENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generated_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    template_id   UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
    document_type TEXT,
    language      TEXT DEFAULT 'fr',
    content_html  TEXT,
    generated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── LEAVE REQUESTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    type        TEXT NOT NULL DEFAULT 'conge_annuel',
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    days        INTEGER,
    status      TEXT NOT NULL DEFAULT 'pending',
    reason      TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    comment     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── PAYROLL RECORDS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id      UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    month            INTEGER NOT NULL,
    year             INTEGER NOT NULL,
    base_salary      NUMERIC NOT NULL DEFAULT 0,
    bonuses          NUMERIC DEFAULT 0,
    deductions       NUMERIC DEFAULT 0,
    cnss_deduction   NUMERIC DEFAULT 0,
    amo_deduction    NUMERIC DEFAULT 0,
    ir_deduction     NUMERIC DEFAULT 0,
    net_salary       NUMERIC DEFAULT 0,
    gross_salary     NUMERIC DEFAULT 0,
    status           TEXT DEFAULT 'draft',
    notes            TEXT,
    created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(employee_id, month, year)
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title      TEXT,
    message    TEXT NOT NULL,
    type       TEXT DEFAULT 'info',
    is_read    BOOLEAN DEFAULT false NOT NULL,
    link       TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── AUDIT LOGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action     TEXT NOT NULL,
    entity     TEXT,
    entity_id  TEXT,
    details    JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── HR REQUESTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type        TEXT NOT NULL,
    status      TEXT DEFAULT 'pending',
    description TEXT,
    comment     TEXT,
    start_date  DATE,
    end_date    DATE,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── INTERNS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interns (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name        TEXT NOT NULL,
    cin              TEXT,
    email            TEXT,
    phone            TEXT,
    school           TEXT,
    position         TEXT,
    department       TEXT,
    supervisor       TEXT,
    internship_start DATE,
    internship_end   DATE,
    status           TEXT DEFAULT 'active',
    notes            TEXT,
    created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── DEPARTMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── PERFORMANCE REVIEWS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.performance_reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    period      TEXT NOT NULL,
    score       INTEGER CHECK (score BETWEEN 1 AND 5),
    feedback    TEXT,
    objectives  TEXT,
    status      TEXT DEFAULT 'draft',
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── PERFORMANCE GOALS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.performance_goals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT DEFAULT 'pending',
    progress    INTEGER DEFAULT 0,
    due_date    DATE,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── ASSETS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    category      TEXT,
    serial_number TEXT,
    employee_id   UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status        TEXT DEFAULT 'available',
    assigned_at   TIMESTAMPTZ,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── CV EXTRACTIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cv_extractions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    full_name   TEXT,
    email       TEXT,
    phone       TEXT,
    skills      TEXT[],
    education   TEXT,
    experience  TEXT,
    languages   TEXT[],
    raw_json    JSONB,
    file_url    TEXT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── DOCUMENTS (uploaded files) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID,
    type        TEXT,
    name        TEXT,
    file_url    TEXT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── EMPLOYEE FILES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    name        TEXT NOT NULL,
    file_type   TEXT DEFAULT 'autre',
    file_path   TEXT NOT NULL,
    file_size   INTEGER,
    mime_type   TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── EMPLOYEE ANALYSES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_analyses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id    UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    extracted_data JSONB,
    files_analyzed INTEGER DEFAULT 0,
    analyzed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_status     ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department);
CREATE INDEX IF NOT EXISTS idx_generated_docs_emp   ON public.generated_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp   ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_emp          ON public.payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user      ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_files_emp   ON public.employee_files(employee_id);

-- ── RLS (Row Level Security — allow all for authenticated users) ──
ALTER TABLE public.employees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_files      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_analyses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interns             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles          ENABLE ROW LEVEL SECURITY;

-- Allow all access for authenticated users (service role bypasses RLS anyway)
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'employees','document_templates','generated_documents','leave_requests',
    'payroll_records','notifications','audit_logs','employee_files',
    'employee_analyses','interns','hr_requests','departments',
    'performance_reviews','performance_goals','profiles','user_roles',
    'assets','cv_extractions','documents'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format('
        CREATE POLICY "auth_all_%s" ON public.%I
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
      ', tbl, tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- policy already exists, skip
    END;
  END LOOP;
END $$;

-- ── AUTO-CREATE PROFILE + ROLE ON SIGNUP ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'hr')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── ENSURE UNIQUE CONSTRAINTS EXIST ─────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id   ON public.profiles(user_id);

-- ── INSERT YOUR USER AS ADMIN ─────────────────────────────────
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'amarrabeh1998@gmail.com');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'amarrabeh1998@gmail.com';

DELETE FROM public.profiles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'amarrabeh1998@gmail.com');

INSERT INTO public.profiles (user_id, full_name)
SELECT id, 'Ammar Abeh' FROM auth.users WHERE email = 'amarrabeh1998@gmail.com';
