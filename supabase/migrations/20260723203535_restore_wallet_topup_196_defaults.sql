-- Restore the Wallet & Top-up panel default that was active in release #196.
--
-- The later canonical-template rollout changed this default and deleted every
-- per-bot Wallet override. There is no database backup/PITR snapshot from which
-- those deleted custom values can be recovered, so this forward migration only
-- restores the known-good #196 default. It deliberately does not delete or
-- overwrite any overrides that owners have saved since that rollout.

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
