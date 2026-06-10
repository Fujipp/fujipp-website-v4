# Embed Designer — Design (config ชั้น 3, ของกลาง)

> สถานะ: **กำลัง implement** (ต่อจาก feature-bot-platform.md §3.2)
> เป้าหมาย: ให้ลูกค้า **config หน้าตา embed ของบอทได้เอง** (สี/ข้อความ/รูป/ฟิลด์/ปุ่ม + custom emoji)
> พร้อม **พรีวิวสดบนเว็บ**. Kanom (roblox-robux-payout + wallet-topup) เป็นผู้ใช้รายแรก.

> Handoff note (2026-06-10): ตอนพัฒนา/ทดสอบยังใช้ **บอทเทส** ไม่ใช่ token ของ Kanom จริง แต่
> default embed/config ให้ทำเหมือน Kanom production ที่รันอยู่บน VPS เดิมมากที่สุด. เป้าหมายคือย้ายจาก
> "รันเองบน VPS" มาเป็น "เว็บเรา run + config + control runtime" โดยไม่เปลี่ยนประสบการณ์หน้าร้านของลูกค้า.

---

## 1. แนวคิด

แต่ละ feature **ประกาศ "embed slots"** (จุด render ที่ตั้งชื่อไว้). แต่ละ slot มี **default template**
และ **override ต่อบอท**ได้. เก็บเป็น **JSON structured**. บอท render = template + ตัวแปรสด.
Frontend มี **embed builder ตัวเดียว** (ฟอร์มมีโครง) + **พรีวิวหน้าตา Discord** ใช้ซ้ำทุก slot.

- ปุ่ม/select: **พฤติกรรมตายตัว** (custom_id ผูก handler ในบอท) — config ได้แค่ **appearance**
  (`label`, `emoji`, `style`, `placeholder`, `url` สำหรับ link button). ห้ามให้ user แก้ `custom_id`.
- ตัวเลือกที่เป็น dynamic (เช่น รายการกลุ่ม robux) บอทเติมเองตอน render.
- **custom emoji:** วาง markup `<:name:id>` / `<a:name:id>`; บอทส่งตรง (Discord เรนเดอร์เอง),
  เว็บพรีวิวแปลงเป็นรูป `https://cdn.discordapp.com/emojis/{id}.png` (หรือ `.gif` ถ้า animated).

---

## 2. Embed slots (Kanom)

| slot_key | feature | ใช้ตอน | ตัวแปรสด (available_vars) |
| --- | --- | --- | --- |
| `shop_panel` | roblox-robux-payout | panel ซื้อ/เติม | `group_rows` (ชื่อ+stock ต่อกลุ่ม), `group_options` |
| `balance` | wallet-topup | เช็คยอด | `member`, `balance` |
| `redeem_success` | roblox-robux-payout | แลก Robux สำเร็จ | `member`, `robux`, `group_name`, `balance` |
| `topup_method` | wallet-topup | เลือกช่องทางเติม | — |
| `topup_qr` | wallet-topup | โชว์ QR พร้อมเพย์ | `qr_image`, `amount`, `account_name`, `countdown`, `ref` |
| `topup_timeout` | wallet-topup | หมดเวลา | `ref` |
| `processing` | wallet-topup | กำลังเช็ค | — |
| `error` | wallet-topup | error | `reason` |
| `topup_failed` | wallet-topup | เติมไม่สำเร็จ | `reason` |
| `topup_success` | wallet-topup | เติมสำเร็จ | `member`, `amount`, `total_balance`, `method`, `datetime` |

> ดีไซน์ JSON เต็มของแต่ละ slot (จากที่ลูกค้าให้มา) ใช้เป็น **target ของ default template**
> ตอนทำ renderer/builder. โครง JSON มาตรฐาน: `color, title, description, image, thumbnail,
> footer, author, fields[], components`.

**Templating:** ค่า dynamic ใช้ `{{var}}` ในข้อความ เช่น `{{amount}}`, `{{balance}}`, `{{countdown}}`.
บอทแทนค่าเป็น string ตอน render. ส่วนที่ซ้ำ (เช่น stock ต่อกลุ่ม) ใช้ section แบบ repeatable.

---

## 3. Data model

สอง table ใน schema `bots` (central-bot อ่าน DB ตรงด้วย service_role อยู่แล้ว):

```
bots.embed_slots          -- registry + default ต่อ feature (seeded)
  feature_code, slot_key  (PK)
  label, description
  available_vars text[]   -- ตัวแปรที่ใช้ได้ (โชว์ใน builder)
  default_json jsonb      -- template ตั้งต้น
  sort_order

bots.bot_embeds           -- override ต่อบอท
  id, subject_id (=bot id), slot_key
  embed_json jsonb
  unique (subject_id, slot_key)
```

บอท render: หา `bot_embeds(subject, slot)` → ถ้าไม่มี ใช้ `embed_slots.default_json`.
ไม่ inject ผ่าน env (JSON ใหญ่) — อ่าน DB ตรงตอน render + cache.

> ทำไมไม่ใช้ `feature_config_values`: embed เป็น template ก้อนใหญ่ที่บอทโหลด ไม่ใช่ env var —
> แยก table อ่านง่าย/แก้ง่ายกว่า.

---

## 4. ลำดับงาน (หลังบ้านก่อน)

1. **DB schema** — `embed_slots` + `bot_embeds` + seed registry (slot keys + available_vars + default ตั้งต้น). ← *เริ่มแล้ว*
2. **central-bot renderer** — โมดูลกลาง: โหลด embed JSON(subject, slot) → แทน `{{var}}` → build `EmbedBuilder` + components (label/emoji/style จาก config, custom_id/handler ตายตัว). แทน embed hardcode ใน wallet-topup + roblox. ← *กำลังทำ*
3. **backend API** — `GET/PUT /api/bots/{id}/embeds[/{slot}]` (เช็ค ownership) เก็บ `bot_embeds`. ← *ทำแล้ว*
4. **frontend** — embed builder (ฟอร์มมีโครง: สี/title/desc/image/thumbnail/footer/author/fields[]/ปุ่ม) + **พรีวิวสดหน้าตา Discord** + แปลง custom emoji เป็นรูป CDN. ใช้ซ้ำทุก slot. ← *กำลังทำ*

เฟสหลัง: live emoji picker (ดึง emoji จากเซิฟจริงผ่าน Discord API), embed slots ของ feature อื่น.

---

## 5. Component roles (fixed behavior, editable appearance)

เก็บใน embed JSON ที่ key `components` โดย key ย่อยคือ **role name** ไม่ใช่ `custom_id`.
บอทเป็นคน map role → Discord component/custom_id เอง.

```json
{
  "components": {
    "group_select": { "placeholder": "เลือกกลุ่มที่ต้องการซื้อ", "emoji": "<:robux:123>" },
    "btn_topup": { "label": "เติมเงิน", "emoji": "💸", "style": "primary" },
    "btn_buy": { "label": "ซื้อสินค้า", "emoji": "🛒", "style": "danger" },
    "btn_balance": { "label": "เช็คยอดคงเหลือ", "style": "secondary" },
    "btn_link": { "label": "ลิงก์กลุ่ม", "emoji": "🔗", "url": "https://..." },
    "method_select": { "placeholder": "เลือกช่องทางการเติมเงิน", "emoji": "💳" }
  }
}
```

Current known roles:

| slot_key | role | type | editable appearance | fixed behavior |
| --- | --- | --- | --- | --- |
| `shop_panel` | `group_select` | select | `placeholder`, `emoji` | เลือก Roblox group จาก config/stock สด |
| `shop_panel` | `btn_topup` | button | `label`, `emoji`, `style` | เปิด top-up flow |
| `shop_panel` | `btn_buy` | button | `label`, `emoji`, `style` | บอกให้เลือกกลุ่มก่อนซื้อ |
| `shop_panel` | `btn_balance` | button | `label`, `emoji`, `style` | แสดง wallet balance |
| `shop_panel` | `btn_link` | link button | `label`, `emoji`, `url` | เปิด group/community link |
| `topup_method` | `method_select` | select | `placeholder`, `emoji` | เลือก PromptPay/TrueMoney flow |

Implementation notes for AI agents:

- Do not expose or persist Discord `custom_id` in the frontend editor.
- Do not let a custom-id button use Discord `Link` style; link buttons are URL-only and do not route interactions.
- Select menus do not have a label for the menu itself; use `placeholder` and optional `emoji`. Option labels stay owned by bot logic unless a later task explicitly scopes option appearance.
- Effective config should preserve the old override model for the embed body: if a bot override exists, it owns title/description/image/fields. Only `components` merge from seeded default + override so new roles can appear on old saved configs.
- The current branch is `feat/component-config`. It contains uncommitted work for this role editor and central-bot appearance renderer.
- Kanom default role appearance is seeded by `supabase/migrations/20260610121000_seed_kanom_component_appearance.sql`.

---

## 6. เติมเงินในตัว (ส่วนของ wallet-topup)

- **SlipOK:** ลูกค้าไปเอา API key/branch มากรอกเอง (config ต่อบอท, secret เข้ารหัส).
- **TrueMoney voucher:** ใช้ service ของเรา (ที่เขียนไว้) — บอทเรียกผ่าน service token กลาง.
- QR/นับถอยหลัง/แนบสลิป = ไหลผ่าน slots `topup_method → topup_qr → processing → topup_success/failed/timeout`.
