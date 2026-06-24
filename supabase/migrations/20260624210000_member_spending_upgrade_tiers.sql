-- ═════════════════════════════════════════════════════════════════════════════
-- member-spending: replace the single upgrade role with multiple amount tiers.
--
-- Before: one SPENDING_UPGRADED_ROLE_ID granted at SPENDING_UPGRADE_AMOUNT (baht), OR
-- when the purchase count reached SPENDING_UPGRADE_COUNT.
-- After: a list of amount tiers (SPENDING_UPGRADE_TIERS, JSON [{amount, roleId}]) so a
-- shop can reward e.g. 5000฿ → role A and 10000฿ → role B, plus two toggles:
--   SPENDING_TIER_STACK   — keep every tier reached (stack) vs only the highest tier
--   SPENDING_COUNT_ENABLED — whether the purchase-count threshold also grants the
--                            lowest tier (off = ignore count entirely)
-- SPENDING_UPGRADE_COUNT stays as the count threshold (used only when count is enabled).
-- Idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Remove the old single-role upgrade fields (+ any orphaned saved values) ──
DELETE FROM billing.feature_variable_templates
 WHERE feature_id = (SELECT id FROM billing.feature_catalog WHERE code = 'member-spending')
   AND variable_key IN ('SPENDING_UPGRADED_ROLE_ID', 'SPENDING_UPGRADE_AMOUNT');

DELETE FROM billing.feature_config_values
 WHERE feature_id = (SELECT id FROM billing.feature_catalog WHERE code = 'member-spending')
   AND config_key IN ('SPENDING_UPGRADED_ROLE_ID', 'SPENDING_UPGRADE_AMOUNT');


-- ─── Add the tier list + toggles, and re-tidy sort order ─────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'member-spending')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('SPENDING_UPGRADE_TIERS', 'ยศอัปเกรดตามยอด (JSON)', 'รายการยศตามยอดสะสม เช่น [{"amount":5000,"roleId":"123"},{"amount":10000,"roleId":"456"}] — amount เป็นบาท'::text, 'JSON',    FALSE, FALSE, NULL::text, 20),
  ('SPENDING_TIER_STACK',    'ยศซ้อนกัน (สะสมทุกขั้น)', 'เปิด = ได้ยศทุกขั้นที่ถึง (เช่น ถึง 10000 ได้ทั้งยศ 5000 และ 10000). ปิด = ได้แค่ยศขั้นสูงสุดขั้นเดียว (ถอดขั้นต่ำกว่าออก)', 'BOOLEAN', FALSE, FALSE, 'true',  25),
  ('SPENDING_COUNT_ENABLED', 'อิงเกณฑ์จำนวนครั้ง',     'เปิด = ครบจำนวนครั้งตามเกณฑ์จะได้ยศขั้นต่ำสุดด้วย แม้ยอดเงินยังไม่ถึง. ปิด = ไม่สนจำนวนครั้งเลย', 'BOOLEAN', FALSE, FALSE, 'false', 50)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;


-- Clarify the count threshold field + place it right after the count toggle.
UPDATE billing.feature_variable_templates SET
  label       = 'เกณฑ์จำนวนครั้ง',
  description = 'จำนวนครั้งสะสมที่ทำให้ได้ยศขั้นต่ำสุด — ใช้เมื่อเปิด “อิงเกณฑ์จำนวนครั้ง”',
  sort_order  = 55
WHERE feature_id = (SELECT id FROM billing.feature_catalog WHERE code = 'member-spending')
  AND variable_key = 'SPENDING_UPGRADE_COUNT';
