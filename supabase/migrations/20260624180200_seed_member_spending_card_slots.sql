-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: member-spending membership-card embed slots.
--
-- Two card designs the /topup add command renders (ported verbatim from the legacy
-- buildCardEmbed):
--   spending_card_first — first time a member is recorded (welcome copy)
--   spending_card_next  — returning member (thanks + lifetime total)
-- Editable in the Embed Designer (plain embeds, no buttons → they appear automatically,
-- no frontend change). Placeholders the renderer substitutes at send time:
--   {{member}} = display name   {{today}} = this entry's baht   {{total}} = lifetime baht
--   {{count}}  = lifetime count {{avatar}} = member avatar url (→ thumbnail)
-- Idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO bots.embed_slots (feature_code, slot_key, label, description, available_vars, default_json, sort_order)
VALUES
  ('member-spending', 'spending_card_first', 'บัตรสมาชิก (ครั้งแรก)',
   'การ์ดที่โพสต์เมื่อลูกค้ามียอดใช้จ่ายครั้งแรก. ตัวแปร: {{member}} ชื่อ, {{today}} ยอดรอบนี้, '
   || '{{total}} ยอดสะสม, {{count}} จำนวนครั้ง, {{avatar}} รูปโปรไฟล์.',
   ARRAY['member','today','total','count','avatar'],
   $j$
   {
     "color": 16761571,
     "title": "<:17106ginghamheartpink:1416825175818895370>  บัตรสมาชิกร้านไอด้า ของคุณ {{member}}",
     "description": "<a:35301pinkclouds:1416827854343245895>   𝖶𝖾𝗅𝖼𝗈𝗆𝖾 𝗇𝖾𝗐 𝗆𝖾𝗆𝖻𝖾𝗋  <a:35301pinkclouds:1416827854343245895>\n୭˚. ᵎᵎ <a:money4:1405847976701726750> ﹕ค่าใช้จ่ายรอบนี้﹕`{{today}}`    บาท \n\n**‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿**\n\n",
     "thumbnail": { "url": "{{avatar}}" }
   }
   $j$::jsonb, 10),
  ('member-spending', 'spending_card_next', 'บัตรสมาชิก (ครั้งถัดไป)',
   'การ์ดที่โพสต์เมื่อลูกค้ากลับมาใช้บริการอีกครั้ง (แสดงยอดสะสม). ตัวแปรเหมือนการ์ดครั้งแรก.',
   ARRAY['member','today','total','count','avatar'],
   $j$
   {
     "color": 14970287,
     "title": "<:17106ginghamheartpink:1416825175818895370> บัตรสมาชิกร้านไอด้า ของคุณ {{member}}",
     "description": "<a:35301pinkclouds:1416827854343245895>  ขอบคุณสำหรับการกลับมาใช้บริการอีกครั้ง <a:35301pinkclouds:1416827854343245895>\n୭˚. ᵎᵎ <a:money4:1405847976701726750> ﹕ค่าใช้จ่ายรอบนี้﹕`{{today}}`    บาท \n<a:60225flyingheartspinkx02:1416825999647178752>  รวมยอดสะสมทั้งหมดของลูกค้า﹕ `{{total}}`  บาท\n**‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿‿**\n\n",
     "thumbnail": { "url": "{{avatar}}" }
   }
   $j$::jsonb, 20)
ON CONFLICT (feature_code, slot_key) DO NOTHING;
