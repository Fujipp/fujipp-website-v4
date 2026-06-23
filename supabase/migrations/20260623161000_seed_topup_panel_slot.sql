-- ═════════════════════════════════════════════════════════════════════════════
-- Embed slot: topup_panel — the standalone top-up panel for the wallet-topup feature.
--
-- /topup-panel (admin) posts this embed with a "เติมเงิน" button so members can top
-- up WITHOUT the Roblox Robux Payout panel. Clicking the button opens the existing
-- top-up method picker (PromptPay / TrueMoney). The embed frame is configurable in
-- the Embed Designer; the btn_topup component role styles the button.
--
-- Data-only, idempotent. No new config keys — reuses the wallet-topup top-up flow.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  ('wallet-topup', 'topup_panel', 'แผงเติมเงิน (Top-up Panel)',
   'หน้าตาแผงเติมเงินที่โพสต์ด้วยคำสั่ง /topup-panel — มีปุ่มให้สมาชิกกดเติมเงินเข้ากระเป๋า '
   || 'ใช้ได้โดยไม่ต้องมีฟีเจอร์ Roblox. ปุ่ม "เติมเงิน" ปรับหน้าตาได้ที่ component btn_topup.',
   ARRAY[]::text[],
   '{"color": 3066993, "title": "💰 เติมเงินเข้ากระเป๋า", '
   || '"description": "กดปุ่ม **เติมเงิน** ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ", '
   || '"components": {"btn_topup": {"label": "เติมเงิน", "emoji": "💰", "style": "primary"}}}'::jsonb,
   15)
ON CONFLICT (feature_code, slot_key) DO NOTHING;
