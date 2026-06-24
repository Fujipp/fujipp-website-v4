-- ═════════════════════════════════════════════════════════════════════════════
-- Give every bot the Bot Presence add-on automatically — free, for all bots.
--
-- bot-presence is a built-in (not-for-sale) add-on, so instead of granting it
-- per bot by hand we:
--   1. backfill a permanent ACTIVE feature_subscription for every existing bot, and
--   2. add an AFTER INSERT trigger on bots.bot_instances so every newly created bot
--      gets the same grant.
--
-- The subscription is scope=BOT, billing_type=RENT_PERMANENT, no price, no expiry —
-- it never renews or lapses, it simply entitles the bot to configure its presence.
-- Both steps guard with NOT EXISTS so re-running can't create duplicates. Existing
-- RUNNING bots only start showing the presence after their next restart (config is
-- injected as env at start), but the config form is available immediately.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. Backfill existing bots ───────────────────────────────────────────────
INSERT INTO billing.feature_subscriptions
  (user_id, feature_id, scope, external_subject_id, billing_type, status, auto_renew)
SELECT bi.user_id, fc.id, 'BOT', bi.id::text, 'RENT_PERMANENT', 'ACTIVE', FALSE
FROM bots.bot_instances bi
CROSS JOIN billing.feature_catalog fc
WHERE fc.code = 'bot-presence'
  AND NOT EXISTS (
    SELECT 1 FROM billing.feature_subscriptions fs
    WHERE fs.feature_id = fc.id
      AND fs.scope = 'BOT'
      AND fs.external_subject_id = bi.id::text
  );


-- ─── 2. Auto-grant on every future bot ───────────────────────────────────────
CREATE OR REPLACE FUNCTION billing.grant_bot_presence_on_bot_create()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_feature_id UUID;
BEGIN
  SELECT id INTO v_feature_id
    FROM billing.feature_catalog
   WHERE code = 'bot-presence';

  -- Feature not seeded (shouldn't happen) → leave the bot insert untouched.
  IF v_feature_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO billing.feature_subscriptions
    (user_id, feature_id, scope, external_subject_id, billing_type, status, auto_renew)
  SELECT NEW.user_id, v_feature_id, 'BOT', NEW.id::text, 'RENT_PERMANENT', 'ACTIVE', FALSE
  WHERE NOT EXISTS (
    SELECT 1 FROM billing.feature_subscriptions fs
    WHERE fs.feature_id = v_feature_id
      AND fs.scope = 'BOT'
      AND fs.external_subject_id = NEW.id::text
  );

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_grant_bot_presence ON bots.bot_instances;
CREATE TRIGGER trg_grant_bot_presence
  AFTER INSERT ON bots.bot_instances
  FOR EACH ROW
  EXECUTE FUNCTION billing.grant_bot_presence_on_bot_create();
