// src/features/wallet-topup/topup.js
// Top-up flow components (routed by bot.js). TrueMoney voucher path: the member pastes
// a gift link → we redeem it via our voucher-service → credit the shop wallet. PromptPay
// (QR + SlipOK) is a later stage. Config keys (injected as env): TRUEMONEY_BASE,
// API_TRUEMONEY_KEY_ID, TRUEMONEY_PHONE.

const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const thb = (satang) => `฿${(satang / 100).toLocaleString('th-TH')}`;
const GIFT_RE = /^https:\/\/gift\.truemoney\.com\/campaign\/\?v=/;

// Redeem a TrueMoney gift link through our voucher-service. Returns satang on success.
async function redeemVoucher(ctx, giftUrl) {
  const base = String(ctx.config.get('TRUEMONEY_BASE', '')).replace(/\/+$/, '');
  const key = ctx.config.get('API_TRUEMONEY_KEY_ID');
  const phone = ctx.config.get('TRUEMONEY_PHONE');
  if (!base || !key || !phone) return { ok: false, message: 'ร้านยังไม่ได้ตั้งค่า TrueMoney' };

  let res;
  try {
    res = await fetch(`${base}/v1/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({
        phone,
        gift_url: giftUrl,
        idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      }),
    });
  } catch (_e) {
    return { ok: false, message: 'เชื่อมต่อบริการ TrueMoney ไม่สำเร็จ' };
  }

  const data = await res.json().catch(() => ({}));
  if (res.ok && String(data.status).toUpperCase() === 'SUCCEEDED') {
    const amountBaht = Number(data.amount);
    if (!Number.isFinite(amountBaht) || amountBaht <= 0) {
      return { ok: false, message: 'จำนวนเงินจากซองไม่ถูกต้อง' };
    }
    return { ok: true, amountSatang: Math.round(amountBaht * 100) };
  }
  return { ok: false, message: data.failReason || data.message || 'ซองไม่ถูกต้องหรือถูกใช้ไปแล้ว' };
}

// topup_method select → open the matching input.
async function onTopupMethod(interaction, ctx) {
  const method = interaction.values?.[0];
  if (method === 'truemoney') {
    const modal = new ModalBuilder().setCustomId('kanom:topup:tmn:modal').setTitle('เติมเงินผ่านซองทรูมันนี่');
    const link = new TextInputBuilder()
      .setCustomId('gift').setLabel('ลิงก์ซองอั่งเปา').setStyle(TextInputStyle.Short).setRequired(true)
      .setPlaceholder('https://gift.truemoney.com/campaign/?v=...');
    modal.addComponents(new ActionRowBuilder().addComponents(link));
    await interaction.showModal(modal);
    return;
  }
  // promptpay (F2)
  await interaction.reply({ content: 'เติมผ่านพร้อมเพย์กำลังพัฒนา — ใช้ซองทรูมันนี่ไปก่อนได้', ephemeral: true });
}

// TrueMoney voucher modal → redeem → credit → topup_success / topup_failed.
async function onTmnModal(interaction, ctx) {
  const giftUrl = interaction.fields.getTextInputValue('gift').trim();
  if (!GIFT_RE.test(giftUrl)) {
    await interaction.reply({ content: 'กรุณากรอกลิงก์ซองอั่งเปาให้ถูกต้อง (ขึ้นต้น https://gift.truemoney.com/campaign/?v=)', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const result = await redeemVoucher(ctx, giftUrl);
  if (!result.ok) {
    const embed = await ctx.services.embeds.renderEmbed('topup_failed', { reason: result.message });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const balance = await ctx.services.wallet.credit(interaction.user.id, result.amountSatang, {
    type: 'TOPUP',
    note: 'truemoney voucher',
  });
  const embed = await ctx.services.embeds.renderEmbed('topup_success', {
    member: interaction.user.id,
    amount: thb(result.amountSatang),
    total_balance: thb(balance),
    method: 'ซองทรูมันนี่',
    datetime: new Date().toLocaleString('th-TH'),
  });
  await interaction.editReply({ embeds: [embed] });
}

module.exports = {
  components: {
    'kanom:topup:method': onTopupMethod,
    'kanom:topup:tmn:modal': onTmnModal,
  },
};
