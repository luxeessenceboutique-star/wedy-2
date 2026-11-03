-- Réunions: meetings planned by HR, with their agenda, preparation notes and minutes.
-- Run once in the Supabase SQL editor (schema rh, like the other tables of the app).
CREATE TABLE IF NOT EXISTS rh.meetings (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title         text NOT NULL,
    kind          text NOT NULL DEFAULT 'meet',          -- meet | onb | int | train | review
    starts_at     timestamptz NOT NULL,
    duration_min  integer NOT NULL DEFAULT 60,
    place         text,
    visio_url     text,
    participants  jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{ "employee_id": uuid|null, "name": text }]
    agenda        jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{ "t": text, "done": bool, "ai": bool }]
    prep_notes    text,
    summary       text,
    decisions     jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [text]
    actions       jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{ "t": text, "owner": text, "due": text, "done": bool }]
    created_by    uuid,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meetings_starts_at ON rh.meetings (starts_at);
ALTER TABLE rh.meetings ENABLE ROW LEVEL SECURITY;   -- the API uses the service role, which bypasses RLS

NOTIFY pgrst, 'reload schema';
