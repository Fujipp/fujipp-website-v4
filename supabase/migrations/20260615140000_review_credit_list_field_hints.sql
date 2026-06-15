-- ═════════════════════════════════════════════════════════════════════════════
-- Update review-credit STRING_LIST field hints: they're now edited as add/remove
-- input boxes (not one-per-line), so the descriptions shouldn't say "บรรทัดละ".
-- Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

UPDATE billing.feature_variable_templates t
SET description = CASE t.variable_key
      WHEN 'REVIEW_REPLY_MESSAGES' THEN 'ข้อความขอบคุณ — เพิ่มได้หลายข้อความ บอทจะสุ่มมา 1 อันต่อรีวิว (ไม่มี = ไม่รีพาย)'
      WHEN 'REVIEW_REACTIONS'      THEN 'อิโมจิที่กดให้ทุกรีวิว — เพิ่มได้หลายตัว เช่น ⭐ หรือ <a:name:id> (ไม่มี = ไม่กดรีแอค)'
      ELSE t.description END
FROM billing.feature_catalog fc
WHERE fc.id = t.feature_id
  AND fc.code = 'review-credit'
  AND t.variable_key IN ('REVIEW_REPLY_MESSAGES', 'REVIEW_REACTIONS');
