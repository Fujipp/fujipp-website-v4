-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: app-premium-shop feature — resell premium-app accounts from gafiwshop.xyz.
--
-- The shop owner funds an account on the upstream site (gafiwshop) and sets a
-- flat baht margin per product; members buy from a /app-panel with 3 category
-- dropdowns, pay from their shop wallet (wallet-topup feature), and receive the
-- purchased account by DM. A public "delivered" embed (no credentials) goes to
-- APP_PREMIUM_NOTIFY_CHANNEL and the full order record (with credentials) goes
-- to APP_PREMIUM_LOG_CHANNEL — the log channel IS the order store; no order
-- table exists on purpose. Only the wallet debit/refund touches the database.
--
-- Config keys mirror the central-bot feature module 1:1 (env injected per subject):
--   APP_PREMIUM_API_KEY        (SECRET)     — gafiwshop keyapi
--   APP_PREMIUM_API_BASE       (STRING)     — API base URL (default gafiwshop.xyz/api)
--   APP_PREMIUM_ENABLED        (BOOLEAN)    — master switch for buying
--   APP_PREMIUM_USE_VIP_PRICE  (BOOLEAN)    — cost = pricevip instead of price
--   APP_PREMIUM_MARGIN_DEFAULT (NUMBER)     — flat baht profit added to cost
--   APP_PREMIUM_MARGINS        (STRING_LIST)— per-product overrides "NETFLIX=15" / "<type_id>=20"
--   APP_PREMIUM_CATEGORY_1..3  (STRING_LIST)— type_menu names per dropdown (empty = auto)
--   APP_PREMIUM_NOTIFY_CHANNEL (CHANNEL_ID) — public delivered announcements
--   APP_PREMIUM_LOG_CHANNEL    (CHANNEL_ID) — full order log (admin only)
--
-- No prices seeded — visible but not purchasable until priced via the admin
-- Pricing page (same pattern as the other ported features). Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Catalog row ─────────────────────────────────────────────────────────────
INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('app-premium-shop',
   'App Premium Shop',
   'ขายแอพพรีเมียมอัตโนมัติ (Netflix, YouTube, Disney+ ฯลฯ) ผ่าน API ร้านต้นทาง — ลูกค้ากดซื้อจาก'
   || 'แผงร้าน 3 หมวด จ่ายด้วยกระเป๋าเงินในเซิร์ฟเวอร์ บอทส่งข้อมูลบัญชีให้ทาง DM พร้อมประกาศส่งสินค้า'
   || 'สำเร็จและ log ออเดอร์ลงห้องที่ตั้งไว้ ตั้งกำไรต่อชิ้นเองได้ คืนเงินอัตโนมัติเมื่อสั่งซื้อไม่สำเร็จ '
   || '(ต้องเปิด Shop Wallet & Top-up ด้วย)',
   'SHOP', FALSE, 95, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;

-- ─── Config schema: app-premium-shop ─────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'app-premium-shop')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, options, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.options, v.sort_order
FROM f, (VALUES
  ('APP_PREMIUM_API_KEY',
   'API Key ร้านต้นทาง',
   'คีย์ API (keyapi) จากเว็บ gafiwshop.xyz — สมัครบัญชีและเติมเงินในเว็บก่อน แล้วคัดลอกคีย์มาใส่'::text,
   'SECRET', TRUE, TRUE, NULL::text, NULL::jsonb, 10),

  ('APP_PREMIUM_ENABLED',
   'เปิดระบบขาย',
   'ปิดชั่วคราวได้โดยไม่ต้องลบแผงร้าน (ลูกค้าจะกดซื้อไม่ได้)',
   'BOOLEAN', FALSE, FALSE, 'true', NULL::jsonb, 20),

  ('APP_PREMIUM_MARGIN_DEFAULT',
   'กำไรต่อชิ้น (บาท)',
   'กำไรมาตรฐานที่บวกจากราคาทุนของร้านต้นทาง เช่น 10 = ทุน 49 ขาย 59',
   'NUMBER', FALSE, FALSE, '10', NULL::jsonb, 30),

  ('APP_PREMIUM_MARGINS',
   'กำไรรายสินค้า',
   'กำหนดกำไรเฉพาะบางสินค้า รูปแบบ "ชื่อหมวด=บาท" เช่น NETFLIX=15 หรือเจาะจงด้วย type_id เช่น TNICNFPJCHEZJXKIJUZM=20 (สินค้าที่ไม่ระบุใช้กำไรมาตรฐาน)',
   'STRING_LIST', FALSE, FALSE, NULL::text, NULL::jsonb, 40),

  ('APP_PREMIUM_USE_VIP_PRICE',
   'ใช้ราคาทุน VIP',
   'เปิดเมื่อบัญชีร้านต้นทางของคุณเป็นระดับ VIP (คิดทุนจาก pricevip แทน price)',
   'BOOLEAN', FALSE, FALSE, 'false', NULL::jsonb, 50),

  ('APP_PREMIUM_CATEGORY_1',
   'สินค้าหมวดที่ 1',
   'รายชื่อหมวดสินค้า (type_menu) ที่จะโชว์ในเมนูที่ 1 เช่น NETFLIX, YOUTUBE — ถ้าไม่ตั้งทั้ง 3 หมวด ระบบจะแบ่งสินค้าทั้งหมดให้อัตโนมัติ',
   'STRING_LIST', FALSE, FALSE, NULL::text, NULL::jsonb, 60),
  ('APP_PREMIUM_CATEGORY_2',
   'สินค้าหมวดที่ 2',
   'รายชื่อหมวดสินค้า (type_menu) ที่จะโชว์ในเมนูที่ 2',
   'STRING_LIST', FALSE, FALSE, NULL::text, NULL::jsonb, 70),
  ('APP_PREMIUM_CATEGORY_3',
   'สินค้าหมวดที่ 3',
   'รายชื่อหมวดสินค้า (type_menu) ที่จะโชว์ในเมนูที่ 3',
   'STRING_LIST', FALSE, FALSE, NULL::text, NULL::jsonb, 80),

  ('APP_PREMIUM_NOTIFY_CHANNEL',
   'ห้องประกาศส่งสินค้าสำเร็จ',
   'ห้องสาธารณะที่บอทโพสต์คำสั่งซื้อสำเร็จ (ไม่มีข้อมูลบัญชี/รหัสผ่าน) — ไม่ตั้ง = ไม่ประกาศ',
   'CHANNEL_ID', FALSE, FALSE, NULL::text, NULL::jsonb, 90),

  ('APP_PREMIUM_LOG_CHANNEL',
   'ห้อง log ออเดอร์ (แอดมิน)',
   'ห้องภายในที่เก็บรายละเอียดออเดอร์เต็ม รวมข้อมูลบัญชีที่ส่งให้ลูกค้า ต้นทุน และกำไร — ควรเป็นห้องลับเฉพาะแอดมิน',
   'CHANNEL_ID', FALSE, FALSE, NULL::text, NULL::jsonb, 100),

  ('APP_PREMIUM_API_BASE',
   'API Base URL',
   'ที่อยู่ API ของร้านต้นทาง (ปกติไม่ต้องแก้)',
   'STRING', FALSE, FALSE, 'https://gafiwshop.xyz/api', NULL::jsonb, 110)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, options, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  options       = EXCLUDED.options,
  sort_order    = EXCLUDED.sort_order;

-- ─── Embed slots ──────────────────────────────────────────────────────────────
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  ('app-premium-shop', 'app_panel', 'แผงร้านแอพพรีเมียม',
   'embed หลักของแผงร้าน (/app-panel). {{total_stock}} = สต๊อกรวม, {{product_count}} = จำนวนรายการ, {{updated_at}} = เวลาอัพเดทล่าสุด. ปรับเมนู/ปุ่มผ่าน component roles: cat_select_1..3 (placeholder, option_label, option_description, emoji), btn_topup, btn_balance, btn_stock.',
   ARRAY['total_stock', 'product_count', 'updated_at'],
   $j$ {
     "color": 16758465,
     "title": "🌸 APP PREMIUM AUTO",
     "description": "💜 ลูกค้าสามารถทำรายการสั่งซื้อ ผ่านระบบออโต้\n✅ แอพของเราพร้อมจำหน่าย **{{total_stock}}** ชิ้น\n\n```- อย่าลืมกดอัพเดท Stock ก่อนเติมเงินนะคะ```",
     "footer": { "text": "อัพเดท stock ล่าสุด {{updated_at}}" }
   } $j$::jsonb, 10),

  ('app-premium-shop', 'app_confirm', 'ยืนยันการสั่งซื้อ',
   'embed ยืนยันก่อนหักเงิน. {{name}}, {{category}}, {{price}}, {{stock}}, {{balance}}, {{balance_after}}, {{image}} = รูปสินค้า, {{avatar}} = รูปลูกค้า.',
   ARRAY['name', 'category', 'price', 'stock', 'balance', 'balance_after', 'image', 'avatar'],
   $j$ {
     "color": 16758465,
     "title": "🛒 ยืนยันการสั่งซื้อ",
     "description": "**{{name}}**\n\n💰 ราคา : **{{price}} บาท**\n📦 คงเหลือ : {{stock}} ชิ้น\n👛 ยอดเงินของคุณ : {{balance}} บาท\n➡️ ยอดคงเหลือหลังซื้อ : {{balance_after}} บาท",
     "thumbnail": { "url": "{{image}}" }
   } $j$::jsonb, 20),

  ('app-premium-shop', 'app_success', 'สั่งซื้อสำเร็จ (ephemeral)',
   'ข้อความตอบกลับลูกค้าหลังซื้อสำเร็จ (เห็นคนเดียว). {{name}}, {{price}}, {{balance}}, {{order_id}}, {{datetime}}, {{avatar}}.',
   ARRAY['name', 'price', 'balance', 'order_id', 'datetime', 'avatar'],
   $j$ {
     "color": 5763719,
     "title": "✅ สั่งซื้อสำเร็จ!",
     "description": "**{{name}}**\n\n💰 ราคา : {{price}} บาท\n👛 ยอดคงเหลือ : {{balance}} บาท\n\n📩 ข้อมูลบัญชีถูกส่งไปที่แชทส่วนตัวของคุณแล้ว",
     "footer": { "text": "TXD : {{order_id}} • {{datetime}}" }
   } $j$::jsonb, 30),

  ('app-premium-shop', 'app_dm', 'ข้อมูลบัญชี (DM)',
   'embed ที่ DM ให้ลูกค้าพร้อมข้อมูลบัญชี. {{name}}, {{category}}, {{price}}, {{order_id}}, {{account}} = ข้อมูลบัญชีจากร้านต้นทาง (code block), {{datetime}}.',
   ARRAY['name', 'category', 'price', 'order_id', 'account', 'datetime', 'avatar'],
   $j$ {
     "color": 16758465,
     "title": "💌 สินค้าของคุณมาส่งแล้ว!",
     "description": "**{{name}}**\n\n🔑 ข้อมูลบัญชี :\n{{account}}\n⚠️ กรุณาเก็บข้อมูลนี้ไว้ อย่าส่งต่อให้ผู้อื่น",
     "footer": { "text": "TXD : {{order_id}} • {{datetime}}" }
   } $j$::jsonb, 40),

  ('app-premium-shop', 'app_notify', 'ประกาศส่งสินค้าสำเร็จ',
   'embed สาธารณะในห้องประกาศเมื่อส่งสินค้าสำเร็จ (ไม่มีข้อมูลบัญชี). {{member}} = id ลูกค้า (ใช้ <@{{member}}>), {{username}}, {{name}}, {{category}}, {{price}}, {{order_id}}, {{datetime}}, {{avatar}}.',
   ARRAY['member', 'username', 'name', 'category', 'price', 'order_id', 'datetime', 'avatar'],
   $j$ {
     "color": 16758465,
     "title": "💌 คำสั่งซื้อแอพพรีเมียม!",
     "description": "🐰 ผู้ใช้ : <@{{member}}>\n💰 ราคาสินค้า : `{{price}} บาท`\n♡ ประเภทรายการ : `{{category}}` ♡\n\n🌸 รหัสสินค้า : `{{order_id}}`\n🌸 ชื่อรายการสินค้า : `{{name}}`\n🌸 วันที่ - เวลา : `{{datetime}}`",
     "footer": { "text": "TXD : {{order_id}} • {{name}}" }
   } $j$::jsonb, 50),

  ('app-premium-shop', 'app_error', 'แจ้งข้อผิดพลาด',
   'embed แจ้งเตือนเมื่อทำรายการไม่สำเร็จ/ยกเลิก. {{reason}}, {{datetime}}, {{avatar}}.',
   ARRAY['reason', 'datetime', 'avatar'],
   $j$ {
     "color": 15548997,
     "title": "❌ ทำรายการไม่สำเร็จ",
     "description": "{{reason}}",
     "footer": { "text": "{{datetime}}" }
   } $j$::jsonb, 60)
ON CONFLICT (feature_code, slot_key) DO NOTHING;
