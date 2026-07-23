-- Complete the Wallet & Top-up Components V2 defaults without changing any
-- per-bot overrides in bots.bot_embeds.

UPDATE bots.embed_slots
SET default_json = default_json
  || jsonb_build_object(
    'components',
    COALESCE(default_json->'components', '{}'::jsonb)
      || '{
        "btn_topup": {
          "label": "เติมเงิน",
          "emoji": "💰",
          "style": "success"
        },
        "btn_balance": {
          "label": "เช็คยอดเงินคงเหลือ",
          "emoji": "💳",
          "style": "secondary"
        }
      }'::jsonb,
    'componentsV2',
    COALESCE(default_json->'componentsV2', '{}'::jsonb)
      || jsonb_build_object(
        'texts',
        COALESCE(default_json->'componentsV2'->'texts', '{}'::jsonb)
          || '{
            "heading": "# เติมเงินเข้ากระเป๋า",
            "description": "กดปุ่ม เติมเงิน ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ"
          }'::jsonb,
        'layout',
        '[
          {"id":"topup-panel-text-1","type":"text","content":"# เติมเงินเข้ากระเป๋า"},
          {"id":"topup-panel-separator-2","type":"separator","divider":true,"spacing":2},
          {"id":"topup-panel-separator-3","type":"separator","divider":false,"spacing":1},
          {"id":"topup-panel-text-4","type":"text","content":"กดปุ่ม เติมเงิน ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ"},
          {"id":"topup-panel-separator-5","type":"separator","divider":true,"spacing":2},
          {"id":"topup-panel-row-6","type":"row","rowKey":"topup_panel_actions"}
        ]'::jsonb
      )
  )
WHERE feature_code = 'wallet-topup'
  AND slot_key = 'topup_panel';

UPDATE bots.embed_slots
SET available_vars = ARRAY['member', 'balance', 'avatar_url'],
    default_json = default_json
      || jsonb_build_object(
        'componentsV2',
        COALESCE(default_json->'componentsV2', '{}'::jsonb)
          || jsonb_build_object(
            'texts',
            COALESCE(default_json->'componentsV2'->'texts', '{}'::jsonb)
              || '{
                "heading": "# 💳 เงินในบัญชีของคุณ",
                "balance_text": "# ยอดคงเหลือ {{balance}}"
              }'::jsonb,
            'layout',
            '[
              {"id":"balance-text-1","type":"text","content":"# 💳 เงินในบัญชีของคุณ"},
              {"id":"balance-separator-2","type":"separator","divider":true,"spacing":2},
              {"id":"balance-section-3","type":"section","content":"# ยอดคงเหลือ {{balance}}","accessoryUrl":"{{avatar_url}}"},
              {"id":"balance-separator-4","type":"separator","divider":false,"spacing":1},
              {"id":"balance-separator-5","type":"separator","divider":true,"spacing":2},
              {"id":"balance-media-6","type":"media","url":"","description":"Wallet artwork"}
            ]'::jsonb
          )
      )
WHERE feature_code = 'wallet-topup'
  AND slot_key = 'balance';
