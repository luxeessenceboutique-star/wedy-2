-- Interview e-mails (invitation when scheduled, reminder with the link 15 min before) and direct publishing of job
-- posts on LinkedIn / Facebook / Instagram. Run once in the Supabase SQL editor (schema rh, like the other tables).

-- ── interviews: what was sent to the candidate ───────────────────────────────────────────────────────────
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS invite_sent_at   timestamptz;  -- invitation e-mail
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;  -- e-mail with the link, 15 min before
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS email_error      text;         -- last sending error, shown to HR
ALTER TABLE rh.interviews ADD COLUMN IF NOT EXISTS public_base_url  text;         -- https://… of Wedy when it was planned (links in the e-mails)

-- ── the company's social accounts, connected once by an admin ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rh.social_accounts (
    provider            text PRIMARY KEY,                      -- linkedin | meta
    account_id          text,                                  -- the LinkedIn organization / the Facebook page used to publish
    account_name        text,
    ig_user_id          text,                                  -- Instagram business account linked to the page (meta)
    ig_username         text,
    choices             jsonb NOT NULL DEFAULT '[]'::jsonb,    -- pages / organizations the admin can choose from
    access_token_enc    text,                                  -- encrypted with the API's SECRET_KEY, never sent to the browser
    refresh_token_enc   text,
    expires_at          timestamptz,
    refresh_expires_at  timestamptz,
    connected_by        uuid,
    connected_by_name   text,
    connected_at        timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── what was published, where ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rh.social_posts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id       uuid,
    network     text NOT NULL,                                 -- linkedin | facebook | instagram
    ok          boolean NOT NULL,
    post_id     text,
    post_url    text,
    error       text,
    posted_by   uuid,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_posts_ad_idx ON rh.social_posts (ad_id, created_at DESC);

ALTER TABLE rh.social_accounts ENABLE ROW LEVEL SECURITY;  -- the API uses the service role; nobody reads the tokens directly
ALTER TABLE rh.social_posts ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
