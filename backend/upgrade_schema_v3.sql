-- ============================================================
-- YODABOT RH PLATFORM — Schema Upgrade v3 (Production)
-- ============================================================

-- 1. ASSETS MANAGEMENT
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT, -- 'laptop', 'phone', 'badge', 'vehicle', etc.
    serial_number TEXT UNIQUE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'available', -- 'available', 'assigned', 'broken', 'maintenance'
    assigned_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. HIERARCHY (Add manager to employees)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='manager_id') THEN
        ALTER TABLE public.employees ADD COLUMN manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. ENHANCE PERFORMANCE REVIEWS (If not already perfect)
CREATE TABLE IF NOT EXISTS public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.auth.users(id),
    period TEXT NOT NULL, -- e.g. '2026-H1'
    score INTEGER CHECK (score BETWEEN 1 AND 5),
    feedback TEXT,
    objectives TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'finalized'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. ENHANCE NOTIFICATIONS (Ensure link and category)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='link') THEN
        ALTER TABLE public.notifications ADD COLUMN link TEXT;
    END IF;
END $$;

-- 5. TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_performance_updated_at ON public.performance_reviews;
CREATE TRIGGER trg_performance_updated_at BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_assets_employee ON public.assets(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_employee ON public.performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON public.employees(manager_id);
