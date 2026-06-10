-- ═════════════════════════════════════════════════════════════════════════════
-- wallet-topup: config templates for the PromptPay QR + SlipOK slip flow.
--
-- central-bot now ports the legacy Kanom slip top-up (bank_slipOk.js/check_slip.js):
-- the member requests a PromptPay QR, pays, and posts the slip in a check channel
-- where SlipOK verifies it and the wallet is credited. These keys configure that
-- flow (the SlipOK/TrueMoney credentials themselves were seeded earlier).
--
-- Data-only, idempotent (same upsert pattern as 20260605170000).
-- ═════════════════════════════════════════════════════════════════════════════

WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'wallet-topup')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('PROMPTPAY_ACCOUNT_NAME', 'ชื่อบัญชีพร้อมเพย์ (แสดงผล)', 'ชื่อบัญชีที่โชว์ใน embed ตอนสแกนจ่าย'::text,                          'STRING',     FALSE, FALSE, NULL::text, 35),
  ('TOPUP_QR_TIMEOUT',       'เวลาหมดอายุ QR (นาที)',        'นับถอยหลังให้ชำระภายในกี่นาที',                                     'NUMBER',     FALSE, FALSE, '5',        45),
  ('SLIP_CHECK_CHANNEL',     'ช่องเช็คสลิป',                  'ห้องที่สมาชิกแนบรูปสลิปให้บอทตรวจกับ SlipOK — ต้องเปิด Message Content Intent ใน Discord Dev Portal', 'CHANNEL_ID', FALSE, FALSE, NULL,       90),
  ('TOPUP_NOTIFY_CHANNEL',   'ช่องแจ้งเตือนเติมเงิน',          'ห้องที่บอทโพสต์สรุปเมื่อเติมเงินสำเร็จ',                              'CHANNEL_ID', FALSE, FALSE, NULL,      100)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
