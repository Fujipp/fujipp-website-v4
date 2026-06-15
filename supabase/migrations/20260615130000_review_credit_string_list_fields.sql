-- ═════════════════════════════════════════════════════════════════════════════
-- Add the STRING_LIST config value type and switch review-credit's reply messages
-- + reactions to it.
--
-- STRING_LIST is stored exactly like JSON (a JSON string array, so the bot still
-- reads it with config.json) but the web form edits it as one item per line — no
-- brackets / quotes / commas for the user. Existing JSON-array values stay valid.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE billing.feature_variable_templates
  DROP CONSTRAINT IF EXISTS feature_variable_templates_type_chk;
ALTER TABLE billing.feature_variable_templates
  ADD CONSTRAINT feature_variable_templates_type_chk CHECK (value_type IN
    ('STRING','TEXT','NUMBER','BOOLEAN','CHANNEL_ID','ROLE_ID','USER_ID','SECRET','JSON','STRING_LIST'));

UPDATE billing.feature_variable_templates t
SET value_type = 'STRING_LIST',
    label = CASE t.variable_key
      WHEN 'REVIEW_REPLY_MESSAGES' THEN 'ข้อความรีพาย'
      WHEN 'REVIEW_REACTIONS'      THEN 'รีแอคชัน'
      ELSE t.label END,
    description = CASE t.variable_key
      WHEN 'REVIEW_REPLY_MESSAGES' THEN 'ข้อความขอบคุณ — พิมพ์บรรทัดละ 1 ข้อความ บอทจะสุ่มมา 1 อันต่อรีวิว (เว้นว่าง = ไม่รีพาย)'
      WHEN 'REVIEW_REACTIONS'      THEN 'อิโมจิที่กดให้ทุกรีวิว — พิมพ์บรรทัดละ 1 ตัว เช่น ⭐ หรือ <a:name:id> (เว้นว่าง = ไม่กดรีแอค)'
      ELSE t.description END
FROM billing.feature_catalog fc
WHERE fc.id = t.feature_id
  AND fc.code = 'review-credit'
  AND t.variable_key IN ('REVIEW_REPLY_MESSAGES', 'REVIEW_REACTIONS');
