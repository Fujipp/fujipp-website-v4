-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: byo-database — per-bot "bring your own database" selector (built-in add-on).
--
-- Lets a shop choose, PER BOT, where its DB-backed shop features store their data:
-- our database (default) or the shop's own Postgres/Neon. This is a config-only
-- provider feature — it registers no commands. central-bot reads its two config keys
-- (injected as env by the orchestrator's buildEnv, exactly like every other feature
-- config) to decide which connection pool the shop-data store uses, and auto-creates
-- the tables on the customer's database on first use
-- (see services/central-bot/src/lib/shop-store-db.js).
--
-- The choice is opt-in and explicit: data only leaves our database when
-- SHOP_USE_OWN_DB = true AND SHOP_DB_URL is set. SHOP_DB_URL is SECRET, so it is
-- encrypted in feature_config_values and only decrypted into env at bot start.
--
-- Granted free to every bot by 20260624170100_auto_grant_byo_database.sql (mirrors
-- bot-presence), so the DB-choice form is always available without a purchase step.
-- Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('byo-database',
   'ฐานข้อมูลของตัวเอง (BYO Database)',
   'เลือกได้ว่าจะให้ฟีเจอร์ที่ต้องเก็บข้อมูล (เช่น Order Management) เก็บลงฐานข้อมูลของเรา '
   || '(ค่าเริ่มต้น) หรือฐานข้อมูล Postgres/Neon ของร้านเอง. เปิด “ใช้ฐานข้อมูลของตัวเอง” แล้ววาง '
   || 'connection string ของคุณ — บอทจะสร้างตารางที่ต้องใช้ให้อัตโนมัติ. ถ้าไม่เปิด ทุกอย่างจะเก็บที่ '
   || 'ฐานข้อมูลของเราเหมือนเดิม.',
   'RUNTIME', FALSE, 5, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: byo-database ─────────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'byo-database')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('SHOP_USE_OWN_DB', 'ใช้ฐานข้อมูลของตัวเอง', 'เปิดเพื่อเก็บข้อมูลฟีเจอร์ลงฐานข้อมูลของร้านเองแทนฐานข้อมูลของเรา (ต้องกรอก Connection URL ด้านล่างด้วย)'::text, 'BOOLEAN', FALSE, FALSE, 'false',   10),
  ('SHOP_DB_URL',     'Connection URL',        'connection string ของ Postgres/Neon (เช่น postgresql://user:pass@host/db?sslmode=require) — เก็บแบบเข้ารหัส ใช้เมื่อเปิด “ใช้ฐานข้อมูลของตัวเอง”', 'SECRET', FALSE, TRUE, NULL::text, 20)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
