-- ═════════════════════════════════════════════════════════════════════════════
-- Bot-level config (layer 1): extra Discord application credentials.
--
-- Stored on the bot registry (NOT mixed with per-feature config). Client ID equals
-- the Discord Application ID, so discord_application_id already covers it.
--   discord_public_key            — for verifying interaction webhooks (not secret)
--   discord_client_secret_cipher  — OAuth2 client secret, AES-256-GCM encrypted
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE bots.bot_instances
    ADD COLUMN IF NOT EXISTS discord_public_key           TEXT,
    ADD COLUMN IF NOT EXISTS discord_client_secret_cipher TEXT;
