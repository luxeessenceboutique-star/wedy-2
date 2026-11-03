-- Paramètres: the company profile, preferences, leave rules and document settings, one JSON
-- value per section (company | prefs | leave | docs | assets). Run once in the Supabase SQL editor.
CREATE TABLE IF NOT EXISTS rh.app_settings (
    key         text PRIMARY KEY,
    value       jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_by  uuid,
    updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rh.app_settings ENABLE ROW LEVEL SECURITY;   -- the API uses the service role, which bypasses RLS

NOTIFY pgrst, 'reload schema';
