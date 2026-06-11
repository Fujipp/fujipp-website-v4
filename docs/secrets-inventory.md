# Secrets & Env Inventory

แผนที่ env/secret ของทุกชั้น — เปิดดูทีเดียวจบ ไม่ต้องไล่ทุกไฟล์

> ⚠️ **ไฟล์นี้ห้ามใส่ค่าจริง** — เป็นแค่รายการ key + คำอธิบาย ค่าจริงอยู่ในไฟล์ `.env`
> ที่ระบุไว้ (ทุกตัว gitignored) หรือใน GitHub Secrets สำหรับ prod
>
> 🔑 = ค่าลับจริง (ห้ามหลุด) · ⚙️ = config ธรรมดา (ไม่ลับ)

---

## ⭐ ต้อง "ตรงกันทุกที่" (เช็กด้วย `scripts/check-secrets.sh`)

ถ้า 3 กลุ่มนี้ไม่ตรงกันระหว่างไฟล์ → ระบบพัง (auth ระหว่าง service ล้มเหลว)

| ค่า | ต้องเท่ากันใน |
| --- | --- |
| `BOT_SECRET_KEY` (AES key ถอด token บอท) | backend · bot-runtime-service · billing-service · GitHub `BOT_SECRET_KEY` |
| backend `RUNTIME_SERVICE_TOKEN` = runtime `SERVICE_TOKEN` | backend · bot-runtime-service · GitHub `RUNTIME_SERVICE_TOKEN` |
| `BILLING_SERVICE_TOKEN` · `VOUCHER_SERVICE_TOKEN` | backend ↔ billing · (voucher ↔ ผู้เรียก) · GitHub secrets |

---

## 1. Frontend — `frontend/.env`

ไม่มี secret ลับเลย (anon key เป็น publishable key ที่ติดไปกับ JS อยู่แล้ว)

| Key | | ใช้ทำอะไร |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | ⚙️ | URL โปรเจกต์ Supabase |
| `VITE_SUPABASE_ANON_KEY` | ⚙️ | anon/publishable key |
| `VITE_API_TARGET` | ⚙️ | toggle backend: `local` \| `host` |
| `VITE_API_LOCAL_URL` | ⚙️ | backend local (`http://localhost:8080`) |
| `VITE_API_HOST_URL` | ⚙️ | backend prod (`https://api.fujipp.com`) |
| `VITE_API_BASE_URL` | ⚙️ | hard override (CI/prod ใส่ตอน build) |

> `frontend/.env.local` (ถ้ามี) จะ override `.env` — ใช้ตอนต่อ Supabase/backend แบบ local เต็ม

---

## 2. Backend — `backend/.env`  · port 8080

| Key | | ใช้ทำอะไร |
| --- | --- | --- |
| `DB_URL` | ⚙️ | JDBC ต่อ Supabase (pooler 6543) |
| `DB_USERNAME` | ⚙️ | user ของ database |
| `DB_PASSWORD` | 🔑 | รหัส database |
| `SUPABASE_URL` | ⚙️ | base URL Supabase |
| `SUPABASE_JWT_SECRET` | 🔑 | ตรวจ JWT ของ user ที่ login |
| `CORS_ALLOWED_ORIGINS` | ⚙️ | origin ที่อนุญาต (prod = เว็บจริง) |
| `CORS_ALLOWED_ORIGIN_PATTERNS` | ⚙️ | pattern origin (`http://localhost:*` สำหรับ dev) |
| `BILLING_BASE_URL` | ⚙️ | URL billing-service (`http://localhost:8081`) |
| `BILLING_SERVICE_TOKEN` | 🔑 | token คุย billing — **ต้อง = billing-service** |
| `SLIPOK_BASE_URL` | ⚙️ | endpoint SlipOK |
| `SLIPOK_BRANCH_ID` | ⚙️ | branch id SlipOK |
| `SLIPOK_API_KEY` | 🔑 | API key เช็คสลิป |
| `PROMPTPAY_ID` | ⚙️ | เลขรับเงินพร้อมเพย์ของร้าน |
| `BOT_SECRET_KEY` | 🔑 | **AES key — ต้อง = runtime + billing** |
| `RUNTIME_BASE_URL` | ⚙️ | URL orchestrator (`http://localhost:8090`) |
| `RUNTIME_SERVICE_TOKEN` | 🔑 | token คุย runtime — **ต้อง = runtime `SERVICE_TOKEN`** |

---

## 3. bot-runtime-service (orchestrator) — `services/bot-runtime-service/.env`  · port 8090

| Key | | ใช้ทำอะไร |
| --- | --- | --- |
| `PORT` | ⚙️ | พอร์ต orchestrator (8090) |
| `DATABASE_URL` | 🔑 | ต่อ Supabase (รหัสฝังใน URL) — ส่งต่อให้บอทเป็น shop-wallet DB |
| `DB_SSL_NO_VERIFY` | ⚙️ | `true` เมื่อต่อ Supabase managed |
| `BOT_SECRET_KEY` | 🔑 | **ต้อง = backend** |
| `CENTRAL_BOT_ENTRY` | ⚙️ | path entrypoint central-bot ที่ spawn |
| `SERVICE_TOKEN` | 🔑 | **ต้อง = backend `RUNTIME_SERVICE_TOKEN`** |

---

## 4. billing-service — `services/billing-service/.env`  · port 8081

| Key | | ใช้ทำอะไร |
| --- | --- | --- |
| `DB_URL` / `DB_USERNAME` | ⚙️ | ต่อ Supabase |
| `DB_PASSWORD` | 🔑 | รหัส database |
| `BILLING_SERVER_PORT` | ⚙️ | พอร์ต (8081) |
| `BILLING_SERVICE_TOKEN` | 🔑 | **ต้อง = backend** |
| `BOT_SECRET_KEY` | 🔑 | **ต้อง = backend** |

---

## 5. voucher-service — `services/voucher-service/.env`  · port 8082 (prod publish 3611)

> ⚠️ ยังไม่มี `.env` จริงในเครื่อง — คัดลอกจาก `.env.example` แล้วกรอกก่อนรัน local

| Key | | ใช้ทำอะไร |
| --- | --- | --- |
| `DB_URL` / `DB_USERNAME` | ⚙️ | ต่อ Supabase |
| `DB_PASSWORD` | 🔑 | รหัส database |
| `VOUCHER_SERVER_PORT` | ⚙️ | พอร์ต (8082) |
| `VOUCHER_SERVICE_TOKEN` | 🔑 | x-api-key ที่ผู้เรียกต้องส่งมา |
| `TW_USER_AGENT` | ⚙️ | UA เรียก TrueMoney |
| `TW_TIMEOUT_MS` | ⚙️ | timeout เรียก TrueMoney |

---

## 6. central-bot — ❗ ไม่มีไฟล์ `.env` ให้จด

ตัวนี้ **ไม่อ่านจากไฟล์** — orchestrator ฉีด env ให้ตอนรัน โดยดึงจาก **Supabase (เข้ารหัสไว้)
ราย "บอท (subject)"** ค่าพวกนี้กรอกผ่านหน้า Bot Config บนเว็บ:

`DISCORD_TOKEN` · `DISCORD_APPLICATION_ID` · `DISCORD_GUILD_ID` · `AUTHORIZED_USER_IDS` ·
`ENABLED_FEATURES` · `ROBLOX_GROUP_ID_x` · `ROBLOX_SECURITY_COOKIE_x` 🔑 ·
`ROBLOX_TOTP_SECRET_x` 🔑 · `ROBLOX_GROUP_NAME_x` · `ROBUX_RATE` · `ROBUX_ENABLED` ·
`ROBUX_PAYOUT_COOLDOWN` · `ROBUX_NOTIFY_CHANNEL` · `PAYMENT_COUNTDOWN_*`

→ จดจากหน้าเว็บ / ตาราง config ใน Supabase ไม่ใช่จากไฟล์

---

## 7. 🔐 ค่าจริงของ prod = GitHub Actions Secrets

prod ไม่อ่าน `.env` ในเครื่อง — แหล่งจริงคือ GitHub repo secrets:

| Secret | ใช้ทำอะไร |
| --- | --- |
| `BACKEND_ENV_FILE` | blob รวม env ของ backend ทั้งหมด (DB, Supabase, SlipOK, ...) |
| `FRONTEND_ENV_FILE` | env ตอน build frontend (VITE_*) |
| `BOT_SECRET_KEY` | ต่อท้าย .env บน VPS (= ทุก service) |
| `RUNTIME_SERVICE_TOKEN` | ต่อท้าย .env บน VPS |
| `VOUCHER_SERVICE_TOKEN` | token voucher + ตั้งให้ legacy PM2 bot |
| `TRUEMONEY_MASTER_KEY` | master key ระบบ voucher |
| `SHOP_DATABASE_URL` | (optional) override DATABASE_URL → Supabase transaction pooler |
| `FTP_HOST/PORT/USER/PASSWORD/REMOTE_DIR` | deploy frontend ขึ้น DirectAdmin |
| `VPS_SSH_HOST/PORT/USER/KEY` | SSH เข้า VPS ตอน deploy backend |

> GitHub secrets **อ่านกลับไม่ได้ (write-only)** — แก้ = set ทับใหม่เท่านั้น
> ดูวิธีต่อ pooler โดยไม่แตะ blob เดิมที่ `services/bot-runtime-service/.env.example`
