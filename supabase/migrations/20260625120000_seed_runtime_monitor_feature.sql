-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: runtime-monitor feature — an admin-only /runtime command that lists every
-- bot instance on the platform with owner, avatar, and status.
--
-- Not for sale: it exposes every customer's bot + owner, so it is granted ONLY to
-- bots owned by a platform admin (public.profiles.role = 'ADMIN'). Inside Discord
-- the command itself re-checks AUTHORIZED_USER_IDS, so the entitlement just decides
-- which bot loads the command — the operator is the second gate.
--
-- Like auto_grant_bot_presence we (1) backfill ACTIVE permanent feature_subscriptions
-- for existing admin-owned bots, and (2) add an AFTER INSERT trigger so a new bot
-- created by an admin gets the same grant. Both guard with NOT EXISTS (idempotent).
-- RUNNING bots only load /runtime after their next restart (features = env at start).
-- No JSON is concatenated here (see migration-jsonb-dollar-quote note).
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. Catalog row (idempotent) ─────────────────────────────────────────────
INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('runtime-monitor',
   'Runtime Monitor',
   'คำสั่ง /runtime สำหรับผู้ดูแลแพลตฟอร์ม — แสดงสถานะของทุกบอทในระบบ พร้อมเจ้าของและรูปบอท. ใช้ได้เฉพาะผู้ที่อยู่ใน AUTHORIZED_USER_IDS เท่านั้น.',
   'ADMIN', FALSE, 95, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── 2. Backfill existing admin-owned bots ───────────────────────────────────
INSERT INTO billing.feature_subscriptions
  (user_id, feature_id, scope, external_subject_id, billing_type, status, auto_renew)
SELECT bi.user_id, fc.id, 'BOT', bi.id::text, 'RENT_PERMANENT', 'ACTIVE', FALSE
FROM bots.bot_instances bi
JOIN public.profiles pr ON pr.id = bi.user_id AND pr.role = 'ADMIN'
CROSS JOIN billing.feature_catalog fc
WHERE fc.code = 'runtime-monitor'
  AND NOT EXISTS (
    SELECT 1 FROM billing.feature_subscriptions fs
    WHERE fs.feature_id = fc.id
      AND fs.scope = 'BOT'
      AND fs.external_subject_id = bi.id::text
  );


-- ─── 3. Auto-grant on every future admin-owned bot ───────────────────────────
CREATE OR REPLACE FUNCTION billing.grant_runtime_monitor_on_bot_create()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_feature_id UUID;
  v_is_admin   BOOLEAN;
BEGIN
  SELECT (role = 'ADMIN') INTO v_is_admin
    FROM public.profiles
   WHERE id = NEW.user_id;

  -- Only admin-owned bots get the monitor.
  IF v_is_admin IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_feature_id
    FROM billing.feature_catalog
   WHERE code = 'runtime-monitor';

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

DROP TRIGGER IF EXISTS trg_grant_runtime_monitor ON bots.bot_instances;
CREATE TRIGGER trg_grant_runtime_monitor
  AFTER INSERT ON bots.bot_instances
  FOR EACH ROW
  EXECUTE FUNCTION billing.grant_runtime_monitor_on_bot_create();
