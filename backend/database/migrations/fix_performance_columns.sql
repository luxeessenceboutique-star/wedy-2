-- Fix performance_reviews missing columns
-- Run this in Supabase SQL Editor

ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS period      TEXT,
  ADD COLUMN IF NOT EXISTS score       INTEGER CHECK (score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS feedback    TEXT,
  ADD COLUMN IF NOT EXISTS objectives  TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- Backfill status for existing rows
UPDATE public.performance_reviews
SET status = 'draft'
WHERE status IS NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
