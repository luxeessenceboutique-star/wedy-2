-- ============================================================
-- YODABOT RH PLATFORM — Constraint & Schema Fixes
-- ============================================================

-- 1. FIX AUDIT LOGS -> PROFILES RELATIONSHIP
-- To join audit_logs and profiles on user_id, we need a foreign key.
-- Note: audit_logs.user_id should match profiles.user_id (the auth.users.id)
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs 
    ADD CONSTRAINT audit_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- 2. ENSURE LEAVE TABLES EXIST
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id    UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    year           INTEGER NOT NULL,
    annual_total   INTEGER DEFAULT 21,
    annual_used    INTEGER DEFAULT 0,
    sick_total     INTEGER DEFAULT 12,
    sick_used      INTEGER DEFAULT 0,
    personal_total INTEGER DEFAULT 5,
    personal_used  INTEGER DEFAULT 0,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(employee_id, year)
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    days        INTEGER NOT NULL,
    reason      TEXT,
    status      TEXT DEFAULT 'pending',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. ENSURE HR_REQUESTS TABLE EXISTS (for analytics)
CREATE TABLE IF NOT EXISTS public.hr_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    status      TEXT DEFAULT 'pending',
    description TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. ENSURE PERFORMANCE_REVIEWS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.performance_reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    reviewer_id   UUID REFERENCES auth.users(id),
    period        TEXT NOT NULL,
    score         INTEGER CHECK (score BETWEEN 1 AND 5),
    feedback      TEXT,
    objectives    TEXT,
    status        TEXT DEFAULT 'draft',
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. RELOAD SCHEMA CACHE HINT
-- Sometimes Supabase needs a moment to refresh the schema cache after DDL.
-- You can run: NOTIFY pgrst, 'reload schema';
