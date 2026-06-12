-- ═════════════════════════════════════════════════════════════════════════════
-- Add a custom-package config variable to roblox-robux-payout.
--
-- Robux packages were derived from ROBUX_RATE via fixed price tables in central-bot.
-- ROBUX_PACKAGES lets a shop define its OWN list of {robux, price} packages; when
-- set (valid non-empty JSON array) the central-bot uses it instead of the rate
-- tables, otherwise it falls back to ROBUX_RATE as before. Example value:
--   [{"robux":200,"price":58},{"robux":500,"price":140}]
--
-- Idempotent: ON CONFLICT DO UPDATE keeps the template definition in sync.
-- ═════════════════════════════════════════════════════════════════════════════
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'roblox-robux-payout')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('ROBUX_PACKAGES', 'แพ็กเกจ Robux เอง (JSON)',
   'กำหนดรายการแพ็กเกจเองเป็น JSON เช่น [{"robux":200,"price":58},{"robux":500,"price":140}]; '
   || 'ถ้าตั้งค่าไว้จะใช้แทนการคำนวณจากเรท (ROBUX_RATE)',
   'JSON', FALSE, FALSE, NULL::text, 55)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
