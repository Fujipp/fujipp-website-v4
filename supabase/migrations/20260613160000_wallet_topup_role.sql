-- ═════════════════════════════════════════════════════════════════════════════
-- wallet-topup: a dedicated "top-up role" (TOPUP_ROLE_ID).
--
-- Anyone who tops up (SlipOK / TrueMoney / /wallet-add) gets this role — a simple
-- "is a paying member" badge, separate from the Top Spender rank/milestone roles
-- (which depend on the lifetime leaderboard). Shows in the Shop Wallet & Top-up tab.
--
-- Data-only, idempotent (same upsert pattern as 20260610150000).
-- ═════════════════════════════════════════════════════════════════════════════

WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'wallet-topup')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('TOPUP_ROLE_ID', 'ยศตอนเติมเงิน', 'ยศที่ให้สมาชิกทันทีเมื่อเติมเงินสำเร็จ (เว้นว่าง = ไม่ให้ยศ)'::text, 'ROLE_ID', FALSE, FALSE, NULL::text, 110)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
