-- ═════════════════════════════════════════════════════════════════════════════
-- Persist the posted Roblox shop panel so its auto-refresh survives a bot restart.
--
-- The panel's live stock/countdown updater (central-bot panel.js) keeps its timer
-- in memory, so a bot restart stopped the refresh until an admin ran /panel again.
-- We record where the panel was posted (channel + message) per bot; on the next
-- boot the bot re-attaches the refresher to that message automatically.
--
-- Keyed by external_subject_id (the bot/subject) — one active panel per bot, like
-- shop.member_wallets. service_role owns it (the bot writes via the shop DATABASE_URL).
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shop.roblox_panels (
    external_subject_id TEXT        PRIMARY KEY,
    channel_id          TEXT        NOT NULL,
    message_id          TEXT        NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shop.roblox_panels ENABLE ROW LEVEL SECURITY;
GRANT ALL ON shop.roblox_panels TO service_role;
DROP POLICY IF EXISTS roblox_panels_service ON shop.roblox_panels;
CREATE POLICY roblox_panels_service ON shop.roblox_panels
    TO service_role USING (true) WITH CHECK (true);
