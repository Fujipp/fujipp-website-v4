-- ═════════════════════════════════════════════════════════════════════════════
-- Make the Roblox buy-flow confirm + success embeds configurable (Embed Designer).
--
-- buy.js previously hardcoded its "ยืนยันการซื้อ Robux" (confirm) and
-- "โอน Robux สำเร็จ" (payout success) embeds. Register them as slots so a bot can
-- edit them like the other embeds. Dynamic values use {{vars}} the bot fills:
--   buy_confirm : {{roblox_id}}, {{robux}}, {{price}}, {{balance_after}}, {{avatar}} (thumbnail)
--   buy_success : {{roblox_id}}, {{robux}}, {{price}}, {{balance}}, {{avatar}} (thumbnail)
--
-- Idempotent: ON CONFLICT DO NOTHING keyed on (feature_code, slot_key).
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  (
    'roblox-robux-payout', 'buy_confirm', 'ซื้อ Robux: ยืนยันการซื้อ',
    'ข้อความให้ผู้ใช้ตรวจสอบข้อมูลก่อนกดยืนยันซื้อ Robux (Package / ราคา / ยอดเงินหลังซื้อ)',
    ARRAY['roblox_id','robux','price','balance_after','avatar'],
    $j$
{"color":16247178,"title":"<:Icon_Square_robux_1:1397902872146083861>  ยืนยันการซื้อ Robux","description":"> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```ตรวจสอบข้อมูลก่อนยืนยัน```\n> <:Ts_7_discord_id:1397694178846310520> : Roblox ID\n```{{roblox_id}}```\n> <:Ts_12_discord_abane:1397694204863315998> : เงื่อนไขการใช้บริการ\n```เมื่อกดยืนยัน ระบบจะหักเงินและโอน Robux ทันที```","thumbnail":{"url":"{{avatar}}"},"fields":[{"name":"<:Icon_Square_robux_1:1397902872146083861> : Package","value":"```{{robux}}```","inline":true},{"name":"<:Ts_19_discord_coin:1397694253676630066> : ราคา","value":"```{{price}} บาท```","inline":true},{"name":"<:Ts_19_discord_coin:1397694253676630066> : ยอดเงินหลังการซื้อ","value":"```{{balance_after}} บาท```","inline":false}]}
$j$::jsonb,
    21
  ),
  (
    'roblox-robux-payout', 'buy_success', 'ซื้อ Robux: โอนสำเร็จ',
    'ข้อความแสดงเมื่อโอน Robux ให้ผู้ซื้อสำเร็จ (Roblox ID / Robux / ราคา / ยอดคงเหลือ)',
    ARRAY['roblox_id','robux','price','balance','avatar'],
    $j$
{"color":9107360,"title":"<:Ts_22_discord_1ture:1397892606209429584> โอน Robux สำเร็จ","description":"> <:Ts_7_discord_id:1397694178846310520> : Roblox ID\n```{{roblox_id}}```\n> <:Icon_Square_robux_1:1397902872146083861> : Robux\n```{{robux}} R$```\n> <:Ts_19_discord_coin:1397694253676630066> : ราคา\n```{{price}} บาท```\n> <:Ts_19_discord_coin:1397694253676630066> : ยอดคงเหลือ\n```{{balance}} บาท```","thumbnail":{"url":"{{avatar}}"},"image":{"url":"https://www.animatedimages.org/data/media/562/animated-line-image-0388.gif"}}
$j$::jsonb,
    22
  )
ON CONFLICT (feature_code, slot_key) DO NOTHING;
