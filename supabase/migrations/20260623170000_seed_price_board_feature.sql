-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: price-board feature (port of legacy discord-bot-004-kanom-price).
--
-- A Roblox "price board": the bot posts a parent embed with category buttons into
-- a target channel. Clicking a category button opens that category's price embed
-- (an image + a "ห้องสั่งซื้อสินค้า" link to the order room). Optionally re-posts the
-- board on a schedule so it stays near the bottom of an active channel.
--
-- Config keys mirror the central-bot feature module 1:1 (env injected per subject):
--   PRICE_BOARD_TARGET_CHANNEL_ID (CHANNEL_ID) — channel the board is posted into
--   PRICE_BOARD_AUTO_REPOST       (BOOLEAN)    — re-post the board on a schedule
--   PRICE_BOARD_REPOST_HOURS      (NUMBER)     — hours between auto re-posts
--   PRICE_BOARD_SEND_ON_STARTUP   (BOOLEAN)    — post the board once when the bot boots
--   PRICE_BOARD_BUY_CHANNEL_URL   (STRING)     — fallback URL for the order-room link
--
-- Categories are FIXED at 8 slots (price_cat1..price_cat8). A category button only
-- appears when its component role (price_board → components.btn_catN) has a label, so
-- an admin shows/hides a category by editing the board embed in the Embed Designer.
-- Slots 1..6 are seeded from the legacy bot's config; 7..8 ship empty (hidden).
--
-- No prices seeded — visible but not purchasable until priced via the admin Pricing
-- page (same pattern as server-log / voice-keeper / review-credit). Data-only,
-- idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('price-board',
   'Price Board',
   'บอร์ดราคา Roblox — บอทโพสต์ embed บอร์ดพร้อมปุ่มหมวดหมู่ราคาไปยังห้องที่เลือก กดปุ่มหมวดเพื่อ '
   || 'ดู embed ราคาของหมวดนั้น (รูปราคา + ปุ่มลิงก์ห้องสั่งซื้อ). รองรับสูงสุด 8 หมวด ปรับหน้าตา '
   || 'บอร์ดและ embed ราคาแต่ละหมวดได้ใน Embed Designer (หมวดที่ไม่ตั้งชื่อปุ่มจะถูกซ่อน). '
   || 'ตั้งให้โพสต์บอร์ดซ้ำอัตโนมัติทุก ๆ กี่ชั่วโมงได้ เพื่อให้บอร์ดอยู่ล่างสุดของห้องที่คนคุยบ่อย.',
   'SHOP', FALSE, 80, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ─── Config schema: price-board ──────────────────────────────────────────────
WITH f AS (SELECT id FROM billing.feature_catalog WHERE code = 'price-board')
INSERT INTO billing.feature_variable_templates
  (feature_id, variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
SELECT f.id, v.variable_key, v.label, v.description, v.value_type,
       v.is_required, v.is_sensitive, v.default_value, v.sort_order
FROM f, (VALUES
  ('PRICE_BOARD_TARGET_CHANNEL_ID', 'ห้องบอร์ดราคา',      'ห้องที่จะให้บอทโพสต์บอร์ดราคา'::text,                                      'CHANNEL_ID', TRUE,  FALSE, NULL::text,            10),
  ('PRICE_BOARD_AUTO_REPOST',       'โพสต์ซ้ำอัตโนมัติ',  'เปิดให้บอทโพสต์บอร์ดซ้ำตามช่วงเวลา (ดันบอร์ดมาอยู่ล่างสุดของห้อง)',         'BOOLEAN',    FALSE, FALSE, 'false',               20),
  ('PRICE_BOARD_REPOST_HOURS',      'ทุก ๆ กี่ชั่วโมง',    'ระยะห่างระหว่างการโพสต์ซ้ำ (ชั่วโมง) — ใช้เมื่อเปิดโพสต์ซ้ำอัตโนมัติ',       'NUMBER',     FALSE, FALSE, '2',                   30),
  ('PRICE_BOARD_SEND_ON_STARTUP',   'โพสต์ตอนบอทออนไลน์', 'โพสต์บอร์ด 1 ครั้งทันทีที่บอทเริ่มทำงาน',                                  'BOOLEAN',    FALSE, FALSE, 'false',               40),
  ('PRICE_BOARD_BUY_CHANNEL_URL',   'ลิงก์ห้องสั่งซื้อ',   'ลิงก์ห้องสั่งซื้อสินค้า (ใช้เป็นค่าเริ่มต้นของปุ่มในทุกหมวด ถ้าไม่ได้ตั้งแยกในแต่ละหมวด)', 'STRING', FALSE, FALSE, NULL::text, 50)
) AS v(variable_key, label, description, value_type, is_required, is_sensitive, default_value, sort_order)
ON CONFLICT (feature_id, variable_key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  value_type    = EXCLUDED.value_type,
  is_required   = EXCLUDED.is_required,
  is_sensitive  = EXCLUDED.is_sensitive,
  default_value = EXCLUDED.default_value,
  sort_order    = EXCLUDED.sort_order;


-- ─── Embed slot: price_board — the parent board + category buttons ───────────
-- The bot reads components.btn_cat1..btn_cat8 to build one button per category that
-- has a label; custom_ids are fixed in code (kanom:priceboard:catN). Slots 7..8 are
-- intentionally absent here so those categories stay hidden until an admin adds them.
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  ('price-board', 'price_board', 'บอร์ดราคา (Price Board)',
   'embed บอร์ดราคาที่โพสต์ลงห้อง — ปุ่มหมวด btn_cat1..btn_cat8 (หมวดที่ไม่ตั้ง label จะถูกซ่อน). '
   || 'กดปุ่มหมวดจะเปิด embed ราคาของหมวดนั้น (price_cat1..price_cat8).',
   ARRAY[]::text[],
   $j$
   {
     "color": 15902662,
     "title": "❥・ 　Roblox Price",
     "description": "> <:Ts_5_discord_book:1397694174488297552> คู่มือการใช้งาน\n```เลือกกดปุ่มเพื่อเช็คราคา ```\n",
     "image": { "url": "https://img5.pic.in.th/file/secure-sv1/Banner-Price.png" },
     "components": {
       "btn_cat1": { "label": "ราคาเติมโรไอดีพาส", "emoji": "<:emj_no_01:1465109778371182846>", "style": "primary" },
       "btn_cat2": { "label": "ราคาเติมพรีเมียม",  "emoji": "<:emj_no_02:1465109782078689310>", "style": "primary" },
       "btn_cat3": { "label": "ราคากดเกมพาส",      "emoji": "<:emj_no_03:1465109784335355998>", "style": "primary" },
       "btn_cat4": { "label": "DTI",                "emoji": "<:emj_no_04:1465109786713391216>", "style": "primary" },
       "btn_cat5": { "label": "BLOX FRUITS",        "emoji": "<:emj_no_05:1465109789326577785>", "style": "primary" },
       "btn_cat6": { "label": "BLOX FRUITS(ผลปีศาจ)", "emoji": "<:emj_no_06:1465109792535351458>", "style": "primary" }
     }
   }
   $j$::jsonb, 10)
ON CONFLICT (feature_code, slot_key) DO NOTHING;


-- ─── Embed slots: price_cat1..price_cat8 — per-category price embeds ──────────
-- Rendered ephemerally when a member clicks the matching board button. components.btn_buy
-- styles the order-room link; its url falls back to PRICE_BOARD_BUY_CHANNEL_URL when unset.
-- {{member}} = mention of the member who clicked. Slots 1..6 seeded from the legacy bot;
-- 7..8 ship empty (only shown if an admin also adds a btn_cat7/8 label to the board).
INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  ('price-board', 'price_cat1', 'ราคาหมวด 1', 'embed ราคาที่เปิดเมื่อกดปุ่มหมวด 1 (btn_cat1).',
   ARRAY['member'],
   $j$ { "color": 15902662, "title": "ราคาเติมไอดีพาส", "image": { "url": "https://img2.pic.in.th/ROBUX-ID-PASS8cf0e9b67ac91fbf.png" },
        "components": { "btn_buy": { "label": "ห้องสั่งซื้อสินค้า", "emoji": "<a:Ts_29_discord_star2:1399003255270543500>" } } } $j$::jsonb, 20),
  ('price-board', 'price_cat2', 'ราคาหมวด 2', 'embed ราคาที่เปิดเมื่อกดปุ่มหมวด 2 (btn_cat2).',
   ARRAY['member'],
   $j$ { "color": 15902662, "title": "ราคาเติมพรีเมียม", "image": { "url": "https://img2.pic.in.th/ROBUX-PREMIUM.png" },
        "components": { "btn_buy": { "label": "ห้องสั่งซื้อสินค้า", "emoji": "<a:Ts_29_discord_star2:1399003255270543500>" } } } $j$::jsonb, 30),
  ('price-board', 'price_cat3', 'ราคาหมวด 3', 'embed ราคาที่เปิดเมื่อกดปุ่มหมวด 3 (btn_cat3).',
   ARRAY['member'],
   $j$ { "color": 15902662, "title": "ราคากดเกมพาส", "image": { "url": "https://img2.pic.in.th/ROBUX-GAMEPASS.png" },
        "components": { "btn_buy": { "label": "ห้องสั่งซื้อสินค้า", "emoji": "<a:Ts_29_discord_star2:1399003255270543500>" } } } $j$::jsonb, 40),
  ('price-board', 'price_cat4', 'ราคาหมวด 4', 'embed ราคาที่เปิดเมื่อกดปุ่มหมวด 4 (btn_cat4).',
   ARRAY['member'],
   $j$ { "color": 15902662, "title": "ราคากดเกมพาสแมพ DTI", "image": { "url": "https://img5.pic.in.th/file/secure-sv1/Gamepass-DTI.png" },
        "components": { "btn_buy": { "label": "ห้องสั่งซื้อสินค้า", "emoji": "<a:Ts_29_discord_star2:1399003255270543500>" } } } $j$::jsonb, 50),
  ('price-board', 'price_cat5', 'ราคาหมวด 5', 'embed ราคาที่เปิดเมื่อกดปุ่มหมวด 5 (btn_cat5).',
   ARRAY['member'],
   $j$ { "color": 15902662, "title": "ราคากดเกมพาสแมพ BLOX FRUITS", "image": { "url": "https://img5.pic.in.th/file/secure-sv1/Gamepass-Bloxfruits1.png" },
        "components": { "btn_buy": { "label": "ห้องสั่งซื้อสินค้า", "emoji": "<a:Ts_29_discord_star2:1399003255270543500>" } } } $j$::jsonb, 60),
  ('price-board', 'price_cat6', 'ราคาหมวด 6', 'embed ราคาที่เปิดเมื่อกดปุ่มหมวด 6 (btn_cat6).',
   ARRAY['member'],
   $j$ { "color": 15902662, "title": "ราคากดเกมพาสแมพ BLOX FRUITS(ผลปีศาจ)", "image": { "url": "https://img2.pic.in.th/Gamepass-Bloxfruits2.png" },
        "components": { "btn_buy": { "label": "ห้องสั่งซื้อสินค้า", "emoji": "<a:Ts_29_discord_star2:1399003255270543500>" } } } $j$::jsonb, 70),
  ('price-board', 'price_cat7', 'ราคาหมวด 7', 'embed ราคาที่เปิดเมื่อกดปุ่มหมวด 7 (btn_cat7) — ว่างไว้ ตั้งค่าเองเมื่อต้องการเพิ่มหมวด.',
   ARRAY['member'],
   $j$ { "color": 15902662, "components": { "btn_buy": { "label": "ห้องสั่งซื้อสินค้า" } } } $j$::jsonb, 80),
  ('price-board', 'price_cat8', 'ราคาหมวด 8', 'embed ราคาที่เปิดเมื่อกดปุ่มหมวด 8 (btn_cat8) — ว่างไว้ ตั้งค่าเองเมื่อต้องการเพิ่มหมวด.',
   ARRAY['member'],
   $j$ { "color": 15902662, "components": { "btn_buy": { "label": "ห้องสั่งซื้อสินค้า" } } } $j$::jsonb, 90)
ON CONFLICT (feature_code, slot_key) DO NOTHING;
