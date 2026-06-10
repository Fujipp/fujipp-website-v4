-- ═════════════════════════════════════════════════════════════════════════════
-- Seed Kanom component appearance defaults for Embed Designer F5.
--
-- The running/test bot still uses fixed custom_ids in central-bot. This migration
-- only adds the editable appearance layer under default_json.components so the web
-- editor and central-bot can render buttons/selects like the current Kanom panel.
--
-- Idempotent: merges role keys into existing default_json.components without
-- changing title/description/image/fields seeded by 20260610120000.
-- Existing per-bot overrides (bots.bot_embeds) are unaffected.
-- ═════════════════════════════════════════════════════════════════════════════

UPDATE bots.embed_slots
SET default_json = jsonb_set(
  default_json,
  '{components}',
  COALESCE(default_json->'components', '{}'::jsonb) || $j$
  {
    "group_select": {
      "placeholder": "เลือกกลุ่มที่ต้องการซื้อ Robux",
      "emoji": "<:Ts_20_discord_shop:1397694256067514622>"
    },
    "btn_topup": {
      "label": "เติมเงิน",
      "emoji": "<:Ts_0_discord_bank:1398972893416914965>",
      "style": "primary"
    },
    "btn_buy": {
      "label": "ซื้อสินค้า",
      "emoji": "<:Ts_20_discord_shop:1397694256067514622>",
      "style": "danger"
    },
    "btn_balance": {
      "label": "เช็คยอดคงเหลือ",
      "emoji": "<:Ts_19_discord_coin:1397694253676630066>",
      "style": "secondary"
    },
    "btn_link": {
      "label": "ลิงก์กลุ่ม",
      "emoji": "🔗"
    }
  }
  $j$::jsonb
)
WHERE feature_code = 'roblox-robux-payout'
  AND slot_key = 'shop_panel';

UPDATE bots.embed_slots
SET default_json = jsonb_set(
  default_json,
  '{components}',
  COALESCE(default_json->'components', '{}'::jsonb) || $j$
  {
    "method_select": {
      "placeholder": "เลือกช่องทางการเติมเงิน",
      "emoji": "<:Ts_0_discord_bank:1398972893416914965>"
    }
  }
  $j$::jsonb
)
WHERE feature_code = 'wallet-topup'
  AND slot_key = 'topup_method';
