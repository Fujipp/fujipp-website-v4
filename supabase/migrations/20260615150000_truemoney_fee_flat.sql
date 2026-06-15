-- ═════════════════════════════════════════════════════════════════════════════
-- TrueMoney top-up fee: make it configurable as a percent AND/OR a flat baht
-- amount (both default 0 = no fee, and they stack). Previously only TRUEMONEY_FEE
-- (%) existed and the bot never applied it.
--
-- Also expose {{fee}} and {{gross}} on the topup_success embed so a shop can show
-- the deducted fee / original voucher amount if it wants (amount = net credited).
-- ═════════════════════════════════════════════════════════════════════════════

-- Add the flat-baht fee field + clarify the percent field's description.
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'wallet-topup')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('TRUEMONEY_FEE_FLAT', 'ค่าธรรมเนียม TrueMoney (บาท)',
   'หักเป็นจำนวนบาทคงที่ต่อซองทรู (0 = ไม่หัก) — รวมกับแบบ % ได้'::text,
   'NUMBER', FALSE, FALSE, '0'::text, 81)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;

UPDATE billing.feature_variable_templates t
SET label = 'ค่าธรรมเนียม TrueMoney (%)',
    description = 'หักเป็นเปอร์เซ็นต์จากยอดซองทรู (0 = ไม่หัก) — รวมกับแบบบาทได้'
FROM billing.feature_catalog fc
WHERE fc.id = t.feature_id AND fc.code = 'wallet-topup' AND t.variable_key = 'TRUEMONEY_FEE';

-- Make {{fee}} / {{gross}} available on the success embed.
UPDATE bots.embed_slots
SET available_vars = ARRAY['member', 'amount', 'total_balance', 'method', 'datetime', 'fee', 'gross']
WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_success';
