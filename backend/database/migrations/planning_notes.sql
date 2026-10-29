-- Planning RH: notes attached to a day of the calendar (shared by the HR team).
CREATE TABLE IF NOT EXISTS rh.planning_notes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    note_date       date NOT NULL,
    content         text NOT NULL,
    created_by      uuid,
    created_by_name text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planning_notes_date ON rh.planning_notes (note_date);
ALTER TABLE rh.planning_notes ENABLE ROW LEVEL SECURITY;   -- the API uses the service role, which bypasses RLS

NOTIFY pgrst, 'reload schema';
