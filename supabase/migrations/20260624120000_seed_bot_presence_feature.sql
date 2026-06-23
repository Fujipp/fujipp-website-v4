-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: bot-presence feature + the ENUM config field type.
--
-- bot-presence (AUTOMATION) — controls the bot's OWN Discord presence:
--   • online / idle / dnd / invisible status
--   • a "กำลังดู …" (Watching) activity whose text rotates through a list every
--     N seconds (set ≥1 text; 1 text = static, many = loop).
-- Setting the bot's own presence needs NO gateway intent (GuildPresences is only
-- for RECEIVING other users' presence), so this feature adds no privileged scope.
--
-- New config field type ENUM: a fixed dropdown whose choices live in a JSONB
-- `options` column ([{ "value": ..., "label": ... }, …]). The web form renders it
-- as a <select>; the bot reads the stored `value` as a plain string.
--
-- Config keys mirror the central-bot feature module 1:1 (env injected per subject):
--   PRESENCE_STATUS         (ENUM)        — online / idle / dnd / invisible
--   PRESENCE_ACTIVITY_TYPE  (ENUM)        — WATCHING / PLAYING / LISTENING / COMPETING
--   PRESENCE_TEXTS          (STRING_LIST) — activity texts, rotated in order
--   PRESENCE_ROTATE_SECONDS (NUMBER)      — seconds per text when looping
--
-- No prices seeded — visible but not purchasable until priced via the admin
-- Pricing page (same pattern as voice-keeper). Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Field-type plumbing: add ENUM + its options column ──────────────────────
ALTER TABLE billing.feature_variable_templates
  ADD COLUMN IF NOT EXISTS options JSONB;

ALTER TABLE billing.feature_variable_templates
  DROP CONSTRAINT IF EXISTS feature_variable_templates_type_chk;
ALTER TABLE billing.feature_variable_templates
  ADD CONSTRAINT feature_variable_templates_type_chk CHECK (value_type IN
    ('STRING','TEXT','NUMBER','BOOLEAN','CHANNEL_ID','ROLE_ID','USER_ID','SECRET','JSON','STRING_LIST','ENUM'));


-- ─── Catalog row ─────────────────────────────────────────────────────────────
INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('bot-presence',
   'Bot Presence',
   'ตั้งสถานะของบอท (ออนไลน์ / ไม่อยู่ / ห้ามรบกวน / ออฟไลน์) และข้อความกิจกรรมแบบ '
   || '“กำลังดู …” ที่หมุนวนได้หลายข้อความตามเวลาที่กำหนด — ตั้ง 1 ข้อความ = ค้างไว้, '
   || 'หลายข้อความ = วนเปลี่ยนทุก ๆ กี่วินาทีก็ได้.',
   'AUTOMATION', FALSE, 70, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: bot-presence ─────────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'bot-presence')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, options, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.options, v.sort_order
FROM f, (VALUES
  ('PRESENCE_STATUS',
   'สถานะบอท',
   'สีสถานะที่แสดงบนชื่อบอท'::text,
   'ENUM', FALSE, FALSE, 'online'::text,
   $json$[
     {"value":"online","label":"🟢 ออนไลน์"},
     {"value":"idle","label":"🌙 ไม่อยู่ (Idle)"},
     {"value":"dnd","label":"⛔ ห้ามรบกวน (DND)"},
     {"value":"invisible","label":"⚫ ออฟไลน์ (ซ่อนตัว)"}
   ]$json$::jsonb,
   10),

  ('PRESENCE_ACTIVITY_TYPE',
   'ประเภทกิจกรรม',
   'คำนำหน้าข้อความสถานะ (เช่น “กำลังดู …”)',
   'ENUM', FALSE, FALSE, 'WATCHING',
   $json$[
     {"value":"WATCHING","label":"👀 กำลังดู"},
     {"value":"PLAYING","label":"🎮 กำลังเล่น"},
     {"value":"LISTENING","label":"🎧 กำลังฟัง"},
     {"value":"COMPETING","label":"🏆 กำลังแข่งใน"}
   ]$json$::jsonb,
   20),

  ('PRESENCE_TEXTS',
   'ข้อความสถานะ',
   'ข้อความที่จะแสดงต่อท้ายประเภทกิจกรรม — เพิ่มได้หลายข้อความ บอทจะวนเปลี่ยนไปเรื่อย ๆ (ไม่มี = ไม่ตั้งกิจกรรม)',
   'STRING_LIST', FALSE, FALSE, NULL::text,
   NULL::jsonb,
   30),

  ('PRESENCE_ROTATE_SECONDS',
   'วินาทีต่อข้อความ',
   'หมุนเปลี่ยนข้อความทุก ๆ กี่วินาที (มีผลเมื่อมีมากกว่า 1 ข้อความ ขั้นต่ำ 15 วินาที)',
   'NUMBER', FALSE, FALSE, '30',
   NULL::jsonb,
   40)
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
