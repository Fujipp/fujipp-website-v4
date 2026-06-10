-- ═════════════════════════════════════════════════════════════════════════════
-- roblox-robux-payout: PAYMENT_REFRESH_INTERVAL config template.
--
-- The shop panel (/panel) now auto-refreshes its live group-stock fields and
-- countdown like the legacy Kanom payment embed. This key controls the edit
-- interval in milliseconds (default 10000, floor 5000 enforced by the bot).
-- Also clarifies PAYMENT_COUNTDOWN_TARGET: ISO datetime (absolute) OR seconds
-- counted from when the panel is posted.
--
-- Data-only, idempotent (same upsert pattern as 20260605170000).
-- ═════════════════════════════════════════════════════════════════════════════

WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'roblox-robux-payout')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('PAYMENT_REFRESH_INTERVAL', 'รอบอัปเดตแผงร้าน (ms)',
   'แผงร้านอัปเดตยอดกลุ่ม/นับถอยหลังทุกกี่มิลลิวินาที (ต่ำสุด 5000)'::text,
   'NUMBER', FALSE, FALSE, '10000'::text, 105)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;

-- PAYMENT_COUNTDOWN_TARGET now accepts ISO datetime or seconds-from-post.
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'roblox-robux-payout')
UPDATE billing.feature_variable_templates t
   SET description = 'ISO 8601 (เช่น 2026-12-31T00:00:00+07:00) หรือจำนวนวินาทีนับจากตอนโพสต์แผงร้าน'
  FROM f
 WHERE t.feature_id = f.id AND t.variable_key = 'PAYMENT_COUNTDOWN_TARGET';
