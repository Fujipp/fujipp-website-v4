-- Replace the admin-only /runtime monitor with a permanent customer-facing
-- expiry alert. Reuse the existing catalog id so old admin grants cannot leave
-- an orphan feature behind, then grant that same feature to every bot.

UPDATE billing.feature_catalog
SET code = 'runtime-expiry-alert',
    name = 'Runtime Expiry Alert',
    description = 'แจ้งเตือนก่อน Runtime หมดอายุผ่าน DM ห้อง Discord หรือทั้งสองช่องทาง พร้อมเลือกช่วงเวลาแจ้งเตือนได้',
    category = 'AUTOMATION',
    is_featured = FALSE,
    sort_order = 94,
    is_active = TRUE,
    updated_at = now()
WHERE code = 'runtime-monitor';

INSERT INTO billing.feature_catalog
  (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('runtime-expiry-alert',
   'Runtime Expiry Alert',
   'แจ้งเตือนก่อน Runtime หมดอายุผ่าน DM ห้อง Discord หรือทั้งสองช่องทาง พร้อมเลือกช่วงเวลาแจ้งเตือนได้',
   'AUTOMATION', FALSE, 94, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- The old trigger granted the monitor only to admin-owned bots.
DROP TRIGGER IF EXISTS trg_grant_runtime_monitor ON bots.bot_instances;
DROP FUNCTION IF EXISTS billing.grant_runtime_monitor_on_bot_create();

WITH feature AS (
  SELECT id FROM billing.feature_catalog WHERE code = 'runtime-expiry-alert'
)
INSERT INTO billing.feature_subscriptions
  (user_id, feature_id, scope, external_subject_id, billing_type, status, auto_renew)
SELECT bi.user_id, feature.id, 'BOT', bi.id::text, 'RENT_PERMANENT', 'ACTIVE', FALSE
FROM bots.bot_instances bi
CROSS JOIN feature
WHERE NOT EXISTS (
  SELECT 1
  FROM billing.feature_subscriptions fs
  WHERE fs.feature_id = feature.id
    AND fs.scope = 'BOT'
    AND fs.external_subject_id = bi.id::text
);

CREATE OR REPLACE FUNCTION billing.grant_runtime_expiry_alert_on_bot_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
DECLARE
  v_feature_id UUID;
BEGIN
  SELECT id INTO v_feature_id
  FROM billing.feature_catalog
  WHERE code = 'runtime-expiry-alert';

  IF v_feature_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO billing.feature_subscriptions
    (user_id, feature_id, scope, external_subject_id, billing_type, status, auto_renew)
  SELECT NEW.user_id, v_feature_id, 'BOT', NEW.id::text, 'RENT_PERMANENT', 'ACTIVE', FALSE
  WHERE NOT EXISTS (
    SELECT 1
    FROM billing.feature_subscriptions
    WHERE feature_id = v_feature_id
      AND scope = 'BOT'
      AND external_subject_id = NEW.id::text
  );

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_grant_runtime_expiry_alert ON bots.bot_instances;
CREATE TRIGGER trg_grant_runtime_expiry_alert
  AFTER INSERT ON bots.bot_instances
  FOR EACH ROW
  EXECUTE FUNCTION billing.grant_runtime_expiry_alert_on_bot_create();

-- Dynamic config fields render automatically in the existing bot config page.
WITH feature AS (
  SELECT id FROM billing.feature_catalog WHERE code = 'runtime-expiry-alert'
)
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required,
   is_sensitive, default_value, options, sort_order)
SELECT feature.id, field.variable_key, field.label, field.description,
       field.value_type, field.is_required, FALSE, field.default_value,
       field.options, field.sort_order
FROM feature
CROSS JOIN (VALUES
  ('RUNTIME_ALERT_DELIVERY', 'ช่องทางแจ้งเตือน',
   'เลือกส่งทาง DM ห้อง Discord ทั้งสองช่องทาง หรือปิดการแจ้งเตือน',
   'ENUM', TRUE, 'BOTH',
   '[{"value":"DM","label":"DM ส่วนตัว"},{"value":"CHANNEL","label":"ห้อง Discord Server"},{"value":"BOTH","label":"DM และห้อง Discord"},{"value":"DISABLED","label":"ปิดการแจ้งเตือน"}]'::jsonb, 10),
  ('RUNTIME_ALERT_DM_USER_ID', 'ผู้รับ DM',
   'Discord User ID ของลูกค้าที่ต้องการรับข้อความส่วนตัว',
   'USER_ID', FALSE, NULL, NULL::jsonb, 20),
  ('RUNTIME_ALERT_CHANNEL_ID', 'ห้องแจ้งเตือน Runtime',
   'ห้องข้อความใน Server ที่ต้องการรับ Embed แจ้งเตือน',
   'CHANNEL_ID', FALSE, NULL, NULL::jsonb, 30),
  ('RUNTIME_ALERT_7D', 'แจ้งก่อน 7 วัน', 'ส่งเมื่อเหลือเวลา 7 วัน',
   'BOOLEAN', TRUE, 'true', NULL::jsonb, 40),
  ('RUNTIME_ALERT_3D', 'แจ้งก่อน 3 วัน', 'ส่งเมื่อเหลือเวลา 3 วัน',
   'BOOLEAN', TRUE, 'true', NULL::jsonb, 50),
  ('RUNTIME_ALERT_1D', 'แจ้งก่อน 1 วัน', 'ส่งเมื่อเหลือเวลา 1 วัน',
   'BOOLEAN', TRUE, 'true', NULL::jsonb, 60),
  ('RUNTIME_ALERT_1H', 'แจ้งก่อน 1 ชั่วโมง', 'ส่งเมื่อเหลือเวลา 1 ชั่วโมง',
   'BOOLEAN', TRUE, 'true', NULL::jsonb, 70)
) AS field(variable_key, label, description, value_type, is_required,
           default_value, options, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type,
  is_required = EXCLUDED.is_required,
  is_sensitive = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  options = EXCLUDED.options,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS billing.runtime_expiry_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_subject_id TEXT NOT NULL,
  runtime_subscription_id UUID NOT NULL
    REFERENCES billing.runtime_subscriptions(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL CHECK (milestone IN ('7D', '3D', '1D', '1H')),
  destination TEXT NOT NULL CHECK (destination IN ('DM', 'CHANNEL')),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT runtime_expiry_notifications_once
    UNIQUE (runtime_subscription_id, milestone, destination)
);

CREATE INDEX IF NOT EXISTS idx_runtime_expiry_notifications_subject
  ON billing.runtime_expiry_notifications (external_subject_id, delivered_at DESC);

ALTER TABLE billing.runtime_expiry_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON billing.runtime_expiry_notifications FROM anon, authenticated;
