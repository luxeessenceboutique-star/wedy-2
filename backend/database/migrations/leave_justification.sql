-- Absences page: free-text justification for an absence (typically an unjustified one, justified afterwards).
-- Additive and nullable: safe to run several times.
ALTER TABLE rh.leave_requests
  ADD COLUMN IF NOT EXISTS justification text;

NOTIFY pgrst, 'reload schema';
