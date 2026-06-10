-- ═════════════════════════════════════════════════════════════════════════════
-- Roblox Robux Payout: numbered multi-group config templates (1–3)
--
-- The original seed (20260605170000_seed_roblox_feature.sql) modelled a SINGLE
-- Roblox group with one set of keys (ROBLOX_GROUP_ID / _SECURITY_COOKIE /
-- _TOTP_SECRET / _GROUP_NAME) plus an advanced ROBLOX_GROUPS JSON blob for power
-- users. The customer-facing config form is being redesigned to support up to
-- THREE groups via dedicated, form-friendly fields instead of hand-written JSON.
--
-- central-bot already reads ROBLOX_*_1/_2/_3 (roblox.js → getNumberedGroupConfigs),
-- so the runtime needs no change; this migration only registers the matching
-- feature_variable_templates so the platform persists + injects those keys.
--
-- Group 1 is required (id + cookie + totp). Groups 2 and 3 are optional. Secrets
-- (cookie, totp) are is_sensitive = TRUE → masked in the form and never returned.
--
-- Backward compatibility: the legacy single keys AND ROBLOX_GROUPS JSON are kept
-- so existing bots keep working, but the single keys are downgraded to
-- is_required = FALSE — the numbered keys (group 1) are now the canonical input,
-- and the UI no longer relies on the JSON blob.
--
-- ROBUX_RATE meaning is clarified to "Robux per 1 baht" (e.g. 4 → ฿1 = 4 Robux),
-- matching the redeem cost formula (costSatang = ceil(robux / rate * 100)) and the
-- panel modal label. ROBUX_PAYOUT_COOLDOWN default is raised to 5s and
-- PAYMENT_COUNTDOWN_TARGET is redefined as a countdown length in seconds.
--
-- Data-only against existing billing tables — no schema change, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Numbered group templates (1–3) ──────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'roblox-robux-payout')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  -- Group 1 (required)
  ('ROBLOX_GROUP_ID_1',        'Group 1 · Group ID',          'ไอดีกลุ่ม Roblox หลักที่ใช้จ่าย Robux'::text,            'NUMBER', TRUE,  FALSE, NULL::text, 110),
  ('ROBLOX_SECURITY_COOKIE_1', 'Group 1 · .ROBLOSECURITY',    'คุกกี้ล็อกอินเจ้าของกลุ่ม 1 — ความลับสูงสุด',            'SECRET', TRUE,  TRUE,  NULL,       111),
  ('ROBLOX_TOTP_SECRET_1',     'Group 1 · 2FA TOTP Secret',   'Secret ของ Authenticator กลุ่ม 1 ใช้ยืนยัน 2FA',         'SECRET', TRUE,  TRUE,  NULL,       112),
  ('ROBLOX_GROUP_NAME_1',      'Group 1 · ชื่อกลุ่ม (แสดงผล)', 'ชื่อกลุ่ม 1 ที่โชว์ใน embed',                            'STRING', FALSE, FALSE, NULL,       113),
  -- Group 2 (optional)
  ('ROBLOX_GROUP_ID_2',        'Group 2 · Group ID',          'ไอดีกลุ่มที่ 2 (ไม่บังคับ)',                            'NUMBER', FALSE, FALSE, NULL,       120),
  ('ROBLOX_SECURITY_COOKIE_2', 'Group 2 · .ROBLOSECURITY',    'คุกกี้ล็อกอินเจ้าของกลุ่ม 2 — ความลับสูงสุด',            'SECRET', FALSE, TRUE,  NULL,       121),
  ('ROBLOX_TOTP_SECRET_2',     'Group 2 · 2FA TOTP Secret',   'Secret ของ Authenticator กลุ่ม 2 ใช้ยืนยัน 2FA',         'SECRET', FALSE, TRUE,  NULL,       122),
  ('ROBLOX_GROUP_NAME_2',      'Group 2 · ชื่อกลุ่ม (แสดงผล)', 'ชื่อกลุ่ม 2 ที่โชว์ใน embed',                            'STRING', FALSE, FALSE, NULL,       123),
  -- Group 3 (optional)
  ('ROBLOX_GROUP_ID_3',        'Group 3 · Group ID',          'ไอดีกลุ่มที่ 3 (ไม่บังคับ)',                            'NUMBER', FALSE, FALSE, NULL,       130),
  ('ROBLOX_SECURITY_COOKIE_3', 'Group 3 · .ROBLOSECURITY',    'คุกกี้ล็อกอินเจ้าของกลุ่ม 3 — ความลับสูงสุด',            'SECRET', FALSE, TRUE,  NULL,       131),
  ('ROBLOX_TOTP_SECRET_3',     'Group 3 · 2FA TOTP Secret',   'Secret ของ Authenticator กลุ่ม 3 ใช้ยืนยัน 2FA',         'SECRET', FALSE, TRUE,  NULL,       132),
  ('ROBLOX_GROUP_NAME_3',      'Group 3 · ชื่อกลุ่ม (แสดงผล)', 'ชื่อกลุ่ม 3 ที่โชว์ใน embed',                            'STRING', FALSE, FALSE, NULL,       133)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;


-- ─── Legacy single keys → optional (kept for backward compatibility) ──────────
UPDATE billing.feature_variable_templates t
SET is_required = FALSE
FROM billing.feature_catalog f
WHERE t.feature_id = f.id
  AND f.code = 'roblox-robux-payout'
  AND t.variable_key IN ('ROBLOX_GROUP_ID', 'ROBLOX_SECURITY_COOKIE', 'ROBLOX_TOTP_SECRET');


-- ─── Clarify ROBUX_RATE / cooldown / countdown semantics ─────────────────────
UPDATE billing.feature_variable_templates t
SET label         = 'เรท Robux (1 บาท ได้กี่ Robux)',
    description   = 'จำนวน Robux ที่ลูกค้าได้รับต่อ 1 บาท เช่น 4 = ฿1 ได้ 4 Robux',
    default_value = '4'
FROM billing.feature_catalog f
WHERE t.feature_id = f.id
  AND f.code = 'roblox-robux-payout'
  AND t.variable_key = 'ROBUX_RATE';

UPDATE billing.feature_variable_templates t
SET default_value = '5'
FROM billing.feature_catalog f
WHERE t.feature_id = f.id
  AND f.code = 'roblox-robux-payout'
  AND t.variable_key = 'ROBUX_PAYOUT_COOLDOWN';

UPDATE billing.feature_variable_templates t
SET label       = 'เวลานับถอยหลัง (วินาที)',
    description  = 'ความยาวการนับถอยหลังบน embed ราคา เป็นวินาที เช่น 60 หรือ 300'
FROM billing.feature_catalog f
WHERE t.feature_id = f.id
  AND f.code = 'roblox-robux-payout'
  AND t.variable_key = 'PAYMENT_COUNTDOWN_TARGET';
