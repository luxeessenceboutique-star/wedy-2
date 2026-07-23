-- ============================================================
-- TYTHON RH PLATFORM — MASTER MIGRATION (Fresh Supabase)
-- Paste this entire file in Supabase SQL Editor and click Run.
-- Safe to re-run — uses IF NOT EXISTS and OR REPLACE everywhere.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- SECTION 1 — HELPER FUNCTIONS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Alias used in some older migration files
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- SECTION 2 — CORE TABLES
-- ════════════════════════════════════════════════════════════

-- ── EMPLOYEES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           TEXT NOT NULL,
    cin                 TEXT,
    matricule           TEXT,
    email               TEXT,
    phone               TEXT,
    position            TEXT,
    department          TEXT,
    status              TEXT NOT NULL DEFAULT 'active',
    hire_date           DATE,
    contract_type       TEXT,
    contract_start      DATE,
    contract_end        DATE,
    salary              NUMERIC,
    birth_date          DATE,
    address             TEXT,
    city                TEXT,
    nationality         TEXT,
    manager             TEXT,
    cnss_number         TEXT,
    bank_account        TEXT,
    notes               TEXT,
    internship_start    DATE,
    internship_end      DATE,
    school              TEXT,
    remuneration        DECIMAL(12,2) DEFAULT 0,
    manager_id          UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    photo_url           TEXT,
    bio                 TEXT,
    skills              TEXT[] DEFAULT '{}',
    experience_summary  TEXT,
    education_summary   TEXT,
    certifications      TEXT[] DEFAULT '{}',
    languages           TEXT[] DEFAULT '{}',
    created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── PROFILES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name   TEXT,
    avatar_url  TEXT,
    type        TEXT DEFAULT 'employee',
    first_name  TEXT,
    last_name   TEXT,
    email       TEXT,
    phone       TEXT,
    cin         TEXT,
    address     TEXT,
    bio         TEXT,
    skills      TEXT[] DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── USER ROLES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role       TEXT NOT NULL DEFAULT 'hr',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── DEPARTMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    manager_id  UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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

DROP TRIGGER IF EXISTS trg_doc_templates_updated_at ON public.document_templates;
CREATE TRIGGER trg_doc_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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

-- ── DOCUMENTS (uploaded files) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    type        TEXT,
    name        TEXT,
    file_url    TEXT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── LEAVE REQUESTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    type        TEXT NOT NULL DEFAULT 'annual',
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    days        INTEGER,
    status      TEXT NOT NULL DEFAULT 'pending',
    reason      TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    comment     TEXT,
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── LEAVE BALANCES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id    UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    year           INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
    annual_total   INTEGER NOT NULL DEFAULT 21,
    annual_used    INTEGER NOT NULL DEFAULT 0,
    sick_total     INTEGER NOT NULL DEFAULT 12,
    sick_used      INTEGER NOT NULL DEFAULT 0,
    personal_total INTEGER NOT NULL DEFAULT 5,
    personal_used  INTEGER NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(employee_id, year)
);

DROP TRIGGER IF EXISTS trg_leave_balances_updated_at ON public.leave_balances;
CREATE TRIGGER trg_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-update leave_balances when a leave request is approved
CREATE OR REPLACE FUNCTION public.handle_leave_approval()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.leave_balances (employee_id, year)
    VALUES (NEW.employee_id, EXTRACT(YEAR FROM NEW.start_date)::int)
    ON CONFLICT (employee_id, year) DO NOTHING;

    IF NEW.type = 'annual' THEN
      UPDATE public.leave_balances
        SET annual_used = annual_used + NEW.days
      WHERE employee_id = NEW.employee_id
        AND year = EXTRACT(YEAR FROM NEW.start_date)::int;
    ELSIF NEW.type = 'sick' THEN
      UPDATE public.leave_balances
        SET sick_used = sick_used + NEW.days
      WHERE employee_id = NEW.employee_id
        AND year = EXTRACT(YEAR FROM NEW.start_date)::int;
    ELSIF NEW.type = 'personal' THEN
      UPDATE public.leave_balances
        SET personal_used = personal_used + NEW.days
      WHERE employee_id = NEW.employee_id
        AND year = EXTRACT(YEAR FROM NEW.start_date)::int;
    END IF;

    UPDATE public.employees SET status = 'on-leave' WHERE id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leave_approval ON public.leave_requests;
CREATE TRIGGER trg_leave_approval
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_leave_approval();

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
    cnss             NUMERIC DEFAULT 0,
    ir               NUMERIC DEFAULT 0,
    net_salary       NUMERIC DEFAULT 0,
    gross_salary     NUMERIC DEFAULT 0,
    status           TEXT DEFAULT 'draft',
    paid_at          TIMESTAMPTZ,
    notes            TEXT,
    created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(employee_id, month, year)
);

DROP TRIGGER IF EXISTS trg_payroll_updated_at ON public.payroll_records;
CREATE TRIGGER trg_payroll_updated_at
  BEFORE UPDATE ON public.payroll_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── PAYROLLS (simplified payroll table with pdf support) ─────
CREATE TABLE IF NOT EXISTS public.payrolls (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    month       INTEGER NOT NULL,
    year        INTEGER NOT NULL,
    base_salary DECIMAL(12,2),
    allowances  DECIMAL(12,2) DEFAULT 0,
    deductions  DECIMAL(12,2) DEFAULT 0,
    net_salary  DECIMAL(12,2),
    status      TEXT DEFAULT 'draft',
    pdf_url     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(employee_id, month, year)
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID,
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
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── HR REQUESTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type        TEXT NOT NULL,
    request_type TEXT,
    status      TEXT DEFAULT 'pending',
    description TEXT,
    comment     TEXT,
    notes       TEXT,
    start_date  DATE,
    end_date    DATE,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_hr_requests_updated_at ON public.hr_requests;
CREATE TRIGGER trg_hr_requests_updated_at
  BEFORE UPDATE ON public.hr_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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

DROP TRIGGER IF EXISTS trg_interns_updated_at ON public.interns;
CREATE TRIGGER trg_interns_updated_at
  BEFORE UPDATE ON public.interns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── PERFORMANCE REVIEWS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.performance_reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id  UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    reviewer_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    period       TEXT NOT NULL,
    score        INTEGER CHECK (score BETWEEN 1 AND 5),
    feedback     TEXT,
    objectives   TEXT,
    achievements TEXT,
    improvements TEXT,
    status       TEXT DEFAULT 'draft',
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_performance_updated_at ON public.performance_reviews;
CREATE TRIGGER trg_performance_updated_at
  BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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

DROP TRIGGER IF EXISTS trg_perf_goals_updated_at ON public.performance_goals;
CREATE TRIGGER trg_perf_goals_updated_at
  BEFORE UPDATE ON public.performance_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── ASSETS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    category      TEXT,
    serial_number TEXT UNIQUE,
    employee_id   UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status        TEXT DEFAULT 'available',
    assigned_at   TIMESTAMPTZ,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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

-- ── HOLIDAYS (Maroc) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.holidays (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    date         DATE NOT NULL UNIQUE,
    is_recurring BOOLEAN DEFAULT true,
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ════════════════════════════════════════════════════════════
-- SECTION 3 — PORTAL TABLES
-- ════════════════════════════════════════════════════════════

-- ── DOCUMENT REQUESTS (employee → HR) ────────────────────────
CREATE TABLE IF NOT EXISTS public.document_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    doc_type    TEXT NOT NULL,
    comment     TEXT,
    status      TEXT DEFAULT 'pending'
                     CHECK (status IN ('pending','in_progress','completed','rejected')),
    hr_note     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_doc_requests_updated_at ON public.document_requests;
CREATE TRIGGER trg_doc_requests_updated_at
  BEFORE UPDATE ON public.document_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ════════════════════════════════════════════════════════════
-- SECTION 4 — MODULES: ONBOARDING, TRAINING, TALENTS
-- ════════════════════════════════════════════════════════════

-- ── EMPLOYEE ONBOARDING ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_onboarding (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id        UUID REFERENCES public.employees(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phase              TEXT DEFAULT 'day30' CHECK (phase IN ('day30','day60','day90','completed')),
    buddy_name         TEXT,
    buddy_email        TEXT,
    contract_signed    BOOLEAN DEFAULT false,
    contract_signed_at TIMESTAMPTZ,
    plan_30            JSONB DEFAULT '[]',
    plan_60            JSONB DEFAULT '[]',
    plan_90            JSONB DEFAULT '[]',
    created_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_emp_onboarding_updated_at ON public.employee_onboarding;
CREATE TRIGGER trg_emp_onboarding_updated_at
  BEFORE UPDATE ON public.employee_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── PULSE SURVEYS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pulse_surveys (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id        UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    week_number        INTEGER,
    satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
    integration_score  INTEGER CHECK (integration_score BETWEEN 1 AND 5),
    clarity_score      INTEGER CHECK (clarity_score BETWEEN 1 AND 5),
    comment            TEXT,
    created_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── TRAINING CATALOG ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_catalog (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title          TEXT NOT NULL,
    category       TEXT DEFAULT 'technique',
    provider       TEXT,
    duration_hours INTEGER DEFAULT 0,
    cost_dh        NUMERIC(10,2) DEFAULT 0,
    description    TEXT,
    is_active      BOOLEAN DEFAULT true,
    created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── EMPLOYEE TRAININGS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_trainings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id  UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    training_id  UUID REFERENCES public.training_catalog(id) ON DELETE CASCADE NOT NULL,
    status       TEXT DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
    assigned_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed_at TIMESTAMPTZ,
    score        INTEGER,
    notes        TEXT
);

-- ── TALENT PROFILES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.talent_profiles (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id          UUID REFERENCES public.employees(id) ON DELETE CASCADE UNIQUE NOT NULL,
    performance_score    INTEGER DEFAULT 3 CHECK (performance_score BETWEEN 1 AND 5),
    potential_score      INTEGER DEFAULT 3 CHECK (potential_score BETWEEN 1 AND 5),
    amana_score          INTEGER DEFAULT 0 CHECK (amana_score BETWEEN 0 AND 5),
    itkan_score          INTEGER DEFAULT 0 CHECK (itkan_score BETWEEN 0 AND 5),
    iltizam_score        INTEGER DEFAULT 0 CHECK (iltizam_score BETWEEN 0 AND 5),
    ibdaa_score          INTEGER DEFAULT 0 CHECK (ibdaa_score BETWEEN 0 AND 5),
    nama_score           INTEGER DEFAULT 0 CHECK (nama_score BETWEEN 0 AND 5),
    talent_category      TEXT DEFAULT 'solid',
    flight_risk          TEXT DEFAULT 'low' CHECK (flight_risk IN ('low','medium','high')),
    is_critical_position BOOLEAN DEFAULT false,
    successor_names      JSONB DEFAULT '[]',
    career_path          TEXT,
    next_role            TEXT,
    notes                TEXT,
    created_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at           TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_talent_updated_at ON public.talent_profiles;
CREATE TRIGGER trg_talent_updated_at
  BEFORE UPDATE ON public.talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── EMPLOYEE OKRs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_okrs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    quarter     TEXT,
    progress    INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    status      TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_okrs_updated_at ON public.employee_okrs;
CREATE TRIGGER trg_okrs_updated_at
  BEFORE UPDATE ON public.employee_okrs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ════════════════════════════════════════════════════════════
-- SECTION 5 — INTERN ONBOARDING
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.intern_onboarding (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id    UUID REFERENCES public.employees(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phase        TEXT DEFAULT 'pre' CHECK (phase IN ('pre','integration','evaluation','completed')),
    mentor_name  TEXT,
    mentor_email TEXT,
    checklist    JSONB DEFAULT '[]',
    objectives   JSONB DEFAULT '[]',
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_intern_onboarding_updated_at ON public.intern_onboarding;
CREATE TRIGGER trg_intern_onboarding_updated_at
  BEFORE UPDATE ON public.intern_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.intern_evaluations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id        UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    evaluation_type  TEXT DEFAULT 'weekly' CHECK (evaluation_type IN ('weekly','final','self')),
    week_number      INTEGER,
    evaluator_name   TEXT,
    amana_score      INTEGER DEFAULT 0 CHECK (amana_score BETWEEN 0 AND 5),
    itkan_score      INTEGER DEFAULT 0 CHECK (itkan_score BETWEEN 0 AND 5),
    iltizam_score    INTEGER DEFAULT 0 CHECK (iltizam_score BETWEEN 0 AND 5),
    ibdaa_score      INTEGER DEFAULT 0 CHECK (ibdaa_score BETWEEN 0 AND 5),
    nama_score       INTEGER DEFAULT 0 CHECK (nama_score BETWEEN 0 AND 5),
    comment          TEXT,
    created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ════════════════════════════════════════════════════════════
-- SECTION 6 — SKILLS & PDI
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    category    TEXT DEFAULT 'technique',
    description TEXT,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.employee_skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    skill_id    UUID REFERENCES public.skills(id) ON DELETE CASCADE,
    level       TEXT DEFAULT 'beginner',
    assessed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.pdi_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    title       TEXT NOT NULL,
    action_type TEXT DEFAULT 'formation',
    target_date DATE,
    status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_pdi_updated_at ON public.pdi_items;
CREATE TRIGGER trg_pdi_updated_at
  BEFORE UPDATE ON public.pdi_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ════════════════════════════════════════════════════════════
-- SECTION 7 — RECRUITMENT MODULE
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.recruitment_ads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poste       TEXT NOT NULL,
    description TEXT,
    competences TEXT,
    experience  TEXT,
    contenu     TEXT NOT NULL,
    image_url   TEXT,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_recruitment_ads_updated_at ON public.recruitment_ads;
CREATE TRIGGER trg_recruitment_ads_updated_at
  BEFORE UPDATE ON public.recruitment_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.interviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    recruiter_id UUID REFERENCES auth.users(id),
    date         DATE NOT NULL,
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    type         TEXT NOT NULL CHECK (type IN ('rh','technical','final')),
    status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','completed','cancelled')),
    meet_link    TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS trg_interviews_updated_at ON public.interviews;
CREATE TRIGGER trg_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.hr_slots (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date         DATE NOT NULL,
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    status       TEXT NOT NULL DEFAULT 'free'
                   CHECK (status IN ('free','reserved')),
    ad_id        UUID REFERENCES public.recruitment_ads(id) ON DELETE SET NULL,
    interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.candidate_applications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    ad_id      UUID REFERENCES public.recruitment_ads(id) ON DELETE CASCADE NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','screening','interview','accepted','rejected')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(profile_id, ad_id)
);

DROP TRIGGER IF EXISTS trg_candidate_applications_updated_at ON public.candidate_applications;
CREATE TRIGGER trg_candidate_applications_updated_at
  BEFORE UPDATE ON public.candidate_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ════════════════════════════════════════════════════════════
-- SECTION 8 — ORG CHART
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.orgchart_projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT NOT NULL DEFAULT '#0891b2',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orgchart_team_members (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES public.orgchart_projects(id) ON DELETE CASCADE,
    employee_id  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    role_in_team TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.orgchart_node_positions (
    employee_id UUID PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
    x           FLOAT NOT NULL DEFAULT 0,
    y           FLOAT NOT NULL DEFAULT 0
);

-- ════════════════════════════════════════════════════════════
-- SECTION 9 — INDEXES
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_employees_status        ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department    ON public.employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_contract_end  ON public.employees(contract_end);
CREATE INDEX IF NOT EXISTS idx_employees_manager       ON public.employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_emp      ON public.generated_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp      ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status   ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_balances_emp      ON public.leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_emp             ON public.payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_month       ON public.payroll_records(employee_id, month, year);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user         ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_requests_employee    ON public.hr_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_files_emp      ON public.employee_files(employee_id);
CREATE INDEX IF NOT EXISTS idx_cv_extractions_email    ON public.cv_extractions(email);
CREATE INDEX IF NOT EXISTS idx_profiles_type           ON public.profiles(type);
CREATE INDEX IF NOT EXISTS idx_assets_employee         ON public.assets(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_employee    ON public.performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_orgchart_members_proj   ON public.orgchart_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_orgchart_members_emp    ON public.orgchart_team_members(employee_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id   ON public.profiles(user_id);

-- ════════════════════════════════════════════════════════════
-- SECTION 10 — ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrolls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interns              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_extractions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_analyses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_onboarding  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_surveys        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_catalog     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_trainings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_okrs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_onboarding    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_evaluations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skills      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_ads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_slots             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgchart_projects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgchart_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgchart_node_positions ENABLE ROW LEVEL SECURITY;

-- Allow all access for authenticated users (service role bypasses RLS)
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'employees','profiles','user_roles','departments',
    'document_templates','generated_documents','documents',
    'leave_requests','leave_balances',
    'payroll_records','payrolls',
    'notifications','audit_logs','hr_requests',
    'interns','performance_reviews','performance_goals',
    'assets','cv_extractions','employee_files','employee_analyses',
    'holidays','document_requests',
    'employee_onboarding','pulse_surveys',
    'training_catalog','employee_trainings',
    'talent_profiles','employee_okrs',
    'intern_onboarding','intern_evaluations',
    'skills','employee_skills','pdi_items',
    'recruitment_ads','interviews','hr_slots','candidate_applications',
    'orgchart_projects','orgchart_team_members','orgchart_node_positions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "auth_all_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
        tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;

-- Public read for recruitment ads (visible to candidates without login)
DO $$
BEGIN
  BEGIN
    CREATE POLICY "ads_public_select" ON public.recruitment_ads FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "slots_public_select" ON public.hr_slots FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ════════════════════════════════════════════════════════════
-- SECTION 11 — AUTH TRIGGER: auto-create profile + role
-- ════════════════════════════════════════════════════════════

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

-- ════════════════════════════════════════════════════════════
-- SECTION 12 — SEED DATA: Moroccan Holidays
-- ════════════════════════════════════════════════════════════

INSERT INTO public.holidays (name, date) VALUES
('Manifeste de l''Indépendance',       '2024-01-11'),
('Fête du Travail',                    '2024-05-01'),
('Fête du Trône',                      '2024-07-30'),
('Allégeance Oued Eddahab',            '2024-08-14'),
('Révolution du Roi et du Peuple',     '2024-08-20'),
('Fête de la Jeunesse',                '2024-08-21'),
('Marche Verte',                       '2024-11-06'),
('Fête de l''Indépendance',            '2024-11-18')
ON CONFLICT (date) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- SECTION 13 — SEED DATA: Document Templates (TYTHON)
-- ════════════════════════════════════════════════════════════

DELETE FROM public.document_templates WHERE code IN (
  'attestation_poursuite_travail','attestation_travail',
  'attestation_poursuite_stage','contrat_cdi',
  'attestation_stage','charte_confidentialite'
);

INSERT INTO public.document_templates (code, name_fr, name_en, name_ar, category, body_template, variables, is_active) VALUES

('attestation_poursuite_travail',
 'Attestation de poursuite de travail',
 'Work Continuation Certificate',
 'شهادة استمرار العمل',
 'attestation',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;min-height:900px;">
  <div style="margin-bottom:50px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>
  <h1 style="text-align:center;font-size:20px;font-weight:bold;margin-bottom:50px;font-family:Arial,sans-serif;">Attestation de poursuite de travail</h1>
  <p style="font-weight:bold;margin-bottom:30px;font-size:13px;line-height:1.7;">La société : TYTHON ,Siège social : 55 Bd Zerktouni 1 ÉTAGE APPT N 03 Q H – Casablanca - Maroc RC : 553131 , ICE : 0003106377000035 , Affiliation CNSS : 4912448</p>
  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">Je soussignée, <strong>Madame ENNAJI Widad</strong>, Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, atteste que :</p>
  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;"><strong>M./Mme {{full_name}}</strong>, titulaire de la CIN n° <strong>{{cin}}</strong>, est employé(e) au sein de notre entreprise depuis le <strong>{{hire_date}}</strong> en qualité de <strong>{{position}}</strong>.</p>
  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">Nous confirmons que l'intéressé(e) est toujours en activité à ce jour au sein de notre société.</p>
  <p style="margin-bottom:50px;font-size:13px;line-height:1.8;">La présente attestation est délivrée pour servir et valoir ce que de droit.</p>
  <p style="font-weight:bold;font-size:13px;">Fait à Casablanca, le {{today}}</p>
  <div style="text-align:right;margin-top:70px;"><p style="font-weight:bold;font-size:13px;">Signature et cachet</p></div>
</div>$$,
ARRAY['full_name','cin','hire_date','position','today'], true),

('attestation_travail',
 'Attestation de travail',
 'Employment Certificate',
 'شهادة عمل',
 'attestation',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;min-height:900px;">
  <div style="margin-bottom:50px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>
  <h1 style="text-align:center;font-size:20px;font-weight:bold;margin-bottom:50px;font-family:Arial,sans-serif;">ATTESTATION DE TRAVAIL</h1>
  <p style="margin-bottom:30px;font-size:13px;line-height:1.8;">Je soussignée, <strong>Mme ENNAJI Widad</strong>, agissant en qualité de Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, atteste que :</p>
  <p style="margin-bottom:18px;font-size:14px;font-weight:bold;">M./Mme {{full_name}}</p>
  <p style="margin-bottom:25px;font-size:14px;font-weight:bold;">Titulaire de la CIN N° : {{cin}}</p>
  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">a occupé le poste de <strong>{{position}}</strong> au sein de notre entreprise du <strong>{{contract_start}}</strong> au <strong>{{contract_end}}</strong>.</p>
  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">Dans le cadre de ses fonctions, il a contribué activement aux missions qui lui ont été confiées et a fait preuve d'engagement, de rigueur et de professionnalisme.</p>
  <p style="margin-bottom:50px;font-size:13px;line-height:1.8;">La présente attestation est établie à sa demande pour toute fin utile.</p>
  <p style="font-weight:bold;font-size:13px;">Fait à Casablanca, le {{today}}</p>
  <div style="text-align:right;margin-top:70px;"><p style="font-weight:bold;font-size:13px;">Signature et cachet</p></div>
</div>$$,
ARRAY['full_name','cin','position','contract_start','contract_end','today'], true),

('attestation_poursuite_stage',
 'Attestation de poursuite de stage',
 'Internship Continuation Certificate',
 'شهادة استمرار التدريب',
 'attestation',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;min-height:900px;">
  <div style="margin-bottom:50px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>
  <h1 style="text-align:center;font-size:20px;font-weight:bold;margin-bottom:30px;font-family:Arial,sans-serif;">ATTESTATION DE POURSUITE DE STAGE</h1>
  <p style="font-weight:bold;margin-bottom:30px;font-size:13px;line-height:1.7;">La société : TYTHON Siège social : 55 Bd Zerktouni 1 ÉTAGE APPT N 03 Q H – Casablanca - Maroc RC : 553131 ICE : 0003106377000035 Affiliation CNSS : 4912448</p>
  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">Je soussignée, <strong>Madame ENNAJI Widad</strong>, Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, atteste que :</p>
  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;"><strong>M./Mme {{full_name}}</strong>, titulaire de la CIN n° <strong>{{cin}}</strong>, effectue actuellement un stage au sein de notre entreprise depuis le <strong>{{internship_start}}</strong>.</p>
  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">Nous confirmons par la présente que son stage se poursuit normalement jusqu'à la date prévue du <strong>{{internship_end}}</strong>, sauf modification ultérieure.</p>
  <p style="margin-bottom:50px;font-size:13px;line-height:1.8;">La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</p>
  <p style="font-weight:bold;font-size:13px;">Fait à Casablanca, le {{today}}</p>
  <div style="text-align:right;margin-top:70px;"><p style="font-weight:bold;font-size:13px;">Signature et cachet</p></div>
</div>$$,
ARRAY['full_name','cin','internship_start','internship_end','today'], true),

('attestation_stage',
 'Attestation de stage',
 'Internship Certificate',
 'شهادة التدريب',
 'attestation',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;min-height:900px;">
  <div style="margin-bottom:50px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>
  <h1 style="text-align:center;font-size:20px;font-weight:bold;margin-bottom:50px;font-family:Arial,sans-serif;">ATTESTATION DE STAGE</h1>
  <p style="margin-bottom:30px;font-size:13px;line-height:1.8;">Je soussignée, <strong>Madame ENNAJI Widad</strong>, Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, certifie que :</p>
  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;"><strong>M./Mme {{full_name}}</strong>, a effectué un stage au sein de notre entreprise <strong>TYTHON SARL</strong>, du <strong>{{internship_start}}</strong> au <strong>{{internship_end}}</strong>.</p>
  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">Durant cette période, il a été intégré à nos équipes dans le cadre de sa formation et a participé aux missions qui lui ont été confiées.</p>
  <p style="margin-bottom:50px;font-size:13px;line-height:1.8;">La présente attestation est délivrée à sa demande pour servir et valoir ce que de droit.</p>
  <p style="font-weight:bold;font-size:13px;">Fait à Casablanca, le {{today}}</p>
  <p style="margin-top:30px;font-weight:bold;font-size:13px;">TYTHON SARL<br/>Mme ENNAJI Widad<br/>Directrice des Ressources Humaines</p>
  <div style="text-align:right;margin-top:40px;"><p style="font-weight:bold;font-size:13px;">Signature et cachet</p></div>
</div>$$,
ARRAY['full_name','internship_start','internship_end','today'], true),

('contrat_cdi',
 'Contrat de travail (CDI)',
 'Permanent Employment Contract',
 'عقد عمل (عقد غير محدد المدة)',
 'contrat',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;">
  <div style="margin-bottom:50px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>
  <h1 style="text-align:center;font-size:20px;font-weight:bold;text-decoration:underline;margin-bottom:40px;font-family:Arial,sans-serif;">Contrat de travail (CDI)</h1>
  <p style="margin-bottom:20px;font-size:13px;">Entre les soussignés :</p>
  <p style="margin-bottom:6px;font-size:13px;line-height:1.8;">- La société : <strong>TYTHON</strong><br/>Siège social : 55 Bd Zerktouni 1 ÉTAGE APPT N 03 Q H – Casablanca - Maroc<br/>RC : 553131 &nbsp; ICE : 0003106377000035 &nbsp; Affiliation CNSS : 4912448<br/>Représentée par M. AZIZ Benslimane LAQSABI, agissant en qualité de PDG</p>
  <p style="margin:20px 0;font-size:13px;">D'une part,</p>
  <p style="margin-bottom:6px;font-size:13px;line-height:1.8;font-weight:bold;">Et : M./Mme {{full_name}}<br/><span style="font-weight:normal;">Demeurant à : {{address}}</span><br/>CIN N° : {{cin}}<br/>Libre de tout engagement,</p>
  <p style="margin:20px 0;font-size:13px;">D'autre part.</p>
  <p style="text-align:center;font-weight:bold;margin:25px 0;font-size:13px;">Il a été convenu ce qui suit :</p>
  <p style="font-weight:bold;text-align:center;margin:20px 0 8px;font-size:13px;">Article 1 – Engagement</p>
  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">Ce contrat prend effet à compter du <strong>{{hire_date}}</strong>.<br/>La déclaration préalable à l'embauche de <strong>M./Mme {{full_name}}</strong> a été remise à la CNSS de Casablanca.</p>
  <p style="font-weight:bold;text-align:center;margin:20px 0 8px;font-size:13px;">Article 2 – Période d'essai</p>
  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">Conformément aux dispositions du Code du travail en vigueur, le présent contrat est assorti d'une période d'essai. La durée de la période d'essai est fixée selon la catégorie professionnelle du salarié et peut être renouvelée une seule fois par accord écrit.</p>
  <p style="font-weight:bold;text-align:center;margin:20px 0 8px;font-size:13px;">Article 4 – Fonctions</p>
  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">En sa qualité de <strong>{{position}}</strong>.</p>
  <p style="font-weight:bold;text-align:center;margin:20px 0 8px;font-size:13px;">Article 6 – Horaire de travail</p>
  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;"><strong>M./Mme {{full_name}}</strong> est assujetti(e) à l'horaire de travail de l'établissement, une durée hebdomadaire de 44 heures, du lundi au vendredi.</p>
  <p style="font-weight:bold;text-align:center;margin:20px 0 8px;font-size:13px;">Article 7 – Rémunération</p>
  <p style="margin-bottom:30px;font-size:13px;line-height:1.8;">Le salaire mensuel net sera de <strong>{{salary}}</strong> et sera payé par virement bancaire.</p>
  <p style="font-weight:bold;font-size:13px;">Fait en double exemplaire à Casablanca, le {{today}}</p>
  <div style="display:flex;justify-content:space-between;margin-top:60px;">
    <div><p style="font-weight:bold;font-size:13px;">Signature du salarié</p><p style="font-size:13px;">M./Mme {{full_name}}</p></div>
    <div style="text-align:right;"><p style="font-weight:bold;font-size:13px;">Signature de l'employeur</p></div>
  </div>
</div>$$,
ARRAY['full_name','address','cin','hire_date','position','salary','today'], true),

('charte_confidentialite',
 'Charte de confidentialité',
 'Confidentiality Charter',
 'ميثاق السرية',
 'autre',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;">
  <div style="margin-bottom:40px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>
  <p style="font-weight:bold;font-size:13px;line-height:1.7;margin-bottom:6px;">TYTHON SARL &nbsp;|&nbsp; ICE : 003106377000035</p>
  <p style="font-size:12px;color:#6b7280;margin-bottom:30px;">55 BD ZERKTOUNI, ESPACE ZERKTOUNI, 1er Étage, Appt N°3, Quartier Hôpitaux, 20000 Casablanca</p>
  <h1 style="text-align:center;font-size:18px;font-weight:bold;text-decoration:underline;margin-bottom:30px;font-family:Arial,sans-serif;">CHARTE DE CONFIDENTIALITÉ</h1>
  <p style="margin-bottom:20px;font-size:13px;">Entre : <strong>TYTHON SARL</strong></p>
  <p style="margin-bottom:30px;font-size:13px;">Et : <strong>{{full_name}}</strong></p>
  <p style="font-weight:bold;margin:16px 0 6px;font-size:13px;">Article 1 - Objet</p>
  <p style="margin-bottom:16px;font-size:13px;line-height:1.7;">La présente charte a pour objet de définir les obligations de confidentialité applicables à <strong>{{full_name}}</strong> dans le cadre de son stage au sein de la Société.</p>
  <p style="font-weight:bold;margin:16px 0 6px;font-size:13px;">Article 2 - Informations confidentielles</p>
  <p style="margin-bottom:16px;font-size:13px;line-height:1.7;">Sont considérées comme informations confidentielles toutes données internes, techniques, commerciales, financières, RH, clients, codes sources et accès systèmes auxquels <strong>{{full_name}}</strong> pourrait avoir accès.</p>
  <p style="font-weight:bold;margin:16px 0 6px;font-size:13px;">Article 3 - Engagement de confidentialité</p>
  <p style="margin-bottom:16px;font-size:13px;line-height:1.7;"><strong>{{full_name}}</strong> s'engage à ne divulguer, transmettre ou communiquer aucune information confidentielle à des tiers et à respecter les règles de sécurité mises en place par la Société.</p>
  <p style="font-weight:bold;margin:16px 0 6px;font-size:13px;">Article 5 - Durée de l'engagement</p>
  <p style="margin-bottom:16px;font-size:13px;line-height:1.7;">Les obligations s'appliquent pendant toute la durée du stage (du <strong>{{internship_start}}</strong> au <strong>{{internship_end}}</strong>) et demeurent en vigueur après sa fin.</p>
  <p style="font-weight:bold;margin:16px 0 6px;font-size:13px;">Informations du stagiaire</p>
  <p style="font-size:13px;line-height:1.8;">Téléphone : {{phone}}<br/>Poste / Formation : {{position}}<br/>Début du stage : {{internship_start}}<br/>Fin du stage : {{internship_end}}</p>
  <p style="font-weight:bold;margin-top:30px;font-size:13px;">Fait à Casablanca, le {{today}}</p>
  <div style="display:flex;justify-content:space-between;margin-top:50px;">
    <div><p style="font-weight:bold;font-size:13px;">Signature de {{full_name}}</p></div>
    <div style="text-align:right;"><p style="font-weight:bold;font-size:13px;">Signature et cachet de la Société</p></div>
  </div>
</div>$$,
ARRAY['full_name','phone','position','internship_start','internship_end','today'], true);

-- ════════════════════════════════════════════════════════════
-- SECTION 14 — ADMIN USER SETUP
-- Change the email below to your Supabase account email.
-- Run AFTER creating your account in Supabase Auth.
-- ════════════════════════════════════════════════════════════

DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'amarrabeh1998@gmail.com');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'amarrabeh1998@gmail.com';

DELETE FROM public.profiles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'amarrabeh1998@gmail.com');

INSERT INTO public.profiles (user_id, full_name)
SELECT id, 'Ammar Abeh' FROM auth.users WHERE email = 'amarrabeh1998@gmail.com';

-- ════════════════════════════════════════════════════════════
-- DONE — Refresh PostgREST schema cache
-- ════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
