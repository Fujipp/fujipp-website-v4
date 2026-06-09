# Kanom Onboarding — Migration Plan (chunk 3)

> สถานะ: **แผน (ยังไม่เริ่ม execute)**
> เป้าหมาย: ย้ายบอท **Kanom** (Roblox Robux payout + เติมเงิน) จากระบบเดิม (รันแยก + ฐานข้อมูล NEON)
> เข้ามาอยู่ในแพลตฟอร์ม — เป็นบอทแรกที่ "ถอด" เข้าระบบ
> เกี่ยวข้อง: `services/central-bot/` (feature roblox-robux-payout + wallet-topup),
> schema `shop` (`supabase/migrations/20260608110000_create_shop_wallet.sql`),
> bot registry + slot (`bots` schema)

---

## 1. ภาพรวม

Kanom **ไม่ใช่โค้ดแปลกปลอม** — มันคือฟีเจอร์ `roblox-robux-payout` + `wallet-topup` ที่ central-bot
มีอยู่แล้ว. การ onboard จึงเป็นเรื่อง **config + ย้ายข้อมูล (ETL)** ไม่ใช่เขียนฟีเจอร์ใหม่.

สิ่งที่ Kanom ทำ: ลูกค้าเติมเงิน (SlipOK / TrueMoney voucher) → ได้ยอดในกระเป๋า → แลกเป็น Robux
ที่จ่ายออกจาก **Roblox group** (มี 3 กลุ่ม แต่ละกลุ่มมี cookie + 2FA ของตัวเอง).

---

## 2. ของที่มีอยู่แล้ว (ไม่ต้องทำซ้ำ)

| ความสามารถ | ที่อยู่ |
| --- | --- |
| **Multi-group payout** (3 กลุ่ม, cookie/totp ต่อกลุ่ม) | central-bot อ่าน `ROBLOX_GROUPS` (JSON), `ROBLOX_GROUP_ID_n`, และ `ROBLOX_GROUPS_DEFAULT` — `services/central-bot/src/features/roblox-robux-payout/roblox.js` |
| **Config schema ของ 3 กลุ่ม** | `feature_variable_templates` มี `ROBLOX_GROUPS` (JSON, sensitive) อยู่แล้ว — `migrations/20260605170000` |
| **บ้านข้อมูลกระเป๋า/ประวัติ** | `shop.member_wallets` + `shop.wallet_ledger` (key = `external_subject_id` + `member_discord_id`, เก็บ satang) |
| **เติมเงิน in-bot** | feature `wallet-topup` (`/wallet`, `/wallet-add`) + Roblox `/robux-redeem` หักกระเป๋า |
| **bot registry + slot + runtime** | chunk 1–2 (สร้างบอท, จอง slot, start/stop) |

→ **ไม่มีการเขียนฟีเจอร์ใหม่ใน chunk นี้.** งานคือ config + ETL + cutover.

---

## 3. การตัดสินใจเรื่องกระเป๋าเงิน

**1 member = 1 กระเป๋า (shared ทั้งบอท)** — ตรงกับ `shop.member_wallets` ที่ key ด้วย
`(external_subject_id, member_discord_id)` โดย **ไม่มีมิติ group/project**.

- ตอนนี้ Kanom มี **project เดียว** (กระเป๋าเดียวต่อคน).
- "3 group" = **แหล่งจ่าย Robux 3 แหล่ง** ที่ใช้กระเป๋าเดียวกัน — ไม่ใช่กระเป๋าแยก.
- อนาคตถ้ามีหลาย project ก็ยัง map เข้ากระเป๋าเดียวต่อ member (subject = บอท = tenant).

→ **ไม่ต้องแก้ schema `shop`.**

---

## 4. Data model mapping (NEON → Supabase `shop`)

ระบบเดิม (NEON) มีตาราง: `projects`, `users`, `wallets`, `topup_transactions`.

| NEON | → | เรา (`shop`) | หมายเหตุ |
| --- | --- | --- | --- |
| `users.discord_user_id` (text) | → | `member_discord_id` | คีย์ของ member |
| `wallets.balance` numeric(14,2) THB | → | `member_wallets.balance_satang` BIGINT | **×100, ปัดเป็นจำนวนเต็ม** — ยอดปัจจุบัน (authoritative) |
| `wallets.total_accumulated_topup` | → | `member_wallets.total_topup_satang` | ×100 |
| `wallets.truemoney_topup` | → | (รวมเข้า `total_topup_satang` หรือ note) | ดู §6 ข้อ 3 |
| `topup_transactions` (amount, method, occurred_at) | → | `shop.wallet_ledger` (CREDIT/TOPUP) | ×100, `reference`=method, `created_at`=occurred_at, `note`='migrated' |
| — | | `external_subject_id` = **bot id ของ Kanom** | ทุกแถวผูก subject เดียว |

**Money:** THB numeric(14,2) → satang = `round(value * 100)` (BIGINT). ระวัง floating point — คูณแบบ decimal/string ไม่ใช่ float.

**ถ้ามีหลาย project (อนาคต):** `GROUP BY discord_user_id`, `SUM(balance)` ข้าม project = กระเป๋าเดียว.

---

## 5. ขั้นตอน (3 phase)

### Phase 1 — Onboard bot (config, ไม่แตะโค้ด)
1. สร้าง bot `Kanom` (Discord token) → จอง slot บน VPS ปัจจุบัน → ออก runtime.
2. config `roblox-robux-payout`:
   - `ROBLOX_GROUPS` = JSON 3 กลุ่ม `[{ "groupId": "...", "cookie": "...", "totp": "...", "name": "..." }, ...]` (secret เข้ารหัส AES-GCM ผ่าน config ปกติ).
   - `ROBUX_RATE`, `ROBUX_NOTIFY_CHANNEL`, ฯลฯ.
3. config `wallet-topup`: SlipOK key + ต่อ TrueMoney voucher service.

### Phase 2 — ETL (NEON → `shop`) — one-time script
- อ่าน NEON (read-only connection string) → เขียน Supabase `shop` (service_role).
- **Idempotent:** กันรันซ้ำด้วยคีย์ `(external_subject_id, member_discord_id, occurred_at, amount, method)` ของ ledger; member_wallets ใช้ upsert บน `(external_subject_id, member_discord_id)`.
- รัน **ตอน Kanom offline (freeze)** เพื่อไม่ให้ยอดขยับระหว่างย้าย.

### Phase 3 — Cutover
1. หยุด Kanom เดิม (process นอกระบบ).
2. รัน ETL (freeze).
3. start Kanom ในระบบเรา (orchestrator) — ชี้ DB ของเรา.
4. **Verify:** ยอดเงินตรง, ประวัติเติมโผล่, ลองจ่าย Robux จริง 1 ครั้ง.
5. ปลด NEON — เก็บ backup (dump) ไว้ก่อนอย่างน้อย 1 รอบบิล.

---

## 6. ความเสี่ยง / จุดที่ยอมรับแล้ว

1. **ไม่มีประวัติการจ่ายออก (redeem) ใน NEON schema ที่ได้มา** → ledger ฝั่ง DEBIT จะ
   เริ่มนับใหม่ในระบบเรา. **ยอดคงเหลือปัจจุบันยังถูกต้อง** เพราะดึงจาก `wallets.balance` ตรงๆ.
2. **`wallet_ledger.balance_after_satang` เป็น NOT NULL** แต่ NEON ไม่มีค่า running balance ของอดีต →
   แถวประวัติเก่าใส่ **running-sum ของยอดเติม** (ไม่ใช่ balance จริง เพราะไม่รวม redeem) + flag `migrated`.
   ทางเลือก: ใส่ opening-balance 1 แถว (type ADJUSTMENT = ยอดปัจจุบัน) แล้ว import topup history เป็นข้อมูลอ้างอิง.
3. **`truemoney_topup`** เป็นยอดสะสมแยกช่องทาง — รวมเข้า `total_topup_satang` (เราไม่แยกช่องทางใน wallet);
   ถ้าต้องการแยกสถิติ ค่อยเก็บใน ledger.note/reference.
4. **Freeze ระหว่าง ETL** สำคัญ — ถ้า Kanom ยังรับเติมระหว่างย้าย ยอดจะไม่ตรง.

---

## 7. สิ่งที่ต้องเตรียม (ฝั่งผู้ใช้)

- NEON **read-only connection string** (สำหรับ ETL).
- 3 กลุ่ม: `groupId`, `.ROBLOSECURITY cookie`, `2FA TOTP secret`, ชื่อกลุ่ม.
- Discord bot token ของ Kanom, channel ids ที่ใช้.
- SlipOK key + TrueMoney voucher config.

---

## 8. Scope ที่จะเขียนจริง (เมื่อเริ่ม execute)

- **ETL script** (one-time, idempotent) — อ่าน NEON, แปลงเงิน, upsert `shop`. ที่อยู่เสนอ: `scripts/` หรือ `services/billing-service` admin task.
- **ไม่มี migration** — schema `shop` + feature config มีครบ.
- การ config bot ทำผ่านหน้า/endpoint ที่มีอยู่ (bot create + config form).
