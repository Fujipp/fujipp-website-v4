-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: member-spending feature (port of legacy discord-bot-002-idaxdshop /topup).
--
-- A MANUAL membership / spending tracker — distinct from the automated wallet
-- (wallet-topup / wallet-history / top-spender-rank). An admin records a member's
-- spend with /topup add; the bot posts a "บัตรสมาชิกร้านไอด้า" membership card
-- (editable in the Embed Designer — slots spending_card_first / spending_card_next),
-- tracks {amount, count} per member, grants a first-tier role then an upgrade role at
-- a threshold, and keeps Top1 / Top5 reward roles refreshed from the leaderboard.
--
-- Config keys mirror the central-bot feature module 1:1 (env injected per subject).
-- No prices seeded — built but not for sale yet (grant per-bot via admin, like
-- review-credit). Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('member-spending',
   'Member Spending Card',
   'บัตรสมาชิก/ระบบยอดใช้จ่ายแบบกรอกเอง — แอดมินบันทึกยอดที่ลูกค้าใช้ผ่าน /topup add บอทจะโพสต์ '
   || '“บัตรสมาชิกร้าน” (แก้หน้าตาได้ใน Embed Designer) เก็บยอดสะสม+จำนวนครั้งต่อคน แจกยศแรกเริ่ม '
   || 'และยศอัปเกรดเมื่อถึงเกณฑ์ พร้อมจัดอันดับ Top1/Top5 อัตโนมัติ. เป็นคนละระบบกับการเติมเงิน '
   || 'อัตโนมัติ — ยอดทั้งหมดกรอกเอง ไม่ผูกกับการชำระเงิน.',
   'SHOP', FALSE, 86, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: member-spending ──────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'member-spending')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('SPENDING_FIRST_ROLE_ID',    'ยศแรกเริ่ม',          'ยศที่แจกให้ทันทีเมื่อลูกค้ามียอดใช้จ่ายครั้งแรก'::text,            'ROLE_ID', FALSE, FALSE, NULL::text, 10),
  ('SPENDING_UPGRADED_ROLE_ID', 'ยศอัปเกรด',           'ยศที่แจกเมื่อยอดสะสมถึงเกณฑ์ (ยอดเงินหรือจำนวนครั้ง)',             'ROLE_ID', FALSE, FALSE, NULL::text, 20),
  ('SPENDING_TOP1_ROLE_ID',     'ยศอันดับ 1',          'ยศสำหรับลูกค้าที่ใช้จ่ายสูงสุดอันดับ 1',                          'ROLE_ID', FALSE, FALSE, NULL::text, 30),
  ('SPENDING_TOP5_ROLE_ID',     'ยศอันดับ 2–5',        'ยศสำหรับลูกค้าที่ใช้จ่ายสูงสุดอันดับ 2 ถึง 5',                    'ROLE_ID', FALSE, FALSE, NULL::text, 40),
  ('SPENDING_UPGRADE_AMOUNT',   'เกณฑ์ยอดเงินอัปเกรด', 'ยอดสะสม (บาท) ที่ทำให้ได้ยศอัปเกรด',                              'NUMBER',  FALSE, FALSE, '2000',     50),
  ('SPENDING_UPGRADE_COUNT',    'เกณฑ์จำนวนครั้งอัปเกรด','จำนวนครั้งสะสมที่ทำให้ได้ยศอัปเกรด',                            'NUMBER',  FALSE, FALSE, '5',        60)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;
