-- ============================================================
-- YODABOT RH PLATFORM — Notifications & Payroll Schema
-- ============================================================

-- 1. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    type        TEXT DEFAULT 'info', -- info, success, warning, danger
    is_read     BOOLEAN DEFAULT FALSE,
    link        TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. PAYROLL (BULLETINS DE PAIE)
CREATE TABLE IF NOT EXISTS public.payrolls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    month           INTEGER NOT NULL,
    year            INTEGER NOT NULL,
    base_salary     DECIMAL(12,2),
    allowances      DECIMAL(12,2) DEFAULT 0,
    deductions      DECIMAL(12,2) DEFAULT 0,
    net_salary      DECIMAL(12,2),
    status          TEXT DEFAULT 'draft', -- draft, paid
    pdf_url         TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(employee_id, month, year)
);

-- 3. Jours fériés (Maroc)
CREATE TABLE IF NOT EXISTS public.holidays (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    date        DATE NOT NULL UNIQUE,
    is_recurring BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertion de quelques jours fériés marocains standards
INSERT INTO public.holidays (name, date) VALUES 
('Manifeste de l''Indépendance', '2024-01-11'),
('Fête du Travail', '2024-05-01'),
('Fête du Trône', '2024-07-30'),
('Allégeance Oued Eddahab', '2024-08-14'),
('Révolution du Roi et du Peuple', '2024-08-20'),
('Fête de la Jeunesse', '2024-08-21'),
('Marche Verte', '2024-11-06'),
('Fête de l''Indépendance', '2024-11-18')
ON CONFLICT (date) DO NOTHING;
