-- ═════════════════════════════════════════════════════════════════════════════
-- New config field type ROLE_TIER_LIST + apply it to บันทึกยอดเติม's amount tiers.
--
-- ROLE_TIER_LIST is edited in the bot config form as repeatable rows of
-- "amount (บาท) + role dropdown" with add/remove — friendlier than a raw JSON box.
-- It is stored EXACTLY like the previous JSON value ([{"amount":N,"roleId":"..."}]),
-- so central-bot needs no change (it still parses the same shape). value_type is a
-- free-form string in billing-service, so no backend code change either.
-- Idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE billing.feature_variable_templates
  DROP CONSTRAINT IF EXISTS feature_variable_templates_type_chk;
ALTER TABLE billing.feature_variable_templates
  ADD CONSTRAINT feature_variable_templates_type_chk CHECK (value_type IN
    ('STRING','TEXT','NUMBER','BOOLEAN','CHANNEL_ID','ROLE_ID','USER_ID','SECRET','JSON','STRING_LIST','ENUM','ROLE_TIER_LIST'));


UPDATE billing.feature_variable_templates SET
  value_type  = 'ROLE_TIER_LIST',
  label       = 'ยศอัปเกรดตามยอด',
  description = 'เพิ่มได้หลายขั้น — แต่ละขั้นตั้งยอด (บาท) แล้วเลือกยศ. ลูกค้าจะได้ยศเมื่อยอดสะสมถึงขั้นนั้น'
WHERE feature_id = (SELECT id FROM billing.feature_catalog WHERE code = 'member-spending')
  AND variable_key = 'SPENDING_UPGRADE_TIERS';
