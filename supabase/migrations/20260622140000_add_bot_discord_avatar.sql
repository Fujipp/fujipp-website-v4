-- ═════════════════════════════════════════════════════════════════════════════
-- Add discord_avatar_url to bots.bot_instances.
--
-- The Shop dashboard's Bot card shows the bot's real Discord avatar. Discord only
-- serves the avatar via an authenticated API call (GET /users/@me with the bot
-- token) — it can't be derived from the application id — so the backend fetches it
-- once (on create / token update) and caches the resolved CDN URL here. Best-effort:
-- a null value just means the card falls back to its placeholder.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE bots.bot_instances
    ADD COLUMN IF NOT EXISTS discord_avatar_url TEXT;
