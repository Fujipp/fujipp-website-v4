-- ═════════════════════════════════════════════════════════════════════════════
-- Revert topup_qr countdown to the original code-block style.
--
-- 20260612140000 moved {{countdown}} inline for a live Discord timestamp, but the
-- countdown is back to plain "X นาที YY วินาที" text edited once a second (topup.js),
-- which reads better inside the ``` box like the original design.
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE bots.embed_slots SET default_json = $j$
{"color":15902662,"title":"<:Ts_0_discord_bank:1398972893416914965> เติมเงินผ่านพร้อมเพย์","description":"\n> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```กรุณาชำระภายใน 5 นาที```\n> <:Ts_10_discord_Clock:1397694191429095675> : เหลือเวลาอีก\n```{{countdown}}```\n> <:Ts_19_discord_coin:1397694253676630066> : จำนวนเงินที่ต้องชำระ\n```{{amount}}```\n> <:Ts_9_discord_member:1397694189575344298> : ชื่อบัญชี\n```{{account_name}}```","footer":{"text":"สแกนคิวอาร์โค้ด・บันทึกรูปภาพไปสแกน"},"image":{"url":"{{qr_image}}"}}
$j$::jsonb WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_qr';
