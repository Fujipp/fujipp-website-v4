-- ═════════════════════════════════════════════════════════════════════════════
-- Embed Designer (config layer 3) — configurable bot embeds
--
-- Each feature declares named "embed slots" (render points). A slot has a default
-- template; a bot can override it. central-bot renders: load the bot's override
-- (bots.bot_embeds) or fall back to the slot default (bots.embed_slots), substitute
-- {{vars}}, and build the Discord embed + components. Component behavior is fixed
-- (custom_id → handler); only label/emoji/style/text are configurable.
--
--   bots.embed_slots  — registry of slots + default template (seeded, per feature)
--   bots.bot_embeds   — per-bot override (subject_id = the bot / external_subject_id)
--
-- Embeds are JSON the bot loads (not env vars), so they live in their own tables that
-- central-bot reads directly (service_role), like the shop wallet. Custom emoji are
-- stored as raw Discord markup (<:name:id> / <a:name:id>); Discord renders them in
-- messages and the web builder converts them to cdn.discordapp.com images for preview.
--
-- Access model: backend / central-bot via service_role only. Not exposed to the Data
-- API; RLS is defense-in-depth.
--
-- Depends on: public.set_updated_at(), schema `bots` (20260605171000)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bots.embed_slots (
    feature_code   TEXT    NOT NULL,
    slot_key       TEXT    NOT NULL,
    label          TEXT    NOT NULL,
    description    TEXT,
    available_vars TEXT[]  NOT NULL DEFAULT '{}',
    default_json   JSONB   NOT NULL DEFAULT '{}'::jsonb,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT embed_slots_pkey PRIMARY KEY (feature_code, slot_key)
);


CREATE TABLE IF NOT EXISTS bots.bot_embeds (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    subject_id TEXT        NOT NULL,            -- the bot (external_subject_id)
    slot_key   TEXT        NOT NULL,
    embed_json JSONB       NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bot_embeds_pkey PRIMARY KEY (id),
    CONSTRAINT bot_embeds_subject_slot_key UNIQUE (subject_id, slot_key)
);
CREATE INDEX IF NOT EXISTS idx_bot_embeds_subject ON bots.bot_embeds (subject_id);

CREATE OR REPLACE TRIGGER bot_embeds_set_updated_at
    BEFORE UPDATE ON bots.bot_embeds
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ═════════════════════════════════════════════════════════════════════════════
-- RLS — service_role only (backend / central-bot via JDBC/pg).
-- ═════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['embed_slots','bot_embeds'] LOOP
    EXECUTE format('ALTER TABLE bots.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT ALL ON bots.%I TO service_role;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON bots.%I;', t || '_service_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON bots.%I TO service_role USING (true) WITH CHECK (true);',
      t || '_service_all', t);
  END LOOP;
END $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- Seed the slot registry for the Roblox payout + wallet-topup features (Kanom).
-- default_json is a minimal starter (color/title/description); the rich templates
-- from the customer's designs are applied via the builder once it exists.
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  ('roblox-robux-payout', 'shop_panel', 'แผงร้าน (ซื้อ/เติม)',
   'พาเนลหลัก แสดงสต็อก Robux ต่อกลุ่ม + ปุ่มซื้อ/เติม/เช็คยอด',
   ARRAY['group_rows','group_options'],
   '{"color": 1579032, "title": "ร้านค้า Robux", "description": "เลือกกลุ่มที่ต้องการซื้อจากเมนูด้านล่าง"}'::jsonb, 10),

  ('roblox-robux-payout', 'redeem_success', 'แลก Robux สำเร็จ',
   'แสดงผลเมื่อจ่าย Robux สำเร็จ',
   ARRAY['member','robux','group_name','balance'],
   '{"color": 9107360, "title": "แลก Robux สำเร็จ", "description": "<@{{member}}> ได้รับ {{robux}} Robux จากกลุ่ม {{group_name}}\nยอดคงเหลือ {{balance}}"}'::jsonb, 20),

  ('wallet-topup', 'topup_method', 'เลือกช่องทางเติมเงิน',
   'ให้ผู้ใช้เลือกช่องทาง (พร้อมเพย์ / ทรูมันนี่)',
   ARRAY[]::text[],
   '{"color": 9090807, "title": "เลือกช่องทางเติมเงิน", "description": "กดเลือกช่องทางที่ต้องการจากเมนูด้านล่าง"}'::jsonb, 30),

  ('wallet-topup', 'topup_qr', 'แสดง QR พร้อมเพย์',
   'แสดง QR + ยอด + ชื่อบัญชี + นับถอยหลัง',
   ARRAY['qr_image','amount','account_name','countdown','ref'],
   '{"color": 15902662, "title": "เติมเงินผ่านพร้อมเพย์", "description": "จำนวนเงิน {{amount}}\nชื่อบัญชี {{account_name}}\nเหลือเวลา {{countdown}}", "image": {"url": "{{qr_image}}"}}'::jsonb, 40),

  ('wallet-topup', 'topup_timeout', 'หมดเวลา',
   'เกินเวลาที่กำหนด',
   ARRAY['ref'],
   '{"color": 16222858, "title": "เกินเวลาที่กำหนด", "description": "หากทำรายการไม่ทัน กรุณาเปิดเมนูเติมเงินใหม่อีกครั้ง"}'::jsonb, 50),

  ('wallet-topup', 'processing', 'กำลังประมวลผล',
   'กำลังตรวจสอบ/เช็ค',
   ARRAY[]::text[],
   '{"color": 15902662, "title": "กำลังประมวลผล", "description": "กำลังตรวจสอบ กรุณารอสักครู่"}'::jsonb, 60),

  ('wallet-topup', 'error', 'เกิดข้อผิดพลาด',
   'ข้อความ error ทั่วไป',
   ARRAY['reason'],
   '{"color": 16222858, "title": "เกิดข้อผิดพลาด", "description": "{{reason}}"}'::jsonb, 70),

  ('wallet-topup', 'topup_failed', 'เติมเงินไม่สำเร็จ',
   'แสดงผลเมื่อเติมไม่สำเร็จ',
   ARRAY['reason'],
   '{"color": 16222858, "title": "เติมเงินไม่สำเร็จ", "description": "{{reason}}"}'::jsonb, 80),

  ('wallet-topup', 'topup_success', 'เติมเงินสำเร็จ',
   'แสดงผลเมื่อเติมสำเร็จ',
   ARRAY['member','amount','total_balance','method','datetime'],
   '{"color": 9107360, "title": "เติมเงินสำเร็จ", "description": "<@{{member}}> เติม {{amount}}\nยอดทั้งหมด {{total_balance}}\nช่องทาง {{method}}\n{{datetime}}"}'::jsonb, 90),

  ('wallet-topup', 'balance', 'เช็คยอดคงเหลือ',
   'แสดงยอดคงเหลือของผู้ใช้',
   ARRAY['member','balance'],
   '{"color": 1579032, "title": "กระเป๋าเงินของคุณ", "description": "ยอดคงเหลือ **{{balance}}**"}'::jsonb, 100)
ON CONFLICT (feature_code, slot_key) DO NOTHING;
