# Kanom Interactive Flow — Stages

> สถานะ: **F1/F3/F4 เสร็จ, F5 กำลังทำ, F2 ยังไม่ทำ**
> central-bot interactive panel: เลือกกลุ่ม → ซื้อ Robux, เติมเงิน → QR/voucher → เครดิตกระเป๋า
> ที่: `services/central-bot/src/features/roblox-robux-payout/panel.js`, `src/bot.js`
>
> Handoff note (2026-06-10): ตอนนี้รัน/ทดสอบด้วย **บอทเทส** ไม่ใช่ Kanom production token.
> แต่ embed defaults + component appearance ให้ถือว่าเป็น **Kanom target config** เพื่อให้ cutover จาก VPS เดิม
> มาอยู่ใน platform แล้วหน้าร้านยังเหมือนเดิม.

## Component model
- ปุ่ม/เมนู **พฤติกรรมตายตัว** — `custom_id` คงที่ (ตาราง ID ใน panel.js), bot.js route ตาม prefix (longest-match).
- หน้าตา embed config ได้ (renderer); หน้าตาปุ่ม/เมนูอ่านจาก `embed_json.components`.
- แก้ได้เฉพาะ appearance: button `label/emoji/style`, select `placeholder/emoji`, link `label/emoji/url`.
- custom_id: `kanom:panel:group` (select), `kanom:panel:topup|buy|balance` (buttons), `kanom:topup:method` (select).

## Stages
| stage | งาน | สถานะ |
| --- | --- | --- |
| **F1** | routing component ใน bot.js + `/panel` (group select + 4 ปุ่ม) + เช็คยอด (จริง) + ลิงก์กลุ่ม | ✅ |
| **F2** | เติมเงิน PromptPay: topup_method→QR→นับถอยหลัง→อัปสลิป→SlipOK verify→credit→topup_success | ⬜ |
| **F3** | เติมเงิน TrueMoney voucher (modal→voucher-service→credit) | ✅ |
| **F4** | ซื้อ: group select→modal→debit→payout→redeem_success (flat rate) | ✅ |
| **F5** | frontend: editor ปุ่ม/เมนู (label/emoji/style/placeholder/url) + fields[] + seed default templates ของลูกค้า | 🟡 |

## หมายเหตุ F1/F5
- `btn_buy` ยังเป็น helper prompt ให้เลือกกลุ่มจาก dropdown; flow ซื้อจริงเริ่มจาก `group_select`.
- ต้องมี **บอทรันจริง** (Discord token) ถึงจะทดสอบได้ — onboard บอททดสอบหรือ Kanom ก่อน.
- ปุ่ม "เช็คยอด" ใช้ `ctx.services.wallet` (ต้องเปิด feature wallet-topup), "ลิงก์กลุ่ม" ใช้ config `GROUP_LINK`.
- reuse ของเดิม: PromptPay/SlipOK (backend PaymentService/TopupController), TrueMoney (voucher service), payout (roblox.js `makeOneTimePayout`).
- ถ้า AI ตัวอื่นทำต่อ ให้เริ่มจาก branch `feat/component-config` และอ่าน `docs/embed-designer.md` section
  "Component roles" ก่อนแก้ frontend/central-bot.
