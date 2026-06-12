-- ═════════════════════════════════════════════════════════════════════════════
-- Promote the embed designs the shop owner crafted on the Test-001 bot
-- (subject 1b4509af-2d5f-4938-af0a-ebde855f2bc6, Embed Designer, 2026-06-12)
-- to the seeded defaults for every bot. Snapshot taken 2026-06-13.
--
-- Component roles are preserved: each new default keeps the previously seeded
-- default_json.components merged under the design's own component overrides,
-- so roles the designer UI doesn't expose yet (e.g. pkg_select) survive.
-- Per-bot overrides (bots.bot_embeds) are untouched.
-- ═════════════════════════════════════════════════════════════════════════════

UPDATE bots.embed_slots SET default_json = $emb$
{"color":1579032,"image":{"url":"https://img5.pic.in.th/file/secure-sv1/robux-groupRate3.5.png"},"title":"ร้านค้า Robux","components":{"btn_buy":{"emoji":"🛒","label":"ซื้อสินค้า","style":"danger"},"btn_link":{"emoji":"🔗","label":"ลิงก์กลุ่ม"},"btn_topup":{"emoji":"💰","label":"เติมเงิน","style":"primary"},"btn_balance":{"emoji":"💳","label":"เช็คยอดคงเหลือ","style":"secondary"},"group_select":{"emoji":"🛒","placeholder":"เลือกกลุ่มที่ต้องการซื้อ Robux"}},"description":"เลือกกลุ่มที่ต้องการซื้อจากเมนูด้านล่าง"}
$emb$::jsonb
WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'shop_panel';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":65331,"title":"✅ แลก Robux สำเร็จ","description":"> 👤 : ผู้รับ\n```{{member}}```\n> 🛒 : จำนวน Robux\n```{{robux}}```\n> 🌐 : กลุ่ม\n```{{group_name}}```\n> 💳 : ยอดเงินคงเหลือ\n```{{balance}}```"}
$emb$::jsonb
WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'redeem_success';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":1579032,"title":"🛒  ยืนยันการซื้อ Robux","fields":[{"name":"🟢 : Package","value":"```{{robux}}```","inline":true},{"name":"🛒 : ราคา","value":"```{{price}} บาท```","inline":true},{"name":"💳 : ยอดเงินหลังการซื้อ","value":"```{{balance_after}} บาท```","inline":false}],"thumbnail":{"url":"{{avatar}}"},"description":"> 📋 : รายละเอียด\n```ตรวจสอบข้อมูลก่อนยืนยัน```\n> 👤 : Roblox ID\n```{{roblox_id}}```\n> ⚠️ : เงื่อนไขการใช้บริการ\n```เมื่อกดยืนยัน ระบบจะหักเงินและโอน Robux ทันที```"}
$emb$::jsonb
WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'buy_confirm';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":65331,"title":"✅ โอน Robux สำเร็จ","thumbnail":{"url":"{{avatar}}"},"description":"> 👤 : Roblox ID\n```{{roblox_id}}```\n> 🛒 : Robux\n```{{robux}} R$```\n> 💰 : ราคา\n```{{price}} บาท```\n> 💳 : ยอดคงเหลือ\n```{{balance}} บาท```"}
$emb$::jsonb
WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'buy_success';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":65331,"title":"✅ สามารถซื้อ Robux ได้แล้ว","thumbnail":{"url":"{{avatar}}"},"description":"> 📋 : รายละเอียด\n```{{message}}```\n> 👤 : Roblox Username\n```{{username}}```\n> 💳 : ยอดคงเหลือ\n```{{balance}} บาท```\n> 🛒 : เรทปัจจุบัน\n```1 บาท = {{rate}} Robux```\n> 🟢 : Robux ในกลุ่ม\n```{{group_robux}} R$```\n> 🟢 : กลุ่มที่เลือก\n```{{group_name}}```","components":{"pkg_select":{"option_ok":"✅","placeholder":"🎮 เลือก Robux Package","option_label":"{{robux}} Robux ({{price}} บาท)","option_insufficient":"❌ ยอดเงินไม่พอ"}}}
$emb$::jsonb
WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'buy_eligible';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":1579032,"title":"⌛️ กำลังประมวลผล","thumbnail":{"url":"{{avatar}}"},"description":"\n> 📋 : รายละเอียด\n```{{detail}}```"}
$emb$::jsonb
WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'buy_loading';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":16711680,"title":"❌ เกิดข้อผิดพลาด","thumbnail":{"url":"{{avatar}}"},"description":"> 📋 : รายละเอียด\n```{{reason}}```\n> 👤 : Roblox Username\n```{{username}}```\n> 🕑 : วันที่และเวลาทำรายการ\n```{{datetime}}```"}
$emb$::jsonb
WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'buy_error';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":65331,"title":"✅ กำลังดำเนินการ...","thumbnail":{"url":"{{avatar}}"},"description":"> 📋 : รายละเอียด\n```หักเงินเรียบร้อย! กำลังโอน Robux... (คิว #{{queue}})```\n> 🛒 : Robux\n```{{robux}} R$```\n> 💰 : ราคา\n```{{price}} บาท```\n> 💳 : ยอดคงเหลือ\n```{{balance}} บาท```"}
$emb$::jsonb
WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'buy_queued';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":65331,"image":{"url":"https://pixelsafari.neocities.org/dividers/more/cat8.gif"},"title":"✅ ทำรายการสำเร็จ","thumbnail":{"url":"{{avatar}}"},"description":"> 👤 : Discord Username\n```{{username}}```\n> 🟢 : Roblox ID\n```{{roblox_id}}```\n> 🛒 : Robux\n```{{robux}} R$```\n> 💰 : ราคา\n```{{price}} บาท```\n> 🕑 : วันที่และเวลาทำรายการ\n```{{datetime}}```"}
$emb$::jsonb
WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'notify_success';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":16711680,"title":"❌ เกิดข้อผิดพลาด","thumbnail":{"url":"{{avatar}}"},"description":"> 📋 : รายละเอียด\n```{{error}}```\n> 👤 : Discord Username\n```{{username}}```\n> 🟢 : Roblox ID\n```{{roblox_id}}```\n> 🕑 : วันที่และเวลาทำรายการ\n```{{datetime}}```"}
$emb$::jsonb
WHERE feature_code = 'roblox-robux-payout' AND slot_key = 'notify_error';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":1579032,"title":"🏦 เลือกช่องทางเติมเงิน","components":{"method_select":{"emoji":"🏧","placeholder":"เลือกช่องทางการเติมเงิน"}},"description":"\n> ⚠️ : เงื่อนไขการเติมเงิน\n```เติมเงินผ่านซอง Truemoney wallet หัก 5 บาท / 1 ซอง```"}
$emb$::jsonb
WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_method';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":1579032,"image":{"url":"{{qr_image}}"},"title":"🏦 เติมเงินผ่านพร้อมเพย์","footer":{"text":"สแกนคิวอาร์โค้ด・บันทึกรูปภาพไปสแกน"},"description":"\n> 📋 : รายละเอียด\n```กรุณาชำระภายใน 5 นาที```\n> ⏰ : เหลือเวลาอีก\n```{{countdown}}```\n> 🏧 : จำนวนเงินที่ต้องชำระ\n```{{amount}}```\n> 👤 : ชื่อบัญชี\n```{{account_name}}```"}
$emb$::jsonb
WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_qr';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":16711680,"title":"❌ เกินเวลาที่กำหนด","footer":{"text":"ขออภัยหากคุณได้ทำรายการไปแล้ว"},"description":"\n> 📋 : รายละเอียด\n```หากทำรายการไม่ทันให้เปิดเมนูเติมเงินใหม่อีกครั้ง แล้วแนบสลิปได้เลยถ้าส่งสลิปไม่ทัน```"}
$emb$::jsonb
WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_timeout';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":1579032,"title":"⌛️ กำลังประมวลผล","description":"\n> 📋 : รายละเอียด\n```กำลังตรวจสอบ / กำลังเช็ค```"}
$emb$::jsonb
WHERE feature_code = 'wallet-topup' AND slot_key = 'processing';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":16711680,"title":"❌ เกิดข้อผิดพลาด","description":"> 📋 : รายละเอียด\n```{{reason}}```"}
$emb$::jsonb
WHERE feature_code = 'wallet-topup' AND slot_key = 'error';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":16711680,"title":"❌ เติมเงินไม่สำเร็จ","description":"> 📋 : รายละเอียด\n```{{reason}}```"}
$emb$::jsonb
WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_failed';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":65331,"title":"✅ เติมเงินสำเร็จ","description":"> 👤 : คนทำรายการ\n```{{member}}```\n> 💰 : จำนวนเงินที่เติม\n```{{amount}}```\n> 🏧 : ยอดทั้งหมดที่มี\n```{{total_balance}}```\n> 🏦 : ช่องทางการเติม\n```{{method}}```\n> 🕑 : วันที่และเวลาทำรายการ\n```{{datetime}}```"}
$emb$::jsonb
WHERE feature_code = 'wallet-topup' AND slot_key = 'topup_success';

UPDATE bots.embed_slots SET default_json = $emb$
{"color":1579032,"title":"👛 กระเป๋าเงินของคุณ","description":"> 🏧 : ยอดคงเหลือ\n```{{balance}}```"}
$emb$::jsonb
WHERE feature_code = 'wallet-topup' AND slot_key = 'balance';
