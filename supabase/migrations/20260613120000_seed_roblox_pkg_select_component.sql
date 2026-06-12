-- ═════════════════════════════════════════════════════════════════════════════
-- Make the Robux package dropdown (buy flow step 2) editable in the Embed Designer.
--
-- buy.js generates the options from the rate/package tables, so the option list
-- itself stays dynamic — only the appearance is configurable via a new pkg_select
-- component role on the buy_eligible slot:
--   placeholder          : dropdown placeholder text
--   emoji                : per-option emoji (unicode or <:name:id>)
--   option_label         : option label template, vars {{robux}} {{price}}
--   option_ok            : option description when the wallet covers the price
--   option_insufficient  : option description when the wallet can't cover it
--
-- Idempotent: merges the role into existing default_json.components without
-- touching the embed body. Existing per-bot overrides (bots.bot_embeds) are
-- unaffected; the embed renderer merges seeded roles into them at read time.
-- ═════════════════════════════════════════════════════════════════════════════

UPDATE bots.embed_slots
SET default_json = jsonb_set(
  default_json,
  '{components}',
  COALESCE(default_json->'components', '{}'::jsonb) || $j$
  {
    "pkg_select": {
      "placeholder": "🎮 เลือก Robux Package",
      "option_label": "{{robux}} Robux ({{price}} บาท)",
      "option_ok": "✅",
      "option_insufficient": "❌ ยอดเงินไม่พอ"
    }
  }
  $j$::jsonb
)
WHERE feature_code = 'roblox-robux-payout'
  AND slot_key = 'buy_eligible';
