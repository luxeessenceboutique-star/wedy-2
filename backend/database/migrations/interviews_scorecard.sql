-- Entretiens: interview sheet (questions, notes, scores), synthesis and link to the meeting.
-- Run once in the Supabase SQL editor (schema rh, like the other tables of the app).
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS meeting_id     uuid;
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS interviewers   jsonb NOT NULL DEFAULT '[]'::jsonb;  -- [{ "employee_id": uuid|null, "name": text }]
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS scorecard      jsonb;                              -- sections / questions / criteria / notes
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS overall_score  integer;                            -- 0-100, weighted average of the criteria
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS recommendation text;                               -- strong_yes | yes | maybe | no
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS summary        text;
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS started_at     timestamptz;
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS ended_at       timestamptz;
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON rh.interviews (candidate_id);

NOTIFY pgrst, 'reload schema';
