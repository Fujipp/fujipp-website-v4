-- ═════════════════════════════════════════════════════════════════════════════
-- Slot-ify the /top leaderboard embed — until now top-spender-rank built it with a
-- hardcoded EmbedBuilder, so it never appeared in the Embed Designer. After this the
-- shop can edit the /top embed like every other.
--
--   top_leaderboard : /top result (also posted to TOP_SPENDER_LEADERBOARD_CHANNEL).
--                     {{updated}} = จำนวนคนที่อัปเดตยศ, {{board}} = รายการ Top 10
--                     (บอทเติม timestamp ให้เสมอ; ถ้ามี error จะต่อ field ⚠️ Errors ท้าย embed)
--
-- Default mirrors the embed the bot hardcoded until now, so nothing changes visually
-- until a shop edits it.
--
-- Idempotent: ON CONFLICT DO NOTHING keyed on (feature_code, slot_key).
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  (
    'top-spender-rank', 'top_leaderboard', 'Top ยอดเติมสะสม (/top)',
    'ผลคำสั่ง /top — อัปเดตยศตามยอดเติมสะสม แล้วโชว์ Top 10 ({{updated}} = จำนวนคนที่อัปเดตยศ, {{board}} = รายการ Top 10)',
    ARRAY['updated','board'],
    $j$
{"color":15902662,"title":"<:Ts_22_discord_1ture:1397892606209429584> Top ยอดเติมสะสม","description":"> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```อัปเดตยศให้ {{updated}} คน```\n> <:Ts_14_discord_pointg:1397694229333016647> : Top 10 ยอดเติมสะสม\n{{board}}"}
$j$::jsonb,
    10
  )
ON CONFLICT (feature_code, slot_key) DO NOTHING;
