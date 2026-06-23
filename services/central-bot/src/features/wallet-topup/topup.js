// src/features/wallet-topup/topup.js
// Top-up flow components (routed by bot.js).
// - TrueMoney voucher: paste a gift link → redeem via our voucher-service → credit.
// - PromptPay: enter an amount → QR embed (promptpay.io) with a countdown → member
//   pays and posts the slip in SLIP_CHECK_CHANNEL where slip.js verifies it.
// Config keys (injected as env): TRUEMONEY_BASE, API_TRUEMONEY_KEY_ID, TRUEMONEY_PHONE,
// PROMPTPAY_NUMBER, PROMPTPAY_ACCOUNT_NAME, MIN_TOPUP, TOPUP_QR_TIMEOUT, SLIP_CHECK_CHANNEL,
// SLIP_ACCESS_ROLE_ID.

const {
  ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { grantTopupRole } = require('./topup-role');
const { parseEmoji, buttonStyle } = require('../../lib/components');

const thb = (satang) => `฿${(satang / 100).toLocaleString('th-TH')}`;
const GIFT_RE = /^https:\/\/gift\.truemoney\.com\/campaign\/\?v=/;

// QR countdown: edit the message once a second so "X นาที YY วินาที" ticks down.
const COUNTDOWN_TICK_MS = 1000;
const fmtCountdown = (secLeft) =>
  `${Math.floor(secLeft / 60)} นาที ${String(secLeft % 60).padStart(2, '0')} วินาที`;

// Give the member a temporary "slip access" role so they can see SLIP_CHECK_CHANNEL
// while paying, then strip it when the QR window (TOPUP_QR_TIMEOUT) closes. No-op when
// SLIP_ACCESS_ROLE_ID is unset. Best-effort — never blocks the top-up flow.
async function grantTempSlipRole(interaction, ctx, minutes) {
  const roleId = ctx.config.get('SLIP_ACCESS_ROLE_ID');
  if (!roleId || !interaction.guild) return;
  try {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const role = await interaction.guild.roles.fetch(String(roleId)).catch(() => null);
    if (!member || !role) return;
    if (!member.roles.cache.has(role.id)) await member.roles.add(role);
    setTimeout(() => { member.roles.remove(role).catch(() => {}); }, Math.max(1, minutes) * 60 * 1000);
  } catch (err) {
    console.error('[central-bot] slip access role grant failed:', err.message);
  }
}


// Redeem a TrueMoney gift link through our voucher-service. Returns satang on success.
async function redeemVoucher(ctx, giftUrl) {
  const base = String(ctx.config.get('TRUEMONEY_BASE', '')).replace(/\/+$/, '');
  const key = ctx.config.get('API_TRUEMONEY_KEY_ID');
  const phone = ctx.config.get('TRUEMONEY_PHONE');
  if (!base || !key || !phone) return { ok: false, message: 'ร้านยังไม่ได้ตั้งค่า TrueMoney' };

  // Identify this shop to the voucher-service. When that service is locked to an
  // allowlist (VOUCHER_ALLOWED_CLIENT_IDS), only known subject ids are allowed to redeem.
  const headers = { 'Content-Type': 'application/json', 'x-api-key': key };
  const clientId = ctx.config.subjectId;
  if (clientId) headers['X-Client-Id'] = String(clientId);

  let res;
  try {
    res = await fetch(`${base}/v1/redeem`, {
      method: 'POST',
      headers,
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
  // Method comes from a button custom_id (kanom:topup:btn:<method>) — buttons re-fire
  // every click, unlike a select which sticks on the chosen value. (.values kept as a
  // fallback for any legacy select interaction.)
  const method = interaction.values?.[0] ?? interaction.customId.split(':').pop();
  if (method === 'truemoney') {
    const modal = new ModalBuilder().setCustomId('kanom:topup:tmn:modal').setTitle('เติมเงินผ่านซองทรูมันนี่');
    const link = new TextInputBuilder()
      .setCustomId('gift').setLabel('ลิงก์ซองอั่งเปา').setStyle(TextInputStyle.Short).setRequired(true)
      .setPlaceholder('https://gift.truemoney.com/campaign/?v=...');
    modal.addComponents(new ActionRowBuilder().addComponents(link));
    await interaction.showModal(modal);
    return;
  }

  // promptpay — QR scan + slip verification
  const phone = String(ctx.config.get('PROMPTPAY_NUMBER', '')).replace(/\D/g, '');
  if (phone.length !== 10 && phone.length !== 13) {
    await interaction.reply({ content: 'ร้านยังไม่ได้ตั้งค่าพร้อมเพย์ (PROMPTPAY_NUMBER)', ephemeral: true });
    return;
  }
  const min = ctx.config.number('MIN_TOPUP', 20);
  const modal = new ModalBuilder().setCustomId('kanom:topup:pp:modal').setTitle('เติมเงินผ่านพร้อมเพย์');
  const amount = new TextInputBuilder()
    .setCustomId('amount').setLabel('จำนวนเงินที่ต้องการเติม (บาท)')
    .setStyle(TextInputStyle.Short).setRequired(true)
    .setPlaceholder(`ขั้นต่ำ ${min} บาท`);
  modal.addComponents(new ActionRowBuilder().addComponents(amount));
  await interaction.showModal(modal);
}

// PromptPay amount modal → QR embed with live countdown → timeout embed.
async function onPpModal(interaction, ctx) {
  const min = ctx.config.number('MIN_TOPUP', 20);
  const amount = Number(interaction.fields.getTextInputValue('amount').trim());
  if (!Number.isFinite(amount) || amount <= 0) {
    await interaction.reply({ content: 'กรุณาระบุจำนวนเงินมากกว่า 0', ephemeral: true });
    return;
  }
  if (amount < min) {
    await interaction.reply({ content: `ยอดเติมขั้นต่ำ ${min} บาท`, ephemeral: true });
    return;
  }

  const phone = String(ctx.config.get('PROMPTPAY_NUMBER', '')).replace(/\D/g, '');
  await interaction.deferReply({ ephemeral: true });

  // promptpay.io renders the EMV PromptPay QR for us — no extra dependency.
  const qrImage = `https://promptpay.io/${phone}/${amount.toFixed(2)}.png`;
  const minutes = Math.max(1, ctx.config.number('TOPUP_QR_TIMEOUT', 5));
  const targetTs = Math.floor(Date.now() / 1000) + minutes * 60;

  const renderQr = (secLeft) =>
    ctx.services.embeds.renderEmbed('topup_qr', {
      amount: `${amount.toFixed(2)} THB`,
      account_name: ctx.config.get('PROMPTPAY_ACCOUNT_NAME', '-'),
      countdown: fmtCountdown(secLeft),
      qr_image: qrImage,
    });

  // Link to the slip channel so the member knows where to post the slip.
  const components = [];
  const slipChannelId = ctx.config.get('SLIP_CHECK_CHANNEL');
  if (slipChannelId && interaction.guildId) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setURL(`https://discord.com/channels/${interaction.guildId}/${slipChannelId}`)
        .setLabel('โอนแล้วแนบสลิปที่นี่')
        .setStyle(ButtonStyle.Link),
    ));
  }

  await interaction.editReply({ embeds: [await renderQr(minutes * 60)], components });

  // Temp role so the member can see the slip channel; auto-removed after the QR window.
  await grantTempSlipRole(interaction, ctx, minutes);

  const tick = setInterval(async () => {
    const left = Math.max(0, targetTs - Math.floor(Date.now() / 1000));
    try {
      if (left <= 0) {
        clearInterval(tick);
        const timeout = await ctx.services.embeds.renderEmbed('topup_timeout');
        await interaction.editReply({ embeds: [timeout], components: [] }).catch(() => {});
        return;
      }
      await interaction.editReply({ embeds: [await renderQr(left)] }).catch(() => {});
    } catch (err) {
      clearInterval(tick);
      console.error('[central-bot] promptpay countdown error:', err.message);
    }
  }, COUNTDOWN_TICK_MS);
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

  // Apply the configurable TrueMoney fee: percent of the voucher + a flat baht amount
  // (both default 0 = no fee; they stack). Credit the net; never below zero.
  const gross = result.amountSatang;
  const feePercent = ctx.config.number('TRUEMONEY_FEE', 0) || 0;
  const feeFlatSatang = Math.round((ctx.config.number('TRUEMONEY_FEE_FLAT', 0) || 0) * 100);
  const feeSatang = Math.min(gross, Math.max(0, Math.round((gross * feePercent) / 100) + feeFlatSatang));
  const creditSatang = gross - feeSatang;
  if (creditSatang <= 0) {
    const embed = await ctx.services.embeds.renderEmbed('topup_failed', {
      reason: 'ค่าธรรมเนียมมากกว่าหรือเท่ากับยอดซอง — ไม่สามารถเติมได้',
    });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const balance = await ctx.services.wallet.credit(interaction.user.id, creditSatang, {
    type: 'TOPUP',
    note: 'truemoney voucher',
  });
  const embed = await ctx.services.embeds.renderEmbed('topup_success', {
    member: interaction.user.id,
    amount: thb(creditSatang),
    total_balance: thb(balance),
    method: 'ซองทรูมันนี่',
    datetime: new Date().toLocaleString('th-TH'),
    fee: thb(feeSatang),
    gross: thb(gross),
  });
  await interaction.editReply({ embeds: [embed] });

  // Post the same success embed publicly, like a SlipOK top-up does (slip.js).
  const channelId = ctx.config.get('TOPUP_NOTIFY_CHANNEL');
  if (channelId && interaction.guild) {
    const channel = interaction.guild.channels.cache.get(String(channelId))
      || (await interaction.guild.channels.fetch(String(channelId)).catch(() => null));
    if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => {});
  }

  // Grant the configured top-up role (no-op if unset).
  await grantTopupRole(ctx, interaction.guild, interaction.user.id);

  // Refresh rank roles off the new lifetime total (no-op if top-spender-rank is off).
  ctx.services.rankSync?.(interaction.guild)?.catch(() => {});
}

// Build the top-up method picker (PromptPay / TrueMoney buttons) on the topup_method
// embed. Buttons keep fixed styles (only label/emoji are configurable, like the
// Roblox panel's เติมเงิน flow) and reuse the existing kanom:topup:btn: handlers.
async function buildTopupMethod(ctx) {
  const cfg = await ctx.services.embeds.getConfig('topup_method');
  const roles = (cfg && cfg.components) || {};
  const embed = await ctx.services.embeds.renderEmbed('topup_method');
  const mkButton = (id, label, style, fallbackEmoji, roleKey) => {
    const role = roles[roleKey] || {};
    const btn = new ButtonBuilder()
      .setCustomId(id)
      .setLabel(String(role.label || label).slice(0, 80))
      .setStyle(style);
    const emoji = parseEmoji(role.emoji) || fallbackEmoji;
    if (emoji) { try { btn.setEmoji(emoji); } catch (_e) { /* skip invalid emoji */ } }
    return btn;
  };
  const row = new ActionRowBuilder().addComponents(
    mkButton('kanom:topup:btn:promptpay', 'พร้อมเพย์ธนาคาร', ButtonStyle.Primary, '🏧', 'btn_promptpay'),
    mkButton('kanom:topup:btn:truemoney', 'ซองอั่งเปาทรูมันนี่', ButtonStyle.Success, '🧧', 'btn_truemoney'),
  );
  return { embeds: [embed], components: [row] };
}

// Build the standalone top-up panel (topup_panel embed + a "เติมเงิน" button). Posted
// by /topup-panel so members can top up WITHOUT the Roblox Robux Payout feature.
async function buildTopupPanel(ctx) {
  const cfg = await ctx.services.embeds.getConfig('topup_panel');
  const role = ((cfg && cfg.components) || {}).btn_topup || {};
  const embed = await ctx.services.embeds.renderEmbed('topup_panel');
  const btn = new ButtonBuilder()
    .setCustomId('kanom:topup:open')
    .setLabel(String(role.label || 'เติมเงิน').slice(0, 80))
    .setStyle(buttonStyle(role.style, ButtonStyle.Primary));
  const emoji = parseEmoji(role.emoji) || '💰';
  if (emoji) { try { btn.setEmoji(emoji); } catch (_e) { /* skip invalid emoji */ } }
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] };
}

// Member clicked เติมเงิน on the standalone panel → show the method picker (ephemeral).
async function onOpenTopup(interaction, ctx) {
  await interaction.reply({ ...(await buildTopupMethod(ctx)), ephemeral: true });
}

module.exports = {
  buildTopupMethod,
  buildTopupPanel,
  components: {
    'kanom:topup:open': onOpenTopup,
    'kanom:topup:btn:': onTopupMethod,
    'kanom:topup:tmn:modal': onTmnModal,
    'kanom:topup:pp:modal': onPpModal,
  },
};
