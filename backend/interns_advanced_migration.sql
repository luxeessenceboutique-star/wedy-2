-- ============================================================
-- YODABOT RH PLATFORM — Interns Advanced Features
-- ============================================================

-- Add remuneration column to employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS remuneration DECIMAL(12,2) DEFAULT 0;

-- Ensure intern-specific metadata if needed
-- (Though school is already there)
