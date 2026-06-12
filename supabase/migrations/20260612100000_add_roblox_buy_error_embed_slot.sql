-- ═════════════════════════════════════════════════════════════════════════════
-- Make the Roblox buy-flow error embed configurable (Embed Designer slot).
--
-- buy.js previously hardcoded its "เกิดข้อผิดพลาด" embed. Register it as a slot so a
-- bot can edit it like the other embeds. Dynamic values use {{vars}} the bot fills:
-- {{reason}}, {{username}} (Roblox username), {{datetime}}, {{avatar}} (thumbnail).
--
-- Idempotent: ON CONFLICT DO NOTHING keyed on (feature_code, slot_key).
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES (
  'roblox-robux-payout', 'buy_error', 'ซื้อ Robux: เกิดข้อผิดพลาด',
  'ข้อความแสดงข้อผิดพลาดตอนซื้อ Robux (เช็คสิทธิ์ไม่ผ่าน / โอนไม่สำเร็จ / ยกเลิก / ยอดไม่พอ)',
  ARRAY['reason','username','datetime','avatar'],
  $j$
{"color":16222858,"title":"<:Ts_12_discord_bbane:1397694208969543720> เกิดข้อผิดพลาด","description":"> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```{{reason}}```\n> <:Ts_9_discord_member:1397694189575344298> : Roblox Username\n```{{username}}```\n> <:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ\n```{{datetime}}```","image":{"url":"https://www.animatedimages.org/data/media/562/animated-line-image-0378.gif"},"thumbnail":{"url":"{{avatar}}"}}
$j$::jsonb,
  25
)
ON CONFLICT (feature_code, slot_key) DO NOTHING;
