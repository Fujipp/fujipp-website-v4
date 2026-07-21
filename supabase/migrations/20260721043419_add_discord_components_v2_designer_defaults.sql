-- Components V2 remains part of the existing per-slot JSON document. This keeps
-- ownership, RLS and the bot override path identical to the Embed Designer while
-- allowing the UI and runtime to edit/render the V2 message independently.

INSERT INTO bots.embed_slots
  (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  ('wallet-topup', 'topup_invalid', 'แจ้งเตือนยอดเติมไม่ถูกต้อง',
   'แสดงเมื่อจำนวนเงินไม่ถูกต้องหรือต่ำกว่ายอดขั้นต่ำ',
   ARRAY['reason', 'minimum'],
   '{"color":15902662,"title":"แจ้งเตือน","description":"{{reason}}","components":{"btn_close":{"label":"ปิด","style":"secondary"}},"componentsV2":{"texts":{"heading":"# ⚠️ แจ้งเตือน","detail":"{{reason}}"}}}'::jsonb,
   35)
ON CONFLICT (feature_code, slot_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  available_vars = EXCLUDED.available_vars,
  default_json = EXCLUDED.default_json,
  sort_order = EXCLUDED.sort_order;

UPDATE bots.embed_slots
SET default_json = default_json || jsonb_build_object('componentsV2', jsonb_build_object('texts', CASE slot_key
  WHEN 'topup_panel' THEN '{"heading":"# 💰 เติมเงินเข้ากระเป๋า","description":"กดปุ่ม **เติมเงิน** ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ"}'::jsonb
  WHEN 'topup_method' THEN '{"heading":"# เลือกช่องทางเติมเงิน","notice_heading":"**🔻 อ่านก่อนเติม**","notice":"เติมเงินผ่านซองอั่งเปาทรูมันนี่ {{fee_text}}"}'::jsonb
  WHEN 'topup_qr' THEN '{"heading":"# 🏦 เติมเงินผ่านพร้อมเพย์","amount":"จำนวนเงินที่ต้องชำระ {{amount}}","account":"-# **👤 ชื่อบัญชี** {{account_name}}","countdown":"-# **⏰ เหลือเวลาอีก** {{countdown}}"}'::jsonb
  WHEN 'topup_timeout' THEN '{"heading":"# 🔴 เกินเวลาที่กำหนด","detail_heading":"**📋 รายละเอียด**","detail":"หากทำรายการไม่ทันให้กดทำรายการใหม่อีกครั้ง แล้วแนบสลิปได้เลยหากส่งสลิปไม่ทัน ขออภัยหากคุณได้ทำรายการไปแล้ว"}'::jsonb
  WHEN 'processing' THEN '{"heading":"# ⌛️ กำลังประมวลผล","detail_heading":"**📋 รายละเอียด**","detail":"กำลังตรวจสอบสลิป กรุณารอสักครู่"}'::jsonb
  WHEN 'error' THEN '{"heading":"# 🔴 เกิดข้อผิดพลาด","detail_heading":"**📋 รายละเอียด**","detail":"{{reason}}"}'::jsonb
  WHEN 'topup_failed' THEN '{"heading":"# 🔴 เติมเงินไม่สำเร็จ","detail_heading":"**📋 รายละเอียด**","detail":"{{reason}}"}'::jsonb
  WHEN 'topup_success' THEN '{"heading":"# 🟢 เติมเงินสำเร็จ","detail":"**👤 คนทำรายการ**\n<@{{member}}>\n\n**💰 จำนวนเงินที่เติม**\n{{amount}}\n\n**🏧 ยอดทั้งหมดที่มี**\n{{total_balance}}\n\n**🏦 ช่องทางการเติม**\n{{method}}\n\n**🕑 วันที่และเวลาทำรายการ**\n{{datetime}}"}'::jsonb
  ELSE '{}'::jsonb
END))
WHERE feature_code = 'wallet-topup'
  AND slot_key IN ('topup_panel', 'topup_method', 'topup_qr', 'topup_timeout', 'processing', 'error', 'topup_failed', 'topup_success');

UPDATE bots.embed_slots
SET default_json = jsonb_set(
  default_json,
  '{components}',
  COALESCE(default_json->'components', '{}'::jsonb) || CASE slot_key
    WHEN 'topup_qr' THEN '{"btn_slip":{"label":"โอนแล้วแนบสลิปที่นี่"}}'::jsonb
    WHEN 'topup_timeout' THEN '{"btn_retry":{"label":"ทำรายการใหม่อีกครั้ง","emoji":"🔄","style":"primary"},"btn_close":{"label":"ปิด","style":"secondary"}}'::jsonb
    WHEN 'error' THEN '{"btn_close":{"label":"ปิด","style":"secondary"}}'::jsonb
    ELSE '{}'::jsonb
  END,
  true
)
WHERE feature_code = 'wallet-topup'
  AND slot_key IN ('topup_qr', 'topup_timeout', 'error');
