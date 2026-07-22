-- Fix payroll_records columns to match backend expectations
-- Run this in Supabase SQL Editor

ALTER TABLE public.payroll_records
  ADD COLUMN IF NOT EXISTS cnss     NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ir       NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at  TIMESTAMPTZ;

-- Copy existing data from old column names if any rows exist
UPDATE public.payroll_records
SET
  cnss = COALESCE(cnss_deduction, 0),
  ir   = COALESCE(ir_deduction,   0)
WHERE cnss IS NULL OR cnss = 0;
