# Runtime / Slot Redesign — แผนงาน

> สถานะ: **Backend Phase 1–4 เสร็จ (merged #103, #105–#108) · เหลือ frontend + orchestrator start/stop**
>
> Progress: DB model #103 · Bot Slot #105 · Runtime cabinet #106 · derived bot status #107 · admin VPS seats #108.
> ยังเหลือ: frontend (หน้า Bot badge+modal ซื้อ slot, หน้า Runtime ตู้ Server), admin 4b (cabinet view + manual move-runtime), และเฟสท้ายสุด start/stop จริง.
> ขอบเขต: แยกของ user เป็น 3 อย่างให้ชัด — Bot Slot, Runtime, Feature
> เกี่ยวข้อง: `services/billing-service/`, `backend/`, `frontend/src/features/shop/`,
> `supabase/migrations/20260622150000..150200`, ต่อยอดจาก [feature-bot-platform.md](./feature-bot-platform.md)

---

## 1. แกนคิด

- **Bot Slot = สิทธิ์มีบอท** — ถาวร ฟรี 3 ตัว เกินนั้น 50฿/ตัว ไม่หมดอายุ
- **Feature = ของติดตัวบอท** — ถาวร per-bot, **ย้ายไม่ได้** (มีอยู่แล้ว ไม่แตะ)
- **Runtime = ช่องเครื่องที่ทำให้บอทมีชีวิต** — รายเดือน (1/2/3 เดือน), ผูกกับ **slot ใน VPS**, **ย้ายข้ามบอทได้**

```
user ─┬─ bot #1 ──(feature ติดตัว)        ← Online  ถ้ามี runtime active ชี้มา
      ├─ bot #2 ──(feature ติดตัว)        ← Offline ถ้าไม่มี runtime
      └─ bot #3 ──(feature ติดตัว)        ← Expired ถ้า runtime หมดอายุ

runtime A ─ ซื้อไว้ที่ VPS2 / slot 5 ─ assign ให้ bot #1   (ย้ายไป bot #2 ได้ → #1 offline ทันที)
```

## 2. กฎธุรกิจที่ล็อก

1. สร้างบอทได้สูงสุด = `free_count(3) + paid_bot_slots`
2. Bot Slot ซื้อแล้วถาวร ไม่หมดอายุ
3. **บอทไม่จองช่อง VPS ตอนสร้าง** — ช่องถูกจองโดย Runtime ที่ซื้อ (รู้ว่า VPS ไหน / slot ไหน)
4. 1 VPS slot มี active runtime ได้แค่ 1 / 1 runtime อยู่ได้ 1 slot
5. 1 runtime assign ให้บอทได้แค่ 1 ตัว / 1 บอทมี active runtime ได้แค่ 1
6. ย้าย runtime ไปบอทอื่น → บอทเดิม **offline ทันที**
7. **Renew = ต่ออายุ runtime** (ไม่ใช่ของบอท ไม่ใช่ซื้อ feature ใหม่)
8. runtime หมดอายุ → ปล่อย slot คืน → บอท offline

## 3. DB — เสร็จแล้ว (#103)

| ตาราง/การเปลี่ยน | migration | บทบาท |
| --- | --- | --- |
| `bots.vps_slots` (FREE/RESERVED/MAINTENANCE) + `vps_nodes.reserved_slots` | 150000 | ช่องจริงในตู้ VPS; occupancy = derive จาก active runtime ที่ชี้มา |
| `bots.user_bot_slots(paid_slots)` + kind `BOT_SLOT` + settings `bot_slot.free_count/price_satang` | 150100 | ตัวนับ slot ถาวรที่ซื้อเพิ่ม |
| `runtime_subscriptions` + `vps_slot_id` (FK→vps_slots), `external_subject_id` nullable, partial-unique (1 active/บอท, 1 active/slot) | 150200 | runtime ย้ายได้ + ผูก slot; backfill + auto-assign ของเดิมแล้ว |

**ตัดสินใจไว้แล้ว:** ใช้ `external_subject_id` เป็น bot-link (nullable, ย้ายได้) ไม่เพิ่ม `assigned_bot_id`; occupancy เป็น derived ไม่เก็บซ้ำ; migration เป็น additive ล้วน (`ddl-auto=validate` ผ่าน)

## 4. Wiring (Backend — ทำทีหลังเฟส)

### Phase 1 — Bot Slot
- **billing-service**: รับซื้อ `BOT_SLOT` 5000 satang → ตัด wallet → `+1 user_bot_slots.paid_slots` → order item (ใช้ `OrderService` เดิม)
- **backend** create-bot: **เลิกเรียก `PlacementService`** ตอนสร้าง; อ่าน `free_count + paid_slots`, นับบอทที่มี, เกิน cap → 409 พร้อม reason ให้ frontend เปิด modal ซื้อ
- entity ใหม่: `UserBotSlot` (schema `bots`); อ่าน price/free_count จาก `billing.automation_settings`

### Phase 2 — Runtime / ตู้ VPS
- map `vps_slot_id` เข้า `RuntimeSubscription` (billing) + entity `VpsSlot` (read + lock)
- ปรับ **placement**: ไม่ pack ตอนสร้างบอทอีกต่อไป — ช่องถูกเลือกตอนซื้อ runtime; `bot_instances.vps_node_id` กลายเป็น cache = node ของ slot ที่ runtime active ชี้อยู่ (อัปเดตตอน assign/move)
- endpoints:
  - `GET` รายการ VPS + slots (สถานะ ว่าง/ถูกใช้/reserved/maintenance — ว่าง = `status=FREE` และไม่มี active runtime ชี้)
  - ซื้อ runtime ให้ slot ที่เลือก (เลือก 1/2/3 เดือน, ราคาเดิม 69/130/199฿) — `SELECT … FOR UPDATE` ที่ slot กันแย่ง, ตู้เต็ม → 409
  - assign runtime → บอท
  - move runtime → บอทอื่น (set `external_subject_id` ใหม่ → บอทเดิม offline)
  - renew runtime (ต่อ `current_period_end` แบบ stack — มี `SubscriptionService` เดิม)
- expiry: runtime ไม่ active → slot ว่าง (derived) → บอท offline (มี automation job เดิม, เปิด `automation.runtime_suspend_enabled` เมื่อพร้อม)

### Phase 3 — สถานะบอท derived
- คำนวณ Online / Offline / Expired จาก active runtime + วันหมดอายุ; ใส่ใน bot list DTO (ไม่เก็บซ้ำใน `bot_instances.status` ซึ่งเป็นสถานะ process)

### Phase 4 — Admin VPS
- เพิ่ม/ปิด VPS, ตั้ง `max_slots` + `reserved_slots` (→ regenerate `vps_slots`), ปิด slot เป็น MAINTENANCE, ดู runtime ต่อ slot, ย้าย runtime แบบ manual (ต่อยอด `AdminVpsController` / `VpsNodeAdminService` เดิม)

## 5. Frontend (พี่ทำ — ผมเตรียม API/แนะนำ)
- **หน้า Bot**: badge Online/Offline/Expired, ปุ่ม + สร้าง (เต็ม → modal ซื้อ slot 50฿)
- **หน้า Runtime**: "ตู้ Server" grid ต่อ VPS, slot ว่าง/ของฉัน/ถูกใช้/maintenance, เลือกช่องว่าง → เลือกเดือน → assign บอท; ตู้เต็ม → กดไม่ได้ + "เต็ม"
- ปุ่ม move / renew runtime

## 6. เฟสท้ายสุด
- เชื่อม `bot-runtime-service` ให้ start/stop จริงตาม assignment (ตอนนี้เป็น data model)

## 7. ลำดับแนะนำ
Phase 1 (Bot Slot) → 2 (Runtime/seat) → 3 (status) → 4 (admin) → real start/stop

## 8. Open
- ราคา runtime เท่ากันทุกตู้ (ยืนยันแล้ว ใช้ `runtime_plans` เดิม)
- `bot_instances.status` (process) vs สถานะ shop (derived) — แยกกัน อย่าปนกัน
