-- interviews.candidate_id pointed to profiles(id), but Wedy's candidates are rows of employees (status = 'candidate').
-- Scheduling an interview (HR or the careers page) failed with:
--   insert or update on table "interviews" violates foreign key constraint "interviews_candidate_id_fkey"
-- The key now points to rh.employees. NOT VALID: older rows are not re-checked, new ones are.
-- Safe to run again. Run once in the Supabase SQL editor.
ALTER TABLE rh.interviews DROP CONSTRAINT IF EXISTS interviews_candidate_id_fkey;
ALTER TABLE rh.interviews
  ADD CONSTRAINT interviews_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES rh.employees(id) ON DELETE CASCADE NOT VALID;

NOTIFY pgrst, 'reload schema';
