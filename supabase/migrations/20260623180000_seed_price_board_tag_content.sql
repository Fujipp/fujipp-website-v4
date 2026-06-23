-- ═════════════════════════════════════════════════════════════════════════════
-- Seed the per-category tag line (message `content`) for the Price Board.
--
-- The legacy bot replied to a category button PUBLICLY with a content line above the
-- embed that tagged the clicker, e.g. "<:KN_ROLE_01:…> : @member". The platform's
-- central-bot now renders `default_json.content` (with {{member}} → the clicker's
-- mention) as the message text. This backfills that field into the price_cat1..8 slots
-- seeded by 20260623170000 so a category click reproduces the legacy tag line.
--
-- The content field is editable per category in the Embed Designer. Idempotent: only
-- sets content where a slot doesn't already carry one (won't clobber an edited seed).
-- Touches bots.embed_slots.default_json only — per-bot overrides (bots.bot_embeds) are
-- untouched. jsonb_build_object keeps the JSON valid without ||-concatenation.
-- ═════════════════════════════════════════════════════════════════════════════

UPDATE bots.embed_slots
SET default_json = default_json
  || jsonb_build_object('content', '<:KN_ROLE_01:1464919795953827900> : {{member}}')
WHERE feature_code = 'price-board'
  AND slot_key LIKE 'price_cat%'
  AND (default_json -> 'content') IS NULL;
