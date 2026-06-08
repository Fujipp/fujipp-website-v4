# Feature Bot Platform — Design

> สถานะ: **ดราฟต์ดีไซน์ (ยังไม่เริ่ม implement)**
> ขอบเขต: ระบบขาย "Feature Bot" — ลูกค้าเติมเงิน → ซื้อ Runtime + Feature → ตั้งค่าเอง → กดรันบอท Discord 24/7
> เกี่ยวข้องกับ: `services/billing-service/`, `supabase/migrations/20260602194239_create_billing_service.sql`,
> และ snapshot บอทจริงที่ `Discord-Server-Management/Bots/`

---

## 1. ภาพรวม

เป้าหมายคือเปลี่ยนบอท Discord ที่เคยทำแยกกัน (`discord-bot-001..004`) ให้กลายเป็น
**"บอทกลาง" ตัวเดียวที่ตั้งค่าได้** แล้วขายเป็น SaaS: ลูกค้าจ่ายเงินเพื่อให้เราเปิดบอทออนไลน์ให้
24/7 โดยลูกค้า config ฟีเจอร์และหน้าตา embed ได้เอง

แกนกลางของดีไซน์: **1 บอท = 1 `subject`** (`external_subject_id`).
user 1 คนเป็นเจ้าของได้หลาย subject (หลายบอท).

```
user A ─┬─ bot #1 (subject)  ← runtime + features + config ของตัวเอง
        ├─ bot #2 (subject)
        └─ bot #3 (subject)
user B ─── bot #4 (subject)
```

ระบบมองทุกบอทเหมือนกันหมด ไม่ว่าจะเป็นของกี่คน — N subject = N โปรเซส แต่ละตัวมีรอบบิล/สิทธิ์/config ของตัวเอง

---

## 2. สิ่งที่มีอยู่แล้ว (อย่าทำซ้ำ)

`billing-service` รองรับฝั่งเงิน/สิทธิ์ไว้เกือบครบ:

| ความสามารถ | ไฟล์ |
| --- | --- |
| เติมเงิน (สลิป SlipOK, กันสลิปซ้ำ, idempotent) | `service/PaymentService.java` |
| ซื้อด้วยเครดิต (ตัดเงินครั้งเดียว/ทรานแซกชันเดียว, idempotent) | `service/OrderService.java` |
| ต่ออายุ + auto-renew (ใช้ซ้ำโดย automation) | `service/SubscriptionService.java` |
| Wallet ledger | `service/WalletService.java` |
| สคีมาทั้งหมด (schema `billing`, RLS, reference data) | migration `20260602194239` |

ตารางที่เป็นหัวใจของ config (มีอยู่แล้ว):

- `billing.feature_variable_templates` — สคีมาว่า feature นี้ต้องกรอกอะไร
- `billing.feature_config_values` — ค่าจริงที่ลูกค้ากรอก (คอมเมนต์ใน migration เรียกว่า *"bridge to the bot runtime"*)

---

## 3. Config 3 ชั้น

ระบบ config ไม่ใช่ชั้นเดียว — แยกเป็น 3 ชั้น:

```
ชั้น 1 — Bot / Subject config   ผูกกับ "บอทตัวนี้"
        Discord token, guild, prefix, ภาษา, timezone, embed theme เริ่มต้น
ชั้น 2 — Feature config          ผูกกับ feature ที่ซื้อ (โผล่เฉพาะที่ subscription active)
        เช่น top-spender → role ids, reset day
ชั้น 3 — Embed / Presentation    การออกแบบ embed ที่ feature นั้น render
        สี/หัวข้อ/รูป/ฟิลด์/ปุ่ม — ตกทอด theme จากชั้น 1, override รายตัวได้
```

### 3.1 ช่องว่างของสคีมาปัจจุบัน (ต้องเติม)

1. **ยังไม่มีบ้านของชั้น 1.** `feature_config_values.feature_id` เป็น `NOT NULL` →
   config ที่ไม่ผูก feature (token, theme) ไม่มีที่เก็บ. ต้องมี **subject registry** (ดู §4).
2. **`value_type` รองรับแค่ "ช่องกรอกเปล่า".** ต้องเพิ่มแนวคิด "เลือกจาก option vs ตั้งเอง":

   | คอลัมน์ที่จะเพิ่มใน `feature_variable_templates` | ความหมาย |
   | --- | --- |
   | `input_kind` = `FREE` / `SELECT` / `MULTI_SELECT` / `EMBED` | กรอกเอง / เลือก / เลือกหลายอัน / embed builder |
   | `options_json` | ตัวเลือกของ SELECT |
   | `allow_custom` (bool) | "เลือกจากที่ให้ **หรือ** พิมพ์เอง" |
   | `validation` | regex / min-max |

3. **`CHANNEL_ID` / `ROLE_ID` ไม่ควรให้พิมพ์ id มือเปล่า.** ฟอร์มต้อง render เป็น dropdown
   ดึง channel/role จริงจาก Discord (ดู §5 — ทำได้หลังบอทเข้า guild แล้วเท่านั้น).

### 3.2 Embed designer — ทำเป็นของกลาง

Embed เป็นสิ่งที่เกือบทุก feature ใช้ → อย่าทำ field แยกในแต่ละ feature:

- แต่ละ feature **ประกาศ "embed slots"** ที่มันจะ render (เช่น `top-spender` มี slot `leaderboard_embed`)
- เก็บค่า embed เป็น **JSON structured** (color, title, description, thumbnail, image, footer, fields[], buttons[])
- Frontend มี **visual embed builder ตัวเดียว** ใช้ซ้ำทุก slot + พรีวิวแบบหน้าตา Discord จริง
- บาง slot ล็อกโครง (แก้แค่สี/ข้อความ) บาง slot เปิดให้จัดเต็ม — คุมด้วย flag ในตัว slot

---

## 4. ชิ้นส่วนที่ยังขาด

| # | ชิ้นส่วน | ความยาก | หมายเหตุ |
| --- | --- | --- | --- |
| 1 | **Refactor บอท → บอทกลาง 1 ตัว** | 🔴 ยากสุด | ดึงค่าฮาร์ดโค้ดออกจาก `config.json`/JSON → มาจาก env/config ทั้งหมด; เปิด/ปิด feature ด้วย flag (ใช้ `bot-features.json` เป็นสคีมา) |
| 2 | **Subject registry** (ตารางทะเบียนบอท) | 🟡 กลาง | เก็บ token (เข้ารหัส), client_id, guild_id, เจ้าของ, สถานะ. FK `user_id` แบบ many-to-one (1 user → N subject) |
| 3 | **Bot Runtime Orchestrator** (service ใหม่) | 🟢 ง่าย | Node service บางๆ ห่อ PM2; คู่กับ `billing-service` บน VPS เดียวกัน |
| 4 | **ต่อท่อ backend → billing/orchestrator → หน้า shop** | 🟡 กลาง | เปิด endpoint, ฟอร์ม config (gen จาก templates), ปุ่ม Start/Stop |

### 4.1 Runtime model: **PM2 process ต่อบอท** (v1)

เหตุผล: ลูกค้าให้แค่ config + token **ไม่ได้ส่งโค้ด** → จุดแข็งของ Docker (sandbox โค้ดแปลกปลอม)
แทบไม่ได้ใช้. PM2-ต่อโปรเซส ให้ crash isolation + orchestrator ที่ง่ายสุด.

ออกแบบ orchestrator ให้มี interface กลาง สลับ runner ได้ภายหลังโดยไม่แตะ billing:

```
interface BotRunner {
  start(subjectId, env)   // env = token + config_values + active feature flags
  stop(subjectId)
  restart(subjectId)
  status(subjectId)       // running / stopped / crashed
}
v1: Pm2Runner   →   อนาคต: DockerRunner (ตอนสเกล / ถ้าให้ลูกค้าใส่โค้ดเอง)
```

หน้าตา service:

```
services/bot-runtime-service/   (คู่กับ billing-service)
  POST /bots/:subjectId/start    → ประกอบ env → pm2 start central-bot --name bot-<subjectId>
  POST /bots/:subjectId/stop     → pm2 stop / delete
  GET  /bots/:subjectId/status   → pm2 describe
  GET  /guilds/:guildId/channels → ให้ฟอร์มดึง dropdown channel/role
```

---

## 5. End-to-end flow

```
1. เติมเงิน (สลิป)        → PaymentService.confirmPaid → Wallet มีเครดิต
2. สร้างบอท (กรอก token)  → subject ใหม่ใน subject registry
3. invite บอทเข้า server  → (ตอนนี้ถึงจะดึง channel/role จริงได้)
4. ซื้อ Runtime + Feature → OrderService.purchase → ตัดเครดิต, ออกสิทธิ์ผูก subject
5. กรอก config ชั้น 2/3   → feature_config_values + embed JSON
6. กด "เริ่มรัน"          → orchestrator: pm2 start ด้วย token+config+feature flags
7. หมดอายุ/ไม่ต่อ         → automation (runtime_suspend_enabled) → orchestrator: stop
```

> **ลำดับมีเงื่อนไข:** เลือก channel/role ได้ **หลัง** บอทเข้า server แล้วเท่านั้น
> ฟอร์มต้องจัดการสถานะ "ยังไม่ invite → แสดงปุ่มเชิญก่อน".

---

## 6. นโยบายราคา/สิทธิ์ (อัปเดต 2026-06-08 — กลับด้านจากเดิม)

```
FEATURE (ถาวร, scope=BOT)  ผูกบอทตัวเดียว → ซื้อถาวรต่อบอท, ซื้อซ้ำได้ (คนละบอท)
                           ราคา: Roblox 490 · wallet-topup 290
RUNTIME (per subject)      ผูกบอทเสมอ     → ซื้อเติมเรื่อยๆ ทุกบอทจ่าย runtime ของตัวเอง
```

**โมเดลปัจจุบัน:** ขาย feature **แบบถาวรอย่างเดียว ต่อบอท** (เลิกเช่ารายเดือน RENT_MONTHLY).
1 feature = 1 บอท → มี 3 บอทอยากได้ครบ = ซื้อ 3 ครั้ง. Runtime เป็นตัวที่เก็บเงินต่อเนื่อง.

> เดิมเคยตั้งว่า "ถาวร = ได้ทุกบอท (scope=ACCOUNT)" แล้ว**กลับด้าน**เป็น per-bot เพราะเข้ากับ
> โมเดล 1 feature/1 บอทมากกว่า. `OrderService.createPermanentRental()` แก้เป็น
> `scope=BOT, external_subject_id=<bot>` แล้ว (migration `20260608100000` ปิด monthly + ปรับราคา).
> ตอนซื้อ feature **ไม่ต้อง**มี runtime active ก่อน (ตัดเงื่อนไขออก) — feature จะรันเมื่อบอทมี runtime.

ข้อจำกัดโลกจริง: "1 คนหลายบอท" = ลูกค้าต้องสร้าง Discord application หลายตัวเอง
(แต่ละบอทต้องมี token ของตัวเอง) — ฟอร์มสร้างบอทต้องอธิบายจุดนี้.

---

## 7. Scope v1 ที่เล็กที่สุดที่ "ใช้ได้จริง"

อย่าทำครบทุก feature ก่อน — ปิด loop เดียวให้เดินได้ก่อน:

1. บอทกลางรองรับ **1 feature** (เช่น `wallet-history`) แต่ทำ flow ครบ
2. subject registry (เก็บ token เข้ารหัส + สถานะ)
3. orchestrator: start / stop / status (PM2)
4. ฟอร์ม config ชั้น 2 แบบ key-value (ยังไม่ต้องมี embed builder)
5. ปุ่ม Start/Stop ในหน้า shop ต่อจริง

ได้ครบ loop "เติมเงิน → ซื้อ → กรอก → กดรัน → บอทออนไลน์" กับ feature เดียว
จากนั้นที่เหลือ (feature เพิ่ม / embed builder / Discord dropdown) คือ "เติมของลงโครงเดิม".

---

## 8. ความคืบหน้า + งานที่ยังเปิดอยู่

### ตัดสินใจ/ทำไปแล้ว
- **central-bot อยู่ที่** `services/central-bot/` (ยังไม่เริ่มเขียนโค้ด)
- **feature = ถาวรต่อบอท** (scope=BOT, ขายถาวรอย่างเดียว · เลิกเช่ารายเดือน · ซื้อซ้ำได้คนละบอท)
- **เข้ารหัส secret = app-level AES-256-GCM** (key จาก env `BOT_SECRET_KEY`, เก็บ ciphertext ลง DB)
- **Roblox + wallet-topup feature** นิยาม + ตั้งราคาแล้ว
  (`migrations/20260605170000`, `20260605170500`)
- **subject registry** สร้างแล้ว: schema `bots` + ตาราง `bot_instances`
  (`migrations/20260605171000`) — เก็บ token เป็น ciphertext
- **central-bot** scaffold แล้วที่ `services/central-bot/` — feature-module + flag,
  ฟีเจอร์ Roblox ตัวแรก (`/robux-check`, `/robux-balance`, `/robux-payout`)
- **orchestrator** scaffold แล้วที่ `services/bot-runtime-service/` — อ่าน DB ตรง
  (pg + service_role), ถอดรหัส AES-GCM, ประกอบ env, รันผ่าน PM2 (BotRunner สลับได้)
  slash command ลงทะเบียนตอน ClientReady ต่อ guild อัตโนมัติแล้ว

- **frontend config form** scaffold แล้ว: ฟอร์ม dynamic gen จาก template
  (`features/shop/components/ConfigField.vue` + `FeatureConfigForm.vue`,
  view `BotConfigView.vue` route `/shop/bots/:botId/config`). มี SAMPLE fallback
  ให้เดโมได้ก่อน backend มา. รองรับ 9 widget ตาม value_type

- **frontend Package (ซื้อ)** scaffold แล้ว: `ShopPackageView.vue` + `PackageCard.vue`
  + `PurchaseDialog.vue` (เลือกบอท + เช็คเครดิต) route `/shop/package`, SAMPLE fallback,
  wire ไป `/api/catalog/*` + `/api/orders`

- **backend API (Java) เชื่อมแล้วบางส่วน:**
  - ✅ `/api/catalog/features`, `/api/catalog/runtime-plans`, `/api/orders` — proxy ไป billing (passthrough JSON)
  - ✅ `/api/bots` (list/create) — Bot registry (`BotInstance` entity + `SecretCipher` AES-GCM ตรงกับ orchestrator)
  - ✅ `/api/bots/:id/config` (GET/PUT) — proxy ไป billing `BotConfigController` (เช็ค ownership ก่อน)
    billing อ่าน templates+values+subscriptions ต่อ subject, เข้ารหัส secret ด้วย `SecretCipher` เดียวกัน
  - ✅ `/api/bots/:id/start|stop|restart|status` — proxy ไป orchestrator ผ่าน `RuntimeClient` (เช็ค ownership)
    → **ครบ loop: เติมเงิน → ซื้อ → กรอก config → กดรัน → บอทออนไลน์**

  - ✅ **priceId** ใน billing `FeaturePriceResponse` (ซื้อ SKU ได้จริง)
  - ✅ **shop wallet (ชั้น B)** schema `shop` + central-bot `wallet-topup` module
    (`/wallet`, `/wallet-add`) + Roblox `/robux-redeem` หักกระเป๋า→จ่าย→คืนเงินถ้าพลาด
    (cross-module ผ่าน `ctx.services.wallet`)

### ✅ verify แล้ว (รอบ integrate)
- backend + billing **compile ผ่าน** (BUILD SUCCESS ทั้งคู่)
- **AES cross-language** Java encrypt → Node decrypt ตรงกัน
- central-bot: 2 features โหลด, 6 commands, wallet service wired

### ยังเปิดอยู่ (polish / ops)
- **frontend wiring** — ปุ่ม Start/Stop ใน BotCard ต่อ `/api/bots/:id/start|stop`, หน้า Create Bot, Discord dropdown (ฝั่งคุณ)
- **SlipOK/TrueMoney อัตโนมัติ** ใน wallet-topup — ตอนนี้เติมผ่าน `/wallet-add` (admin) ก่อน
- **ops:** push migrations, ตั้ง `BOT_SECRET_KEY` ค่าเดียว 3 service, ตั้ง `DATABASE_URL` ให้ orchestrator ส่งต่อบอท
- **backend gap:** `FeaturePriceResponse` ยังไม่ส่ง `priceId` (UUID) — frontend ต้องใช้ตอนซื้อ (task flagged)
- **deploy dependency:** backend ใช้ `ddl-auto=validate` → ต้อง apply migration `bots` schema ก่อน backend จะ start ได้
- **frontend ที่เหลือ** — หน้า Create Bot, ปุ่ม Start/Stop ต่อจริง, Discord channel/role dropdown
- **runtime verify จริง** — ต้อง npm install + Discord token จริง + DB ที่ push migration แล้ว
- **shop-wallet coupling** — `/robux-payout` ยังไม่หักกระเป๋าร้าน (รอ feature wallet-topup)
- feature dependency (Roblox ต้องเปิด wallet-topup) — ยังไม่มีตารางบังคับ ตอนนี้บอกใน description
