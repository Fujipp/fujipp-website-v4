-- ═════════════════════════════════════════════════════════════════════════════
-- Move the "use your own database" choice INTO the member-spending feature, and
-- retire the standalone byo-database add-on.
--
-- Originally byo-database was a separate per-bot add-on (PR #145). That added an extra
-- entry to every bot's feature list, which was noisy. Since billing.feature_config_values
-- is unique per (subject, feature_id, config_key), the DB choice can live directly on the
-- feature that needs it. Only member-spending (manual /topup top-up tracker) keeps its
-- data in a customer-selectable database; order-management now always uses our database.
--
-- This migration:
--   1. removes the byo-database feature (grants, config values, trigger, templates, row)
--   2. adds the DB toggle to member-spending (SPENDING_DB_USE_OWN + SPENDING_DB_URL)
--   3. renames member-spending to reflect that it records top-up amount AND count by hand
-- Idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. Retire byo-database ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_grant_byo_database ON bots.bot_instances;
DROP FUNCTION IF EXISTS billing.grant_byo_database_on_bot_create();

-- Remove dependents first (feature_subscriptions FK is ON DELETE RESTRICT), then the
-- catalog row (config_values + templates cascade on delete).
DELETE FROM billing.feature_config_values
 WHERE feature_id IN (SELECT id FROM billing.feature_catalog WHERE code = 'byo-database');
DELETE FROM billing.feature_subscriptions
 WHERE feature_id IN (SELECT id FROM billing.feature_catalog WHERE code = 'byo-database');
DELETE FROM billing.feature_catalog WHERE code = 'byo-database';


-- ─── 2. Add the DB toggle to member-spending ─────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'member-spending')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('SPENDING_DB_USE_OWN', 'ใช้ฐานข้อมูลของตัวเอง', 'เปิดเพื่อเก็บข้อมูลยอดเติม/จำนวนครั้งลงฐานข้อมูลของร้านเองแทนฐานข้อมูลของเรา (ต้องกรอก Connection URL ด้านล่างด้วย)'::text, 'BOOLEAN', FALSE, FALSE, 'false', 70),
  ('SPENDING_DB_URL',     'Connection URL',        'connection string ของ Postgres/Neon (เช่น postgresql://user:pass@host/db?sslmode=require) — เก็บแบบเข้ารหัส ใช้เมื่อเปิด “ใช้ฐานข้อมูลของตัวเอง”. บอทจะสร้างตารางที่ต้องใช้ให้อัตโนมัติ', 'SECRET', FALSE, TRUE, NULL::text, 80)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;


-- ─── 3. Rename member-spending ───────────────────────────────────────────────
UPDATE billing.feature_catalog SET
  name = 'บันทึกยอดเติม (กรอกเอง)',
  description = 'ระบบบันทึกยอดเติมเงินและจำนวนครั้งแบบกรอกเอง — แอดมินบันทึกยอดที่ลูกค้าเติมผ่าน '
   || '/topup add บอทจะโพสต์ “บัตรสมาชิกร้าน” (แก้หน้าตาได้ใน Embed Designer) เก็บยอดสะสม+จำนวนครั้ง '
   || 'ต่อคน แจกยศแรกเริ่มและยศอัปเกรดเมื่อถึงเกณฑ์ พร้อมจัดอันดับ Top1/Top5 อัตโนมัติ. เลือกเก็บข้อมูล '
   || 'ในฐานข้อมูลของเราหรือฐานข้อมูลของร้านเองก็ได้. เป็นคนละระบบกับการเติมเงินอัตโนมัติ — ยอดกรอกเอง.'
WHERE code = 'member-spending';
