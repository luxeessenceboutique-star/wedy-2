-- ============================================================
-- YODABOT RH PLATFORM — Fix Document Uploads & Enums
-- ============================================================

-- 1. Add new types to the document_type enum
-- Note: We use DO block to avoid errors if values already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'document_type' AND e.enumlabel = 'cin') THEN
        ALTER TYPE document_type ADD VALUE 'cin';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'document_type' AND e.enumlabel = 'convention') THEN
        ALTER TYPE document_type ADD VALUE 'convention';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'document_type' AND e.enumlabel = 'nda') THEN
        ALTER TYPE document_type ADD VALUE 'nda';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'document_type' AND e.enumlabel = 'completion') THEN
        ALTER TYPE document_type ADD VALUE 'completion';
    END IF;
END
$$;

-- 2. Ensure documents table is flexible
-- Most of our tables use profile_id, but some entities like interns might not have a profile.
-- We can make profile_id nullable or add employee_id.
ALTER TABLE public.documents ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;

-- 3. If there's a check constraint on type, we might need to handle it, 
-- but usually the enum handles it.
