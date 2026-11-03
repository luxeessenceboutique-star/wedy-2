-- Intégrations: outgoing webhooks (generic JSON, Slack or Teams incoming webhooks).
-- Run once in the Supabase SQL editor. Safe to re-run; adds the columns if the table already exists.
CREATE TABLE IF NOT EXISTS rh.webhooks (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    url           text NOT NULL,
    events        text[] NOT NULL DEFAULT '{}',
    active        boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rh.webhooks ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'json';      -- json | slack | teams
ALTER TABLE rh.webhooks ADD COLUMN IF NOT EXISTS secret text;                             -- HMAC-SHA256 signature key (json)
ALTER TABLE rh.webhooks ADD COLUMN IF NOT EXISTS last_status integer;                     -- HTTP status of the last delivery (0 = unreachable)
ALTER TABLE rh.webhooks ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;
ALTER TABLE rh.webhooks ENABLE ROW LEVEL SECURITY;   -- the API uses the service role, which bypasses RLS

NOTIFY pgrst, 'reload schema';
