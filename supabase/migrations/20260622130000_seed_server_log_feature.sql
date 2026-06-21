-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: server-log feature.
--
-- A server-wide audit log: the bot records meaningful actions in a Discord server
-- (messages, members, moderation, channels, voice) and posts each as an embed
-- THROUGH A WEBHOOK in the chosen log channel — not as the bot account — so logging
-- traffic doesn't count against the bot's own message sends. The bot auto-creates /
-- reuses a webhook named "Server Log" in LOG_CHANNEL_ID (needs Manage Webhooks).
--
-- Config keys mirror the central-bot feature module 1:1 (env injected per subject):
--   LOG_ENABLED            (BOOLEAN)    — master on/off
--   LOG_CHANNEL_ID         (CHANNEL_ID) — channel the webhook posts into
--   LOG_MESSAGE_EVENTS     (BOOLEAN)    — message edit / delete / bulk-delete
--   LOG_MEMBER_EVENTS      (BOOLEAN)    — join / leave / nickname / role change
--   LOG_MODERATION_EVENTS  (BOOLEAN)    — ban / unban / timeout
--   LOG_CHANNEL_EVENTS     (BOOLEAN)    — channel create / delete / update
--   LOG_VOICE_EVENTS       (BOOLEAN)    — voice join / leave / move
--
-- Heads-up: message + member coverage requires the PRIVILEGED Message Content and
-- Server Members intents enabled in each bot's Discord Developer Portal, or login
-- fails. The bot only requests a privileged intent when its category is on, so a bot
-- logging only channels/moderation/voice avoids them.
--
-- Embed slot `log_base` holds the configurable frame (color / author / footer); the
-- bot overlays per-event title / description / fields + a per-event accent color.
--
-- No prices seeded — visible but not purchasable until priced via the admin Pricing
-- page (same pattern as voice-keeper / review-credit). Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('server-log',
   'Server Log',
   'บันทึกทุกการกระทำในเซิร์ฟเวอร์ (ลบ/แก้ข้อความ, เข้า/ออก, เปลี่ยนยศ/ชื่อเล่น, แบน, '
   || 'สร้าง/ลบห้อง, ห้องเสียง) แล้วส่งเป็น embed ผ่าน Webhook ในห้อง log ที่เลือก — ส่งด้วย '
   || 'Webhook แทนบอท จึงไม่กินโควต้าการส่งข้อความของบอท. เปิด/ปิดได้ทั้งระบบและแยกตามหมวด, '
   || 'ปรับหน้าตา embed ได้ใน Embed Designer. บอทจะสร้าง Webhook ชื่อ "Server Log" ในห้อง log '
   || 'ให้อัตโนมัติ (ต้องมีสิทธิ์ Manage Webhooks). หมายเหตุ: การ log ข้อความ/สมาชิกต้องเปิด '
   || 'Privileged Intents (Message Content / Server Members) ใน Developer Portal ของบอท.',
   'AUTOMATION', FALSE, 70, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: server-log ───────────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'server-log')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('LOG_ENABLED',           'เปิดระบบ Log',          'เปิด/ปิดการบันทึก log ทั้งหมด'::text,                                       'BOOLEAN',    FALSE, FALSE, 'false', 10),
  ('LOG_CHANNEL_ID',        'ห้องส่ง Log',           'ห้องที่จะให้ Webhook ส่ง log เข้าไป (บอทต้องมีสิทธิ์ Manage Webhooks ในห้องนี้)', 'CHANNEL_ID', FALSE, FALSE, NULL::text, 20),
  ('LOG_MESSAGE_EVENTS',    'Log ข้อความ',           'บันทึกเมื่อมีการลบ/แก้ไขข้อความ (ต้องเปิด Message Content Intent)',          'BOOLEAN',    FALSE, FALSE, 'true',  30),
  ('LOG_MEMBER_EVENTS',     'Log สมาชิก',            'บันทึกเมื่อสมาชิกเข้า/ออก, เปลี่ยนชื่อเล่น หรือยศ (ต้องเปิด Server Members Intent)', 'BOOLEAN', FALSE, FALSE, 'true',  40),
  ('LOG_MODERATION_EVENTS', 'Log การจัดการ',         'บันทึกเมื่อมีการแบน/ปลดแบน หรือ timeout สมาชิก',                            'BOOLEAN',    FALSE, FALSE, 'true',  50),
  ('LOG_CHANNEL_EVENTS',    'Log ห้อง',              'บันทึกเมื่อมีการสร้าง/ลบ/แก้ไขห้อง',                                        'BOOLEAN',    FALSE, FALSE, 'true',  60),
  ('LOG_VOICE_EVENTS',      'Log ห้องเสียง',         'บันทึกเมื่อสมาชิกเข้า/ออก/ย้ายห้องเสียง',                                    'BOOLEAN',    FALSE, FALSE, 'false', 70)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;


-- ─── Embed slot: log_base — configurable frame for every log embed ───────────
-- The bot reads this via ctx.services.embeds.getConfig('log_base') and overlays
-- per-event title / description / fields + a per-event accent color. color here is
-- the fallback accent; author/footer apply to every log embed if set.
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  ('server-log', 'log_base', 'กรอบ Log (ทุกเหตุการณ์)',
   'หน้าตาหลักของ embed log ทุกอัน — สี (สำรอง), author, footer. บอทจะใส่หัวข้อ/รายละเอียด/'
   || 'ฟิลด์ของแต่ละเหตุการณ์ และสีตามประเภทเหตุการณ์ให้เอง.',
   ARRAY['event','actor','time'],
   '{"color": 3092790, "footer": {"text": "Server Log"}}'::jsonb, 10)
ON CONFLICT (feature_code, slot_key) DO NOTHING;
