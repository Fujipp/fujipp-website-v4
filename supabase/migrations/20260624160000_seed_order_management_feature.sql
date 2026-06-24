-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: order-management feature (port of legacy discord-bot-002-idaxdshop /order).
--
-- An admin logs a completed sale with /order (buyer, item, price, quantity, optional
-- image). The bot posts an "Order success" embed into the log channel and keeps a
-- running order count it stamps onto that channel's name (ORDER_CHANNEL_NAME_TEMPLATE,
-- {count} = the order number). The counter is stored per-bot in shop.order_counters —
-- on our database by default, or on the customer's own database when the bot opts into
-- BYO-DB (see the byo-database feature).
--
-- Config keys mirror the central-bot feature module 1:1 (env injected per subject).
-- No prices seeded — visible but not purchasable until priced via the admin Pricing
-- page (same pattern as price-board / voice-keeper). Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('order-management',
   'Order Management',
   'บันทึกการสั่งซื้อด้วย /order — แอดมินกรอกผู้ซื้อ/สินค้า/ราคา/จำนวน (แนบรูปได้) บอทจะโพสต์ embed '
   || 'สรุปออเดอร์ลงห้อง log ที่เลือก และนับลำดับออเดอร์สะสมไปติดไว้ที่ชื่อห้อง (เช่น '
   || '⭐ㆍเครดิตส่งของㆍ{count}). ตัวนับเก็บแยกตามห้อง — ใช้ฐานข้อมูลของเราหรือฐานข้อมูลของร้านเอง '
   || 'ก็ได้ (ดูแอดออน “ฐานข้อมูลของตัวเอง”).',
   'SHOP', FALSE, 85, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: order-management ─────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'order-management')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('ORDER_LOG_CHANNEL_ID',        'ห้องบันทึกออเดอร์', 'ห้องที่บอทจะโพสต์ embed สรุปออเดอร์ และนับลำดับไปติดที่ชื่อห้อง'::text, 'CHANNEL_ID', TRUE,  FALSE, NULL::text,                  10),
  ('ORDER_CHANNEL_NAME_TEMPLATE', 'เทมเพลตชื่อห้อง',   'รูปแบบชื่อห้อง log — ใช้ {count} แทนเลขลำดับออเดอร์',                    'STRING',     FALSE, FALSE, '⭐ㆍเครดิตส่งของㆍ{count}',     20)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
