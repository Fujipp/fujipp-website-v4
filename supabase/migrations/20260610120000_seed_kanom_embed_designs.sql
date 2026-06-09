-- ═════════════════════════════════════════════════════════════════════════════
-- Seed the real Kanom embed designs as the slot defaults (config layer 3).
--
-- Replaces the minimal starter templates from 20260609110000 with the customer's
-- designed embeds (panel + top-up flow). Only the VISUAL parts are stored (color,
-- title, description, image, footer, fields) — components (select/buttons) are added
-- by central-bot with fixed custom_ids. Dynamic values use {{var}} (the bot fills
-- them at render): {{reason}}, {{amount}}, {{account_name}}, {{countdown}},
-- {{member}}, {{total_balance}}, {{method}}, {{datetime}}, {{robux}}, {{group_name}},
-- {{balance}}. Custom emoji are kept as <:name:id> markup (Discord renders them).
--
-- Idempotent: plain UPDATEs keyed on (feature_code, slot_key). Bots that already saved
-- an override (bots.bot_embeds) are unaffected.
-- ═════════════════════════════════════════════════════════════════════════════

UPDATE bots.embed_slots SET default_json = $j$
{"color":1579032,"title":"ร้านค้า Robux","description":"เลือกกลุ่มที่ต้องการซื้อจากเมนูด้านล่าง","image":{"url":"https://img5.pic.in.th/file/secure-sv1/robux-groupRate3.5.png"}}
$j$::jsonb WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'shop_panel';

UPDATE bots.embed_slots SET default_json = $j$
{"color":9090807,"title":"<:Ts_0_discord_bank:1398972893416914965> เลือกช่องทางเติมเงิน","description":"\n> <:Ts_12_discord_abane:1397694204863315998> : เงื่อนไขการเติมเงิน\n```เติมเงินผ่านซอง Truemoney wallet หัก 5 บาท / 1 ซอง```","image":{"url":"https://pixelsafari.neocities.org/dividers/more/sparkles3.gif"}}
$j$::jsonb WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_method';

UPDATE bots.embed_slots SET default_json = $j$
{"color":15902662,"title":"<:Ts_0_discord_bank:1398972893416914965> เติมเงินผ่านพร้อมเพย์","description":"\n> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```กรุณาชำระภายใน 5 นาที```\n> <:Ts_10_discord_Clock:1397694191429095675> : เหลือเวลาอีก\n```{{countdown}}```\n> <:Ts_19_discord_coin:1397694253676630066> : จำนวนเงินที่ต้องชำระ\n```{{amount}}```\n> <:Ts_9_discord_member:1397694189575344298> : ชื่อบัญชี\n```{{account_name}}```","footer":{"text":"สแกนคิวอาร์โค้ด・บันทึกรูปภาพไปสแกน"},"image":{"url":"{{qr_image}}"}}
$j$::jsonb WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_qr';

UPDATE bots.embed_slots SET default_json = $j$
{"color":16222858,"title":"<:Ts_10_discord_outoftime:1397694356563038248> เกินเวลาที่กำหนด","description":"\n> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```หากทำรายการไม่ทันให้เปิดเมนูเติมเงินใหม่อีกครั้ง แล้วแนบสลิปได้เลยถ้าส่งสลิปไม่ทัน```","footer":{"text":"ขออภัยหากคุณได้ทำรายการไปแล้ว"}}
$j$::jsonb WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_timeout';

UPDATE bots.embed_slots SET default_json = $j$
{"color":15902662,"title":"<a:Ts_22_discord_3loading:1397892630729461841> กำลังประมวลผล","description":"\n> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```กำลังตรวจสอบ / กำลังเช็ค```"}
$j$::jsonb WHERE feature_code = 'wallet-topup' AND slot_key = 'processing';

UPDATE bots.embed_slots SET default_json = $j$
{"color":16222858,"title":"<:Ts_12_discord_bbane:1397694208969543720> เกิดข้อผิดพลาด","description":"> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```{{reason}}```","image":{"url":"https://www.animatedimages.org/data/media/562/animated-line-image-0378.gif"}}
$j$::jsonb WHERE feature_code = 'wallet-topup' AND slot_key = 'error';

UPDATE bots.embed_slots SET default_json = $j$
{"color":16222858,"title":"<:Ts_12_discord_bbane:1397694208969543720> เติมเงินไม่สำเร็จ","description":"> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```{{reason}}```","image":{"url":"https://www.animatedimages.org/data/media/562/animated-line-image-0378.gif"}}
$j$::jsonb WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_failed';

UPDATE bots.embed_slots SET default_json = $j$
{"color":9107360,"title":"<:Ts_22_discord_1ture:1397892606209429584> เติมเงินสำเร็จ","description":"> <:Ts_9_discord_member:1397694189575344298> : คนทำรายการ\n```{{member}}```\n> <:Ts_19_discord_coin:1397694253676630066> : จำนวนเงินที่เติม\n```{{amount}}```\n> <:Ts_19_discord_coin:1397694253676630066> : ยอดทั้งหมดที่มี\n```{{total_balance}}```\n> <:Ts_0_discord_bank:1398972893416914965> : ช่องทางการเติม\n```{{method}}```\n> <:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ\n```{{datetime}}```","image":{"url":"https://www.animatedimages.org/data/media/562/animated-line-image-0388.gif"}}
$j$::jsonb WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_success';

UPDATE bots.embed_slots SET default_json = $j$
{"color":9107360,"title":"<:Ts_22_discord_1ture:1397892606209429584> แลก Robux สำเร็จ","description":"> <:Ts_9_discord_member:1397694189575344298> : ผู้รับ\n```{{member}}```\n> <:Ts_19_discord_coin:1397694253676630066> : จำนวน Robux\n```{{robux}}```\n> <:Ts_20_discord_shop:1397694256067514622> : กลุ่ม\n```{{group_name}}```\n> <:Ts_19_discord_coin:1397694253676630066> : ยอดเงินคงเหลือ\n```{{balance}}```"}
$j$::jsonb WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'redeem_success';

UPDATE bots.embed_slots SET default_json = $j$
{"color":1579032,"title":"<:emj_coin_money:1465978817536462901> กระเป๋าเงินของคุณ","description":"> <:Ts_19_discord_coin:1397694253676630066> : ยอดคงเหลือ\n```{{balance}}```"}
$j$::jsonb WHERE feature_code = 'wallet-topup' AND slot_key = 'balance';
