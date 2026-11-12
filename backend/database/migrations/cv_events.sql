-- Événements: CVs scanned at a job fair / forum, kept in a pool (« vivier ») and converted to candidates later.
-- Run once in the Supabase SQL editor (schema rh, like the other tables of the app).
CREATE TABLE IF NOT EXISTS rh.cv_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    event_date  date,
    location    text,
    notes       text,
    created_by  uuid,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rh.cv_prospects (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          uuid NOT NULL REFERENCES rh.cv_events(id) ON DELETE CASCADE,
    full_name         text,
    email             text,
    phone             text,
    city              text,
    headline          text,                                   -- current / target job title
    years_experience  numeric,                                -- estimated from the experience dates
    skills            jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [text]
    profile           jsonb NOT NULL DEFAULT '{}'::jsonb,     -- the full extraction: experience, education, languages, certifications, links, summary…
    file_name         text,
    file_path         text,                                   -- relative to the uploads folder
    file_size         integer,
    mime_type         text,
    status            text NOT NULL DEFAULT 'new',            -- new | shortlisted | rejected | converted
    rating            integer,                                -- 1..5
    notes             text,
    extraction        text NOT NULL DEFAULT 'ok',             -- ok | partial (no AI, text rules only) | failed
    extraction_error  text,
    duplicate_of      uuid,                                   -- the same person (same e-mail / phone) scanned before
    candidate_id      uuid,                                   -- the candidate (employees row) created from this CV
    created_by        uuid,
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cv_prospects_event  ON rh.cv_prospects (event_id);
CREATE INDEX IF NOT EXISTS idx_cv_prospects_email  ON rh.cv_prospects (lower(email));
CREATE INDEX IF NOT EXISTS idx_cv_prospects_status ON rh.cv_prospects (status);
ALTER TABLE rh.cv_events    ENABLE ROW LEVEL SECURITY;   -- the API uses the service role, which bypasses RLS
ALTER TABLE rh.cv_prospects ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
