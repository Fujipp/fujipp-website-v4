-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: voice-keeper feature.
--
-- Ports the legacy IDAXD Shop (discord-bot-002) /join /leave into the catalog:
--   voice-keeper (AUTOMATION) — keep the bot sitting in a voice channel 24/7.
--   It joins on startup when VOICE_KEEP_ENABLED is on, rejoins automatically if
--   it's kicked / moved / disconnected, and a 30-minute heartbeat repairs the
--   connection. Admins can also drive it live with /join [channel] and /leave.
--
-- Config keys mirror the central-bot feature module 1:1 (env injected per subject):
--   VOICE_CHANNEL_ID   (CHANNEL_ID) — the voice channel to camp in
--   VOICE_KEEP_ENABLED (BOOLEAN)    — join automatically on startup
--
-- No prices seeded — visible but not purchasable until priced via the admin
-- Pricing page (same pattern as the roblox / wallet-history / review-credit
-- seeds). Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('voice-keeper',
   'Voice Keeper',
   'ให้บอทเข้าไปอยู่ในห้องเสียง 24/7 ทุกครั้งที่ออนไลน์ — ตั้งห้องแบบ FIX ไว้ในการตั้งค่า '
   || '(เปิด/ปิดด้วย VOICE_KEEP_ENABLED) หรือสั่งสดด้วยคำสั่ง /join (เข้าห้อง) และ /leave (ออก). '
   || 'ถ้าบอทถูกเตะ/ย้าย/หลุด จะกลับเข้าห้องเดิมอัตโนมัติ และมี heartbeat ทุก 30 นาทีคอยซ่อมการเชื่อมต่อ.',
   'AUTOMATION', FALSE, 60, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: voice-keeper ─────────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'voice-keeper')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('VOICE_CHANNEL_ID',   'ห้องเสียง',          'ห้องเสียงที่จะให้บอทเข้าไปอยู่ 24/7 (ใช้ /join เพื่อเปลี่ยนสดได้)'::text, 'CHANNEL_ID', FALSE, FALSE, NULL::text, 10),
  ('VOICE_KEEP_ENABLED', 'เข้าห้องอัตโนมัติ',  'ให้บอทเข้าห้องเสียงด้านบนทันทีทุกครั้งที่ออนไลน์',                       'BOOLEAN',    FALSE, FALSE, 'false',    20)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
