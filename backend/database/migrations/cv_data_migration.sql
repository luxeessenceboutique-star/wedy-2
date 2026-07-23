-- ============================================================
-- YODABOT RH PLATFORM — CV Extraction Data Support
-- ============================================================

-- Add columns to employees to store CV data
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience_summary TEXT,
ADD COLUMN IF NOT EXISTS education_summary TEXT,
ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- If profiles is used for some info, sync them too
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
