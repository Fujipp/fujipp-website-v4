-- ═════════════════════════════════════════════════════════════════════════════
-- Bot Registry (subject registry)
--
-- The "subject" half of the platform: one row = one customer bot = the
-- external_subject_id that billing.runtime_subscriptions / feature_subscriptions
-- / feature_config_values point at. Billing stays decoupled (it keys on a TEXT
-- subject id with no FK), so this lives in its OWN schema `bots`, not billing.
--
-- A user (public.profiles) owns MANY bots (many-to-one). Each bot carries the
-- customer's Discord credentials. Those are SECRETS:
--   discord_token_cipher holds AES-256-GCM ciphertext, never plaintext.
--   Envelope format (app-level):  v1.<base64 iv>.<base64 authTag>.<base64 ciphertext>
--   The key lives in the runtime/orchestrator env (BOT_SECRET_KEY), never in the DB.
--   Per-feature secrets (Roblox cookie/TOTP, SlipOK key) are encrypted the same way
--   and stored in billing.feature_config_values (is_secret = TRUE) — no schema change there.
--
-- Access model: backend / orchestrator reach this via JDBC as service_role only.
-- Schema is NOT exposed to the Supabase Data API; RLS is defense-in-depth.
--
-- Depends on: public.set_updated_at(), public.profiles
-- ═════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS bots;
GRANT USAGE ON SCHEMA bots TO service_role;


CREATE TABLE IF NOT EXISTS bots.bot_instances (
    id                     UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id                UUID        NOT NULL,
    name                   TEXT        NOT NULL,
    discord_application_id TEXT,
    discord_guild_id       TEXT,
    discord_token_cipher   TEXT,                 -- AES-256-GCM envelope (see header); NULL until provided
    status                 TEXT        NOT NULL DEFAULT 'CREATED',
    last_started_at        TIMESTAMPTZ,
    last_stopped_at        TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bot_instances_pkey         PRIMARY KEY (id),
    CONSTRAINT bot_instances_user_name_key UNIQUE (user_id, name),
    CONSTRAINT bot_instances_user_fkey    FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT bot_instances_status_chk   CHECK (status IN
        ('CREATED','READY','RUNNING','STOPPED','SUSPENDED','CRASHED'))
);
CREATE INDEX IF NOT EXISTS idx_bot_instances_user ON bots.bot_instances (user_id);
CREATE INDEX IF NOT EXISTS idx_bot_instances_status ON bots.bot_instances (status);


-- updated_at trigger (reuse public.set_updated_at())
CREATE OR REPLACE TRIGGER bot_instances_set_updated_at
    BEFORE UPDATE ON bots.bot_instances
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ═════════════════════════════════════════════════════════════════════════════
-- Row Level Security — defense in depth. Schema is NOT exposed to the Data API;
-- only service_role (backend / orchestrator JDBC) gets in.
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE bots.bot_instances ENABLE ROW LEVEL SECURITY;
GRANT ALL ON bots.bot_instances TO service_role;

DROP POLICY IF EXISTS bot_instances_service_all ON bots.bot_instances;
CREATE POLICY bot_instances_service_all ON bots.bot_instances
    TO service_role USING (true) WITH CHECK (true);
