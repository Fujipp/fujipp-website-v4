-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: shop-status feature (port of legacy discord-bot-002-idaxdshop /status).
--
-- An admin sets the store's status with /status open | close | busy. For each status
-- the bot announces it into an announce channel (editing the same message in place so
-- toggling doesn't spam the channel) and renames a target channel to that status's name.
--
-- Output is configurable via STATUS_OUTPUT_MODE (ENUM EMBED | TEXT | BOTH):
--   EMBED → the status's Embed Designer slot (status_open / status_close / status_busy)
--   TEXT  → the plain STATUS_*_TEXT content
--   BOTH  → both (default)
--
-- Config keys mirror the central-bot feature module 1:1 (env injected per subject):
--   STATUS_TARGET_CHANNEL_ID    (CHANNEL_ID) — channel renamed to reflect the status
--   STATUS_ANNOUNCE_CHANNEL_ID  (CHANNEL_ID) — channel the announcement is posted into
--   STATUS_OUTPUT_MODE          (ENUM)       — EMBED | TEXT | BOTH
--   STATUS_OPEN_CHANNEL_NAME    (STRING)     — target channel name when open
--   STATUS_CLOSED_CHANNEL_NAME  (STRING)     — target channel name when closed
--   STATUS_BUSY_CHANNEL_NAME    (STRING)     — target channel name when busy
--   STATUS_OPEN_TEXT            (TEXT)       — plain-text announcement when open
--   STATUS_CLOSED_TEXT          (TEXT)       — plain-text announcement when closed
--   STATUS_BUSY_TEXT            (TEXT)       — plain-text announcement when busy
--
-- The announcement message the bot last posted is remembered per (subject, channel) in
-- shop.shop_status_messages so /status edits it in place. Accessed only by central-bot
-- (service_role) — NOT exposed to the Data API. Keep the columns in sync with the
-- bootstrap DDL in services/central-bot/src/lib/shop-store-db.js.
--
-- No prices seeded — visible but not purchasable until priced via the admin Pricing
-- page (same pattern as the other ported features). Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Per-bot announcement message store ──────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS shop;
GRANT USAGE ON SCHEMA shop TO service_role;

CREATE TABLE IF NOT EXISTS shop.shop_status_messages (
    external_subject_id TEXT        NOT NULL,
    channel_id          TEXT        NOT NULL,
    message_id          TEXT        NOT NULL,
    status              TEXT        NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT shop_status_messages_pkey PRIMARY KEY (external_subject_id, channel_id)
);

-- RLS — defense in depth; service_role only (central-bot via pg).
ALTER TABLE shop.shop_status_messages ENABLE ROW LEVEL SECURITY;
GRANT ALL ON shop.shop_status_messages TO service_role;
DROP POLICY IF EXISTS shop_status_messages_service_all ON shop.shop_status_messages;
CREATE POLICY shop_status_messages_service_all ON shop.shop_status_messages
    TO service_role USING (true) WITH CHECK (true);


-- ─── Catalog row ─────────────────────────────────────────────────────────────
INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('shop-status',
   'Shop Status',
   'จัดการสถานะร้านด้วยคำสั่ง /status (เปิด / ปิด / ไม่ว่าง) — บอทจะประกาศสถานะลงห้องที่ตั้งไว้ '
   || '(แก้ไขข้อความเดิมไม่สแปมห้อง) และเปลี่ยนชื่อห้องให้ตรงกับสถานะ. เลือกได้ว่าจะประกาศเป็น '
   || 'embed, ข้อความธรรมดา หรือทั้งคู่ ปรับหน้าตา embed แต่ละสถานะได้ใน Embed Designer.',
   'SHOP', FALSE, 90, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: shop-status ──────────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'shop-status')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, options, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.options, v.sort_order
FROM f, (VALUES
  ('STATUS_ANNOUNCE_CHANNEL_ID',
   'ห้องประกาศสถานะ',
   'ห้องที่บอทจะโพสต์/แก้ไขข้อความประกาศสถานะ (ไม่ตั้ง = ใช้ห้องที่พิมพ์คำสั่ง)'::text,
   'CHANNEL_ID', FALSE, FALSE, NULL::text, NULL::jsonb, 10),

  ('STATUS_TARGET_CHANNEL_ID',
   'ห้องที่จะเปลี่ยนชื่อ',
   'ห้องที่บอทจะเปลี่ยนชื่อให้ตรงกับสถานะ (ไม่ตั้ง = ไม่เปลี่ยนชื่อห้อง) — บอทต้องมีสิทธิ์ Manage Channels',
   'CHANNEL_ID', FALSE, FALSE, NULL::text, NULL::jsonb, 20),

  ('STATUS_OUTPUT_MODE',
   'รูปแบบการประกาศ',
   'จะประกาศเป็น embed, ข้อความธรรมดา หรือทั้งคู่',
   'ENUM', FALSE, FALSE, 'BOTH'::text,
   $json$[
     {"value":"BOTH","label":"📦 ทั้ง embed และข้อความ"},
     {"value":"EMBED","label":"🖼️ embed อย่างเดียว"},
     {"value":"TEXT","label":"💬 ข้อความธรรมดาอย่างเดียว"}
   ]$json$::jsonb, 30),

  ('STATUS_OPEN_CHANNEL_NAME',
   'ชื่อห้องตอนร้านเปิด', 'ชื่อที่จะเปลี่ยนให้ห้องเมื่อสั่ง /status open',
   'STRING', FALSE, FALSE, '🟢ㆍสถานะㆍร้านเปิด', NULL::jsonb, 40),
  ('STATUS_CLOSED_CHANNEL_NAME',
   'ชื่อห้องตอนร้านปิด', 'ชื่อที่จะเปลี่ยนให้ห้องเมื่อสั่ง /status close',
   'STRING', FALSE, FALSE, '🔴ㆍสถานะㆍร้านปิด', NULL::jsonb, 50),
  ('STATUS_BUSY_CHANNEL_NAME',
   'ชื่อห้องตอนไม่ว่าง', 'ชื่อที่จะเปลี่ยนให้ห้องเมื่อสั่ง /status busy',
   'STRING', FALSE, FALSE, '🟡ㆍสถานะㆍไม่ว่าง', NULL::jsonb, 60),

  ('STATUS_OPEN_TEXT',
   'ข้อความตอนร้านเปิด', 'ข้อความประกาศเมื่อร้านเปิด (ใช้เมื่อรูปแบบเป็นข้อความ/ทั้งคู่)',
   'TEXT', FALSE, FALSE, NULL::text, NULL::jsonb, 70),
  ('STATUS_CLOSED_TEXT',
   'ข้อความตอนร้านปิด', 'ข้อความประกาศเมื่อร้านปิด (ใช้เมื่อรูปแบบเป็นข้อความ/ทั้งคู่)',
   'TEXT', FALSE, FALSE, NULL::text, NULL::jsonb, 80),
  ('STATUS_BUSY_TEXT',
   'ข้อความตอนไม่ว่าง', 'ข้อความประกาศเมื่อไม่ว่าง (ใช้เมื่อรูปแบบเป็นข้อความ/ทั้งคู่)',
   'TEXT', FALSE, FALSE, NULL::text, NULL::jsonb, 90)
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


-- ─── Embed slots: status_open / status_close / status_busy ───────────────────
-- Rendered in the announce channel when the matching /status subcommand runs (in EMBED
-- or BOTH mode). {{time}} = current Asia/Bangkok timestamp.
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  ('shop-status', 'status_open', 'สถานะ: ร้านเปิด', 'embed ประกาศเมื่อสั่ง /status open. {{time}} = เวลาปัจจุบัน.',
   ARRAY['time'],
   $j$ { "color": 5763719, "title": "🟢 ร้านเปิดแล้ว", "description": "ยินดีให้บริการครับ สามารถสั่งซื้อสินค้าได้เลย", "footer": { "text": "อัปเดตล่าสุด {{time}}" } } $j$::jsonb, 10),
  ('shop-status', 'status_close', 'สถานะ: ร้านปิด', 'embed ประกาศเมื่อสั่ง /status close. {{time}} = เวลาปัจจุบัน.',
   ARRAY['time'],
   $j$ { "color": 15548997, "title": "🔴 ร้านปิดแล้ว", "description": "ขอบคุณที่อุดหนุนนะครับ ไว้กลับมาเปิดใหม่", "footer": { "text": "อัปเดตล่าสุด {{time}}" } } $j$::jsonb, 20),
  ('shop-status', 'status_busy', 'สถานะ: ไม่ว่าง', 'embed ประกาศเมื่อสั่ง /status busy. {{time}} = เวลาปัจจุบัน.',
   ARRAY['time'],
   $j$ { "color": 16705372, "title": "🟡 ตอนนี้ไม่ว่าง", "description": "อาจตอบกลับช้าหน่อยนะครับ รอสักครู่", "footer": { "text": "อัปเดตล่าสุด {{time}}" } } $j$::jsonb, 30)
ON CONFLICT (feature_code, slot_key) DO NOTHING;
