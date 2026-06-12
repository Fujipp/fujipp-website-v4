-- ═════════════════════════════════════════════════════════════════════════════
-- Make the Roblox buy-flow eligibility + loading embeds configurable (Embed Designer).
--
-- buy.js previously hardcoded its "สามารถซื้อ Robux ได้แล้ว" (eligibility result) and
-- "กำลังประมวลผล" (loading) embeds. Register them as slots so a bot can edit them.
-- Dynamic values use {{vars}} the bot fills:
--   buy_eligible : {{message}}, {{username}}, {{balance}}, {{rate}}, {{group_robux}},
--                  {{group_name}}, {{avatar}} (thumbnail)
--   buy_loading  : {{detail}}, {{avatar}} (thumbnail)
--
-- Idempotent: ON CONFLICT DO NOTHING keyed on (feature_code, slot_key).
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  (
    'roblox-robux-payout', 'buy_eligible', 'ซื้อ Robux: เช็คสิทธิ์ผ่าน',
    'ข้อความเมื่อตรวจสิทธิ์ผ่านและพร้อมให้เลือก Package (ยอดเงิน / เรท / Robux ในกลุ่ม)',
    ARRAY['message','username','balance','rate','group_robux','group_name','avatar'],
    $j$
{"color":9107360,"title":"<:Ts_22_discord_1ture:1397892606209429584> สามารถซื้อ Robux ได้แล้ว","description":"> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```{{message}}```\n> <:Ts_9_discord_member:1397694189575344298> : Roblox Username\n```{{username}}```\n> <:Ts_19_discord_coin:1397694253676630066> : ยอดคงเหลือ\n```{{balance}} บาท```\n> <:Ts_19_discord_coin:1397694253676630066> : เรทปัจจุบัน\n```1 บาท = {{rate}} Robux```\n> <:Icon_Square_robux_1:1397902872146083861> : Robux ในกลุ่ม\n```{{group_robux}} R$```\n> <:Ts_7_discord_id:1397694178846310520> : กลุ่มที่เลือก\n```{{group_name}}```","thumbnail":{"url":"{{avatar}}"},"image":{"url":"https://www.animatedimages.org/data/media/562/animated-line-image-0388.gif"}}
$j$::jsonb,
    23
  ),
  (
    'roblox-robux-payout', 'buy_loading', 'ซื้อ Robux: กำลังประมวลผล',
    'ข้อความระหว่างบอทกำลังประมวลผล (ตรวจสอบข้อมูล / กำลังดำเนินการ)',
    ARRAY['detail','avatar'],
    $j$
{"color":15902662,"title":"<a:Ts_22_discord_3loading:1397892630729461841> กำลังประมวลผล","description":"\n> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```{{detail}}```","thumbnail":{"url":"{{avatar}}"}}
$j$::jsonb,
    24
  )
ON CONFLICT (feature_code, slot_key) DO NOTHING;
