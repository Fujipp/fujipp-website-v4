-- ═════════════════════════════════════════════════════════════════════════════
-- server-log: per-category log channels.
--
-- Until now every enabled category (messages / members / moderation / channels /
-- voice) posted into the single LOG_CHANNEL_ID. This adds one OPTIONAL channel
-- override per category so an admin can route each kind of log into its own room.
--
-- Fallback rule (enforced in the central-bot feature module): when a category's
-- override is empty, that category falls back to LOG_CHANNEL_ID — so existing bots
-- with only LOG_CHANNEL_ID set keep behaving exactly as before. LOG_CHANNEL_ID is
-- now the DEFAULT/fallback channel rather than the only one.
--
-- New config keys (mirror the central-bot feature module 1:1, env injected per subject):
--   LOG_MESSAGE_CHANNEL_ID        (CHANNEL_ID) — override room for message events
--   LOG_MEMBER_CHANNEL_ID         (CHANNEL_ID) — override room for member events
--   LOG_MODERATION_CHANNEL_ID     (CHANNEL_ID) — override room for moderation events
--   LOG_CHANNEL_EVENTS_CHANNEL_ID (CHANNEL_ID) — override room for channel events
--   LOG_VOICE_CHANNEL_ID          (CHANNEL_ID) — override room for voice events
--
-- Sort orders interleave each override right under its on/off toggle. The override
-- for the channel-events category is keyed LOG_CHANNEL_EVENTS_CHANNEL_ID to stay
-- distinct from the existing LOG_CHANNEL_ID (the global fallback) and the
-- LOG_CHANNEL_EVENTS toggle. Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'server-log')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  -- Clarify that the global channel is now the default/fallback for any category
  -- without its own override.
  ('LOG_CHANNEL_ID',                'ห้องส่ง Log (ค่าเริ่มต้น)',
   'ห้องเริ่มต้นที่จะให้ Webhook ส่ง log เข้าไป ถ้าหมวดไหนไม่ได้เลือกห้องเฉพาะ จะใช้ห้องนี้ '
   || '(บอทต้องมีสิทธิ์ Manage Webhooks ในห้องนี้)'::text,                                  'CHANNEL_ID', FALSE, FALSE, NULL::text, 20),
  ('LOG_MESSAGE_CHANNEL_ID',        'ห้อง Log ข้อความ',
   'ห้องเฉพาะสำหรับ log ข้อความ (เว้นว่างเพื่อใช้ห้องเริ่มต้น)',                              'CHANNEL_ID', FALSE, FALSE, NULL::text, 35),
  ('LOG_MEMBER_CHANNEL_ID',         'ห้อง Log สมาชิก',
   'ห้องเฉพาะสำหรับ log สมาชิก (เว้นว่างเพื่อใช้ห้องเริ่มต้น)',                                'CHANNEL_ID', FALSE, FALSE, NULL::text, 45),
  ('LOG_MODERATION_CHANNEL_ID',     'ห้อง Log การจัดการ',
   'ห้องเฉพาะสำหรับ log การแบน/timeout (เว้นว่างเพื่อใช้ห้องเริ่มต้น)',                        'CHANNEL_ID', FALSE, FALSE, NULL::text, 55),
  ('LOG_CHANNEL_EVENTS_CHANNEL_ID', 'ห้อง Log ห้อง',
   'ห้องเฉพาะสำหรับ log การสร้าง/ลบ/แก้ไขห้อง (เว้นว่างเพื่อใช้ห้องเริ่มต้น)',                  'CHANNEL_ID', FALSE, FALSE, NULL::text, 65),
  ('LOG_VOICE_CHANNEL_ID',          'ห้อง Log ห้องเสียง',
   'ห้องเฉพาะสำหรับ log ห้องเสียง (เว้นว่างเพื่อใช้ห้องเริ่มต้น)',                              'CHANNEL_ID', FALSE, FALSE, NULL::text, 75)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
