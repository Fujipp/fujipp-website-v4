-- ═════════════════════════════════════════════════════════════════════════════
-- wallet-topup: add SLIP_ACCESS_ROLE_ID — a temporary role granted when a member
-- starts a PromptPay top-up so they can see SLIP_CHECK_CHANNEL, then removed when
-- the QR window (TOPUP_QR_TIMEOUT) closes. Optional (blank = don't grant a role).
-- Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'wallet-topup')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('SLIP_ACCESS_ROLE_ID', 'ยศเข้าห้องเช็คสลิป (ชั่วคราว)',
   'ให้ยศนี้ตอนกดเติมผ่านพร้อมเพย์ (เพื่อให้เห็นห้องเช็คสลิป) แล้วถอดออกเมื่อ QR หมดอายุตาม "เวลาหมดอายุ QR" (เว้นว่าง = ไม่ให้ยศ)'::text,
   'ROLE_ID', FALSE, FALSE, NULL::text, 95)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
