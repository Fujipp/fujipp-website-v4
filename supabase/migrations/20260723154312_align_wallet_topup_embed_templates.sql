-- Align the classic Embed presentation of Shop Wallet & Top-up with the
-- Components V2 wording and information hierarchy. Component configuration and
-- per-bot overrides remain untouched.

UPDATE bots.embed_slots
SET default_json =
    (default_json - ARRAY[
        'title',
        'description',
        'color',
        'fields',
        'image',
        'thumbnail',
        'footer'
    ]::text[])
    || CASE slot_key
        WHEN 'topup_panel' THEN
            '{
              "color": 5793266,
              "title": "💰 เติมเงินเข้ากระเป๋า",
              "description": "กดปุ่ม **เติมเงิน** ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ"
            }'::jsonb
        WHEN 'balance' THEN
            '{
              "color": 5793266,
              "title": "💳 เงินในบัญชีของคุณ",
              "description": "**ยอดคงเหลือ**\n# {{balance}}",
              "thumbnail": {"url": "{{avatar_url}}"}
            }'::jsonb
        WHEN 'topup_method' THEN
            '{
              "color": 5793266,
              "title": "เลือกช่องทางเติมเงิน",
              "description": "**🔻 อ่านก่อนเติม**\n\nเติมเงินผ่านซองอั่งเปาทรูมันนี่ {{fee_text}}"
            }'::jsonb
        WHEN 'topup_invalid' THEN
            '{
              "color": 16705372,
              "title": "⚠️ แจ้งเตือน",
              "description": "{{reason}}"
            }'::jsonb
        WHEN 'topup_qr' THEN
            '{
              "color": 5793266,
              "title": "🏦 เติมเงินผ่านพร้อมเพย์",
              "description": "**จำนวนเงินที่ต้องชำระ**\n{{amount}}\n\n**👤 ชื่อบัญชี**\n{{account_name}}\n\n**⏰ เหลือเวลาอีก**\n{{countdown}}",
              "image": {"url": "{{qr_image}}"},
              "footer": {"text": "กรุณาชำระรายการภายในเวลาที่กำหนด"}
            }'::jsonb
        WHEN 'topup_timeout' THEN
            '{
              "color": 15548997,
              "title": "🔴 เกินเวลาที่กำหนด",
              "description": "**📋 รายละเอียด**\n\nหากทำรายการไม่ทันให้กดทำรายการใหม่อีกครั้ง แล้วแนบสลิปได้เลยหากส่งสลิปไม่ทัน ขออภัยหากคุณได้ทำรายการไปแล้ว"
            }'::jsonb
        WHEN 'processing' THEN
            '{
              "color": 16705372,
              "title": "⌛️ กำลังประมวลผล",
              "description": "**📋 รายละเอียด**\n\nกำลังตรวจสอบสลิป กรุณารอสักครู่"
            }'::jsonb
        WHEN 'error' THEN
            '{
              "color": 15548997,
              "title": "🔴 เกิดข้อผิดพลาด",
              "description": "**📋 รายละเอียด**\n\n{{reason}}"
            }'::jsonb
        WHEN 'topup_failed' THEN
            '{
              "color": 15548997,
              "title": "🔴 เติมเงินไม่สำเร็จ",
              "description": "**📋 รายละเอียด**\n\n{{reason}}"
            }'::jsonb
        WHEN 'topup_success' THEN
            '{
              "color": 5763719,
              "title": "🟢 เติมเงินสำเร็จ",
              "description": "**👤 คนทำรายการ**\n<@{{member}}>\n\n**💰 จำนวนเงินที่เติม**\n{{amount}}\n\n**🏧 ยอดทั้งหมดที่มี**\n{{total_balance}}\n\n**🏦 ช่องทางการเติม**\n{{method}}\n\n**🕑 วันที่และเวลาทำรายการ**\n{{datetime}}"
            }'::jsonb
        ELSE '{}'::jsonb
    END
WHERE feature_code = 'wallet-topup'
  AND slot_key IN (
      'topup_panel',
      'balance',
      'topup_method',
      'topup_invalid',
      'topup_qr',
      'topup_timeout',
      'processing',
      'error',
      'topup_failed',
      'topup_success'
  );
