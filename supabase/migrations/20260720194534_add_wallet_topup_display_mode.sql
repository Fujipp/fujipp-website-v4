-- Let each customer bot keep the existing Embed Designer output or opt into the
-- component-driven Wallet & Top-up flow. EMBED is deliberately the default so
-- existing bots do not change appearance until their owner chooses V2.

WITH feature AS (
  SELECT id
  FROM billing.feature_catalog
  WHERE code = 'wallet-topup'
)
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required,
   is_sensitive, default_value, options, sort_order)
SELECT feature.id,
       'TOPUP_DISPLAY_MODE',
       'รูปแบบข้อความเติมเงิน',
       'เลือกใช้ Embed Designer แบบเดิม หรือ Components V2 สำหรับแผงและสถานะการเติมเงิน',
       'ENUM',
       TRUE,
       FALSE,
       'EMBED',
       '[{"value":"EMBED","label":"Embed แบบเดิม"},{"value":"COMPONENTS_V2","label":"Components V2"}]',
       5
FROM feature
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type,
  is_required = EXCLUDED.is_required,
  is_sensitive = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  options = EXCLUDED.options,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
