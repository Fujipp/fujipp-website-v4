-- ═════════════════════════════════════════════════════════════════════════════
-- Slot-ify the LAST hardcoded roblox-robux-payout embeds — after this every embed
-- the feature sends is editable in the Embed Designer.
--
--   check_result          : /robux-check result. {{message}}, {{username}}, {{group_name}}.
--                           Seeded WITHOUT a color on purpose: the bot colors it green/red
--                           by the eligibility result unless a bot override sets a color.
--   group_balance         : /robux-balance. {{robux}}, {{group_name}}
--   payout_admin_success  : /robux-payout (admin manual payout). {{robux}}, {{username}}
--   buy_queued            : buy flow post-debit "กำลังดำเนินการ (คิว #N)".
--                           {{queue}}, {{robux}}, {{price}}, {{balance}}, {{avatar}}
--   notify_success        : ROBUX_NOTIFY_CHANNEL success notification.
--                           {{username}}, {{roblox_id}}, {{robux}}, {{price}}, {{datetime}}, {{avatar}}
--   notify_error          : ROBUX_NOTIFY_CHANNEL failure notification.
--                           {{error}}, {{username}}, {{roblox_id}}, {{datetime}}, {{avatar}}
--
-- (/robux-redeem reuses the already-seeded redeem_success slot.)
-- Defaults mirror the embeds the bot hardcoded until now, so nothing changes
-- visually until a shop edits them.
--
-- Idempotent: ON CONFLICT DO NOTHING keyed on (feature_code, slot_key).
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  (
    'roblox-robux-payout', 'check_result', 'ตรวจสอบสิทธิ์รับ Robux (/robux-check)',
    'ผลคำสั่ง /robux-check — ถ้าไม่ตั้งสีไว้ บอทจะใส่สีเขียว/แดงตามผลตรวจให้อัตโนมัติ',
    ARRAY['message','username','group_name'],
    $j$
{"title":"ตรวจสอบสิทธิ์รับ Robux","description":"{{message}}","footer":{"text":"{{group_name}}"}}
$j$::jsonb,
    11
  ),
  (
    'roblox-robux-payout', 'group_balance', 'ยอด Robux ของกลุ่ม (/robux-balance)',
    'ผลคำสั่ง /robux-balance แสดง Robux คงเหลือของกลุ่ม',
    ARRAY['robux','group_name'],
    $j$
{"color":3618621,"title":"ยอด Robux ของกลุ่ม","description":"คงเหลือ **{{robux}}** Robux","footer":{"text":"{{group_name}}"}}
$j$::jsonb,
    12
  ),
  (
    'roblox-robux-payout', 'payout_admin_success', 'จ่าย Robux สำเร็จ (/robux-payout แอดมิน)',
    'ผลคำสั่ง /robux-payout เมื่อแอดมินจ่าย Robux สำเร็จ (ส่งเข้า notify channel ด้วย)',
    ARRAY['robux','username'],
    $j$
{"color":3908957,"title":"จ่าย Robux สำเร็จ","description":"ส่ง **{{robux}}** Robux ให้ `{{username}}` แล้ว"}
$j$::jsonb,
    13
  ),
  (
    'roblox-robux-payout', 'buy_queued', 'ซื้อ Robux: เข้าคิวโอน',
    'ข้อความหลังหักเงินสำเร็จ ระหว่างรอคิวโอน Robux',
    ARRAY['queue','robux','price','balance','avatar'],
    $j$
{"color":9107360,"title":"<:Ts_22_discord_1ture:1397892606209429584> กำลังดำเนินการ...","description":"> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```หักเงินเรียบร้อย! กำลังโอน Robux... (คิว #{{queue}})```\n> <:Icon_Square_robux_1:1397902872146083861> : Robux\n```{{robux}} R$```\n> <:Ts_19_discord_coin:1397694253676630066> : ราคา\n```{{price}} บาท```\n> <:Ts_19_discord_coin:1397694253676630066> : ยอดคงเหลือ\n```{{balance}} บาท```","thumbnail":{"url":"{{avatar}}"},"image":{"url":"https://www.animatedimages.org/data/media/562/animated-line-image-0388.gif"}}
$j$::jsonb,
    26
  ),
  (
    'roblox-robux-payout', 'notify_success', 'แจ้งเตือน: ทำรายการสำเร็จ',
    'ข้อความแจ้งเตือนใน ROBUX_NOTIFY_CHANNEL เมื่อโอน Robux สำเร็จ ({{avatar}} = รูป Roblox ของผู้ซื้อ)',
    ARRAY['username','roblox_id','robux','price','datetime','avatar'],
    $j$
{"color":15902662,"title":"<:Ts_22_discord_1ture:1397892606209429584> ทำรายการสำเร็จ","description":"> <:Ts_9_discord_member:1397694189575344298> : Discord Username\n```{{username}}```\n> <:Ts_7_discord_id:1397694178846310520> : Roblox ID\n```{{roblox_id}}```\n> <:Icon_Square_robux_1:1397902872146083861> : Robux\n```{{robux}} R$```\n> <:Ts_19_discord_coin:1397694253676630066> : ราคา\n```{{price}} บาท```\n> <:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ\n```{{datetime}}```","thumbnail":{"url":"{{avatar}}"},"image":{"url":"https://pixelsafari.neocities.org/dividers/more/cat8.gif"}}
$j$::jsonb,
    27
  ),
  (
    'roblox-robux-payout', 'notify_error', 'แจ้งเตือน: เกิดข้อผิดพลาด',
    'ข้อความแจ้งเตือนใน ROBUX_NOTIFY_CHANNEL เมื่อโอน Robux ไม่สำเร็จ',
    ARRAY['error','username','roblox_id','datetime','avatar'],
    $j$
{"color":16222858,"title":"<:Ts_12_discord_bbane:1397694208969543720> เกิดข้อผิดพลาด","description":"> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```{{error}}```\n> <:Ts_9_discord_member:1397694189575344298> : Discord Username\n```{{username}}```\n> <:Ts_7_discord_id:1397694178846310520> : Roblox ID\n```{{roblox_id}}```\n> <:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ\n```{{datetime}}```","thumbnail":{"url":"{{avatar}}"},"image":{"url":"https://www.animatedimages.org/data/media/562/animated-line-image-0378.gif"}}
$j$::jsonb,
    28
  )
ON CONFLICT (feature_code, slot_key) DO NOTHING;
