-- ═════════════════════════════════════════════════════════════════════════════
-- topup_qr default: render {{countdown}} as a live Discord relative timestamp.
--
-- The countdown is now a `<t:…:R>` timestamp (topup.js) that Discord ticks down
-- client-side in realtime. A Discord timestamp does NOT render inside a ``` code
-- block, so move the "เหลือเวลาอีก" line out of the code block in the default.
-- (Bots with a saved topup_qr override must make the same edit in the Embed Designer.)
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE bots.embed_slots SET default_json = $j$
{"color":15902662,"title":"<:Ts_0_discord_bank:1398972893416914965> เติมเงินผ่านพร้อมเพย์","description":"\n> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```กรุณาชำระภายใน 5 นาที```\n> <:Ts_10_discord_Clock:1397694191429095675> : เหลือเวลาอีก {{countdown}}\n> <:Ts_19_discord_coin:1397694253676630066> : จำนวนเงินที่ต้องชำระ\n```{{amount}}```\n> <:Ts_9_discord_member:1397694189575344298> : ชื่อบัญชี\n```{{account_name}}```","footer":{"text":"สแกนคิวอาร์โค้ด・บันทึกรูปภาพไปสแกน"},"image":{"url":"{{qr_image}}"}}
$j$::jsonb WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_qr';
