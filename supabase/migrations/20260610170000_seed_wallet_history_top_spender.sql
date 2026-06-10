-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: wallet-history + top-spender-rank features.
--
-- Ports the last two legacy Kanom capabilities into the catalog:
--   wallet-history   (PAYMENT) — /history (ledger view), /wallet-get, /wallet-set
--   top-spender-rank (UTILITY) — /top leaderboard + rank/milestone reward roles
-- Both depend on wallet-topup (they read the shop wallet/ledger).
--
-- No prices seeded — visible but not purchasable until priced (same pattern as
-- the roblox seed). Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('wallet-history',
   'Wallet History',
   'ดูประวัติการเติมเงินของสมาชิกจาก ledger, เช็ค/ตั้งยอดเงินโดยแอดมิน. ใช้คู่กับ wallet-topup.',
   'PAYMENT', FALSE, 30, TRUE),
  ('top-spender-rank',
   'Top Spender Rank',
   'จัดอันดับยอดเติมสะสม + แจกยศ Top 1 / Top 10 และยศตามยอดสะสม (milestone). ใช้คู่กับ wallet-topup. '
   || 'ต้องเปิด Server Members Intent ใน Discord Dev Portal เมื่อใช้ระบบแจกยศ.',
   'UTILITY', FALSE, 40, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: wallet-history ───────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'wallet-history')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('WALLET_HISTORY_DEFAULT_LIMIT', 'จำนวนรายการเริ่มต้น', 'จำนวนประวัติที่โชว์เมื่อไม่ระบุ limit (1-50)'::text, 'NUMBER', FALSE, FALSE, '10'::text, 10)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;


-- ─── Config schema: top-spender-rank ─────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'top-spender-rank')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('TOP_SPENDER_TOP1_ROLE_ID',        'ยศอันดับ 1',              'ยศที่ให้เฉพาะอันดับ 1'::text,                                       'ROLE_ID',    FALSE, FALSE, NULL::text, 10),
  ('TOP_SPENDER_TOP10_ROLE_ID',       'ยศอันดับ 1-10',           'ยศที่ให้อันดับ 1 ถึง 10',                                           'ROLE_ID',    FALSE, FALSE, NULL,       20),
  ('TOP_SPENDER_MILESTONE_ROLES',     'ยศตามยอดสะสม (JSON)',     'เช่น [{"threshold":10000,"roleId":"..."}] — threshold เป็นบาท',     'JSON',       FALSE, FALSE, NULL,       30),
  ('TOP_SPENDER_LEADERBOARD_CHANNEL', 'ช่องโพสต์ Leaderboard',    'ห้องที่บอทโพสต์ Top 10 หลังรัน /top (เว้นว่าง = ไม่โพสต์)',          'CHANNEL_ID', FALSE, FALSE, NULL,       40)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
