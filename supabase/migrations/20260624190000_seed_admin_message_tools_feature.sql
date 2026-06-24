-- ═════════════════════════════════════════════════════════════════════════════
-- Seed: admin-message-tools feature (port of legacy discord-bot-002-idaxdshop
-- /dm + /message).
--
-- Admin messaging tools: DM a member (/dm), send a message or file to a channel
-- (/message send|sendfile), and edit a message the bot sent (/message edit) — all via
-- modals. No DB and no settings: the commands gate purely on Discord member
-- permissions (Administrator for /dm, Manage Messages for /message), so this feature
-- has no config templates.
--
-- No prices seeded — built but not for sale yet (grant per-bot via admin, like
-- review-credit). Data-only, idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO billing.feature_catalog (code, name, description, category, is_featured, sort_order, is_active)
VALUES
  ('admin-message-tools',
   'Admin Message Tools',
   'เครื่องมือส่งข้อความสำหรับแอดมิน — /dm ส่ง DM ถึงสมาชิกผ่าน Modal, /message ส่งข้อความ/ไฟล์ '
   || 'เข้าห้องที่เลือก และแก้ไขข้อความที่บอทเคยส่งได้. ควบคุมสิทธิ์ด้วยสิทธิ์สมาชิกของ Discord '
   || '(แอดมินสำหรับ /dm, จัดการข้อความสำหรับ /message).',
   'ADMIN', FALSE, 90, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_featured = EXCLUDED.is_featured,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;
