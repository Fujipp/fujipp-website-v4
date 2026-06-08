-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: Roblox Robux Payout feature (+ coupled Wallet Top-up feature)
--
-- Defines the FIRST sellable Feature Bot capability in the billing catalog,
-- together with its full config schema (feature_variable_templates) that drives
-- the customer-facing config form and, later, the central-bot runtime env.
--
-- Two features are seeded because they are coupled:
--   roblox-robux-payout  (ROBLOX)  — pays Robux out of a Roblox group via 2FA
--   wallet-topup         (PAYMENT) — the in-bot shop wallet that Robux is paid from
-- Robux payout debits the *in-bot shop wallet* (the customer's Discord members),
-- which is filled by wallet-topup. This is a SEPARATE layer from the platform
-- billing wallet (which is how the SaaS customer pays Fujipp for runtime).
--
-- Config variable keys mirror the original bot's env names 1:1 so the central-bot
-- can read them directly once built. Secrets (cookie, TOTP, API keys) are flagged
-- is_sensitive = TRUE so the form masks them and storage encrypts them later.
--
-- NOTE: pricing (feature_prices) is intentionally left out — it is a business
-- decision. A feature with no active price is visible but not purchasable, so this
-- seed is safe to ship before prices are set. Add a feature_prices follow-up to
-- make these buyable.
--
-- Data-only seed against existing billing tables — no schema change, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Feature catalog rows ────────────────────────────────────────────────────
INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('roblox-robux-payout',
   'Roblox Robux Payout',
   'จ่าย Robux ออกจากกลุ่ม Roblox อัตโนมัติ (รองรับ 2FA), เช็คสิทธิ์รับ Robux, ดูยอดกลุ่ม. '
   || 'ต้องเปิดใช้คู่กับฟีเจอร์ wallet-topup เพราะหัก Robux จากกระเป๋าร้านของสมาชิก.',
   'ROBLOX', TRUE, 10, TRUE),
  ('wallet-topup',
   'Shop Wallet & Top-up',
   'กระเป๋าเงินร้านในบอท: เติมเงินผ่านสลิป (SlipOK) และ TrueMoney Wallet, '
   || 'เก็บยอด/ประวัติการเติมของสมาชิกในเซิร์ฟเวอร์.',
   'PAYMENT', FALSE, 20, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: roblox-robux-payout ──────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'roblox-robux-payout')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('ROBLOX_GROUP_ID',          'Roblox Group ID',            'ไอดีกลุ่ม Roblox ที่ใช้จ่าย Robux'::text,                         'NUMBER',     TRUE,  FALSE, NULL::text,  10),
  ('ROBLOX_SECURITY_COOKIE',   '.ROBLOSECURITY Cookie',      'คุกกี้ล็อกอินบัญชีเจ้าของกลุ่ม — ความลับสูงสุด ห้ามเปิดเผย',        'SECRET',     TRUE,  TRUE,  NULL,        20),
  ('ROBLOX_TOTP_SECRET',       '2FA TOTP Secret',            'Secret ของ Authenticator ใช้ยืนยัน 2FA ตอนจ่าย Robux',           'SECRET',     TRUE,  TRUE,  NULL,        30),
  ('ROBLOX_GROUP_NAME',        'ชื่อกลุ่ม (แสดงผล)',           'ชื่อกลุ่มที่ใช้โชว์ใน embed',                                       'STRING',     FALSE, FALSE, NULL,        40),
  ('ROBUX_RATE',               'เรทแลก Robux (บาท/Robux)',    'ราคาบาทต่อ 1 Robux เช่น 0.25 — ปรับตามร้าน',                       'NUMBER',     TRUE,  FALSE, NULL,        50),
  ('ROBUX_ENABLED',            'เปิดระบบจ่าย Robux',           'ปิดชั่วคราวได้โดยไม่ต้องลบ config',                                 'BOOLEAN',    FALSE, FALSE, 'true',      60),
  ('ROBUX_PAYOUT_COOLDOWN',    'คูลดาวน์การจ่าย (วินาที)',     'หน่วงเวลาขั้นต่ำระหว่างการจ่ายแต่ละครั้ง',                          'NUMBER',     FALSE, FALSE, '0',         70),
  ('ROBUX_NOTIFY_CHANNEL',     'ช่องแจ้งเตือนการจ่าย Robux',   'ห้องที่บอทจะโพสต์สรุปเมื่อจ่าย Robux สำเร็จ',                       'CHANNEL_ID', FALSE, FALSE, NULL,        80),
  ('PAYMENT_COUNTDOWN_ENABLED','เปิดนับถอยหลังโปรโมชัน',       'แสดงตัวนับถอยหลังบน embed ราคา',                                  'BOOLEAN',    FALSE, FALSE, 'false',     90),
  ('PAYMENT_COUNTDOWN_TARGET', 'เวลาเป้าหมายนับถอยหลัง',       'รูปแบบ ISO 8601 เช่น 2026-12-31T00:00:00+07:00',                  'STRING',     FALSE, FALSE, NULL,       100),
  ('ROBLOX_GROUPS',            'หลายกลุ่ม (ขั้นสูง — JSON)',    'ตั้งหลายกลุ่มพร้อม cookie/totp ต่อกลุ่ม; ถ้าตั้งจะทับค่าเดี่ยวด้านบน', 'JSON',       FALSE, TRUE,  NULL,       110)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;


-- ─── Config schema: wallet-topup ─────────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'wallet-topup')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('API_SLIPOK_KEY',       'SlipOK API Key',              'คีย์ API ของ SlipOK สำหรับตรวจสลิป'::text,           'SECRET', TRUE,  TRUE,  NULL::text, 10),
  ('SLIPOK_BRANCH_ID',     'SlipOK Branch ID',            'รหัสสาขาใน SlipOK',                                'STRING', TRUE,  FALSE, NULL,       20),
  ('PROMPTPAY_NUMBER',     'เบอร์/พร้อมเพย์รับเงิน',        'เบอร์โทรหรือเลขบัตรประชาชนที่ผูกพร้อมเพย์',           'STRING', TRUE,  FALSE, NULL,       30),
  ('MIN_TOPUP',            'เติมขั้นต่ำ (บาท)',             'ยอดเติมต่ำสุดที่ร้านยอมรับ',                          'NUMBER', FALSE, FALSE, '20',       40),
  ('API_TRUEMONEY_KEY_ID', 'TrueMoney Key ID',            'คีย์สำหรับตรวจซองอั่งเปา TrueMoney (ถ้าใช้)',          'SECRET', FALSE, TRUE,  NULL,       50),
  ('TRUEMONEY_PHONE',      'เบอร์ TrueMoney Wallet รับเงิน','เบอร์ปลายทางที่รับซอง TrueMoney',                    'STRING', FALSE, FALSE, NULL,       60),
  ('TRUEMONEY_BASE',       'TrueMoney API Base URL',      'override endpoint (เว้นว่างใช้ค่าเริ่มต้น)',           'STRING', FALSE, FALSE, NULL,       70),
  ('TRUEMONEY_FEE',        'ค่าธรรมเนียม TrueMoney (%)',   'หักเปอร์เซ็นต์จากยอดเติมผ่าน TrueMoney',              'NUMBER', FALSE, FALSE, '0',        80)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
