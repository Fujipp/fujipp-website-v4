-- One-time rollout of Fujipp's canonical Wallet & Top-up templates.
--
-- Existing per-bot overrides are deliberately removed for this feature so every
-- current bot receives the new baseline. Owners can immediately save new
-- overrides afterwards; bots.bot_embeds remains the customization layer.

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
            "description": "กดปุ่ม **เติมเงิน** ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ"
          }'::jsonb,
        'layout',
        '[
          {"id":"topup-panel-text-1","type":"text","content":"# เติมเงินเข้ากระเป๋า"},
          {"id":"topup-panel-separator-2","type":"separator","divider":true,"spacing":2},
          {"id":"topup-panel-separator-3","type":"separator","divider":false,"spacing":1},
          {"id":"topup-panel-text-4","type":"text","content":"กดปุ่ม **เติมเงิน** ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ"},
          {"id":"topup-panel-separator-5","type":"separator","divider":true,"spacing":2},
          {"id":"topup-panel-row-6","type":"row","rowKey":"topup_panel_actions"}
        ]'::jsonb
      )
  )
WHERE feature_code = 'wallet-topup'
  AND slot_key = 'topup_panel';

DELETE FROM bots.bot_embeds AS override
USING bots.embed_slots AS slot
WHERE override.slot_key = slot.slot_key
  AND slot.feature_code = 'wallet-topup';
