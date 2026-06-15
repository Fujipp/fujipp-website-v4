-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: review-credit feature.
--
-- Ports the legacy Aka Shop (discord-bot-003) review counter into the catalog:
--   review-credit (ENGAGEMENT) — on every member message in the review channel:
--     count it, react with configured emojis, optionally grant a role, rename the
--     channel to "<template with {count}>", and reply with a configured message
--     (deleting the previous reply). Admin commands /checkcredit (recount + sync)
--     and /recredit (re-apply reaction/reply to the latest message).
--
-- Counter state lives in shop.review_credit_state (see the previous migration).
-- No prices seeded — visible but not purchasable until priced (same pattern as the
-- roblox and wallet-history seeds). Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('review-credit',
   'Review Credit',
   'นับรีวิวอัตโนมัติในห้องรีวิว: ทุกข้อความของสมาชิกจะถูกนับ, กดรีแอคชัน, รีพายข้อความขอบคุณ, '
   || 'เปลี่ยนชื่อห้องตามจำนวนรีวิว และให้ยศลูกค้าได้ (ถ้าตั้งค่า). มีคำสั่ง /checkcredit นับใหม่ทั้งห้อง '
   || 'และ /recredit รีเฟรชรีแอคชัน/รีพายล่าสุด. ตั้งค่าได้ทุกอย่าง.',
   'ENGAGEMENT', FALSE, 50, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: review-credit ────────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'review-credit')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('REVIEW_CHANNEL_ID',            'ห้องรีวิว',              'ห้องที่บอทนับรีวิว + รีแอค + รีพาย + เปลี่ยนชื่อ'::text,                                  'CHANNEL_ID', TRUE,  FALSE, NULL::text,                  10),
  ('REVIEW_CHANNEL_NAME_TEMPLATE', 'รูปแบบชื่อห้อง',         'ใช้ {count} แทนจำนวนรีวิว เช่น "꒰💯꒱┆review 〻{count}"',                                  'STRING',     FALSE, FALSE, '꒰💯꒱┆review 〻{count}',     20),
  ('REVIEW_REPLY_MESSAGES',        'ข้อความรีพาย (JSON)',    'อาเรย์ข้อความ สุ่มมา 1 อันต่อรีวิว เช่น ["ขอบคุณนะคะ","ไว้มาอุดหนุนใหม่"] (เว้นว่าง = ไม่รีพาย)', 'JSON',       FALSE, FALSE, NULL,                        30),
  ('REVIEW_REACTIONS',             'รีแอคชัน (JSON)',        'อาเรย์อิโมจิที่กดให้ทุกรีวิว เช่น ["⭐","❤️"] (เว้นว่าง = ไม่กดรีแอค)',                       'JSON',       FALSE, FALSE, NULL,                        40),
  ('REVIEW_DELETE_OLD_REPLY',      'ลบรีพายเก่า',           'ลบข้อความรีพายอันก่อนหน้าก่อนรีพายอันใหม่ (กันห้องรก)',                                  'BOOLEAN',    FALSE, FALSE, 'true',                      50),
  ('REVIEW_DEFAULT_ROLE_ID',       'ยศลูกค้ารีวิว',          'ยศที่ให้สมาชิกอัตโนมัติเมื่อโพสต์รีวิว (เว้นว่าง = ไม่ให้ยศ)',                              'ROLE_ID',    FALSE, FALSE, NULL,                        60)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
