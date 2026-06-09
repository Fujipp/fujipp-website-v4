# Kanom Interactive Flow — Stages

> สถานะ: **F1 เสร็จ (foundation), F2+ ยังไม่ทำ**
> central-bot interactive panel: เลือกกลุ่ม → ซื้อ Robux, เติมเงิน → QR/voucher → เครดิตกระเป๋า
> ที่: `services/central-bot/src/features/roblox-robux-payout/panel.js`, `src/bot.js`

## Component model
- ปุ่ม/เมนู **พฤติกรรมตายตัว** — `custom_id` คงที่ (ตาราง ID ใน panel.js), bot.js route ตาม prefix (longest-match).
- หน้าตา embed config ได้ (renderer); หน้าตาปุ่ม (label/emoji/style) จะ config ได้ใน F5.
- custom_id: `kanom:panel:group` (select), `kanom:panel:topup|buy|balance` (buttons), `kanom:topup:method` (select).

## Stages
| stage | งาน | สถานะ |
| --- | --- | --- |
| **F1** | routing component ใน bot.js + `/panel` (group select + 4 ปุ่ม) + เช็คยอด (จริง) + ลิงก์กลุ่ม | ✅ |
| **F2** | เติมเงิน PromptPay: topup_method→QR→นับถอยหลัง→อัปสลิป→SlipOK verify→credit→topup_success | ⬜ |
| **F3** | เติมเงิน TrueMoney voucher (ผ่าน service ของเรา) | ⬜ |
| **F4** | ซื้อ: group select→modal→debit→payout→redeem_success (flat rate) | ✅ |
| **F5** | frontend: editor ปุ่ม/เมนู (label/emoji/style) + fields[] + seed default templates ของลูกค้า | ⬜ |

## หมายเหตุ F1
- ปุ่ม topup/buy/group **ยังเป็น stub** (โชว์ embed ถัดไป/ข้อความ) — payment/payout มาใน F2/F4.
- ต้องมี **บอทรันจริง** (Discord token) ถึงจะทดสอบได้ — onboard บอททดสอบหรือ Kanom ก่อน.
- ปุ่ม "เช็คยอด" ใช้ `ctx.services.wallet` (ต้องเปิด feature wallet-topup), "ลิงก์กลุ่ม" ใช้ config `GROUP_LINK`.
- reuse ของเดิม: PromptPay/SlipOK (backend PaymentService/TopupController), TrueMoney (voucher service), payout (roblox.js `makeOneTimePayout`).
