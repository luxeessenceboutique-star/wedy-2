-- ── FIX PROFILES TABLE ──────────────────────────────────────────
-- Add missing columns to profiles to support recruitment module

DO $$ 
BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS type text DEFAULT 'candidate';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cin text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Update existing profiles (likely admin/hr) to type 'employee' if they are linked to employees
UPDATE public.profiles p
SET type = 'employee'
WHERE EXISTS (SELECT 1 FROM public.employees e WHERE e.id = p.id OR e.email = p.email);

-- Ensure index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_type ON public.profiles(type);
