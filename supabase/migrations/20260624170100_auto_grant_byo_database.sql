-- ═════════════════════════════════════════════════════════════════════════════
-- Give every bot the BYO-Database add-on automatically — free, for all bots.
--
-- byo-database is a built-in (not-for-sale) config-only add-on, so instead of
-- granting it per bot by hand we:
--   1. backfill a permanent ACTIVE feature_subscription for every existing bot, and
--   2. add an AFTER INSERT trigger on bots.bot_instances so every newly created bot
--      gets the same grant.
--
-- Mirrors 20260624140000_auto_grant_bot_presence.sql. The subscription is scope=BOT,
-- billing_type=RENT_PERMANENT, no price, no expiry — it never renews or lapses, it
-- simply makes the "use your own database" config form available. Both steps guard
-- with NOT EXISTS so re-running can't create duplicates.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. Backfill existing bots ───────────────────────────────────────────────
INSERT INTO billing.feature_subscriptions
  (user_id, feature_id, scope, external_subject_id, billing_type, status, auto_renew)
SELECT bi.user_id, fc.id, 'BOT', bi.id::text, 'RENT_PERMANENT', 'ACTIVE', FALSE
FROM bots.bot_instances bi
CROSS JOIN billing.feature_catalog fc
WHERE fc.code = 'byo-database'
  AND NOT EXISTS (
    SELECT 1 FROM billing.feature_subscriptions fs
    WHERE fs.feature_id = fc.id
      AND fs.scope = 'BOT'
      AND fs.external_subject_id = bi.id::text
  );


-- ─── 2. Auto-grant on every future bot ───────────────────────────────────────
CREATE OR REPLACE FUNCTION billing.grant_byo_database_on_bot_create()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_feature_id UUID;
BEGIN
  SELECT id INTO v_feature_id
    FROM billing.feature_catalog
   WHERE code = 'byo-database';

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

DROP TRIGGER IF EXISTS trg_grant_byo_database ON bots.bot_instances;
CREATE TRIGGER trg_grant_byo_database
  AFTER INSERT ON bots.bot_instances
  FOR EACH ROW
  EXECUTE FUNCTION billing.grant_byo_database_on_bot_create();
