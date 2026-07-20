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
  ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const { grantTopupRole } = require('./topup-role');
const { parseEmoji, buttonStyle } = require('../../lib/components');
const { query } = require('../../lib/db');

const thb = (satang) => `฿${(satang / 100).toLocaleString('th-TH')}`;
const GIFT_RE = /^https:\/\/gift\.truemoney\.com\/campaign\/\?v=/;
const VOUCHER_REQUEST_TIMEOUT_MS = 15_000;
const COMPONENTS_V2_MODE = 'COMPONENTS_V2';

// QR countdown: edit the message once a second so "X นาที YY วินาที" ticks down.
const COUNTDOWN_TICK_MS = 1000;
const fmtCountdown = (secLeft) =>
  `${Math.floor(secLeft / 60)} นาที ${String(secLeft % 60).padStart(2, '0')} วินาที`;

function usesComponentsV2(ctx) {
  return String(ctx.config.get('TOPUP_DISPLAY_MODE', 'EMBED')).toUpperCase() === COMPONENTS_V2_MODE;
}

function text(content) {
  return { type: 10, content: String(content) };
}

function separator(divider = true, spacing = 2) {
  return { type: 14, divider, spacing };
}

function actionRow(...buttons) {
  return {
    type: 1,
    components: buttons.map((button) => (typeof button.toJSON === 'function' ? button.toJSON() : button)),
  };
}

function container(components, options = {}) {
  return { type: 17, components, ...options };
}

function mediaGallery(url) {
  return { type: 12, items: [{ media: { url } }] };
}

function v2Payload(components, options = {}) {
  const flags = MessageFlags.IsComponentsV2
    | (options.ephemeral ? MessageFlags.Ephemeral : 0);
  return {
    flags,
    components,
    allowedMentions: { parse: [] },
  };
}

function ephemeralPayload(payload) {
  if (payload.flags) {
    return { ...payload, flags: payload.flags | MessageFlags.Ephemeral };
  }
  return { ...payload, ephemeral: true };
}

function currencyLabel(value) {
  const normalized = String(value ?? '').trim().replace(/^฿/, '').replace(/,/g, '');
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return String(value ?? '-');
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;
}

function trueMoneyFeeText(ctx) {
  const percent = Math.max(0, ctx.config.number('TRUEMONEY_FEE', 0) || 0);
  const flat = Math.max(0, ctx.config.number('TRUEMONEY_FEE_FLAT', 0) || 0);
  if (percent > 0 && flat > 0) return `หักค่าธรรมเนียม ${percent}% และ ${flat} บาทต่อซอง`;
  if (percent > 0) return `หักค่าธรรมเนียม ${percent}% ต่อซอง`;
  if (flat > 0) return `หักค่าธรรมเนียม ${flat} บาทต่อซอง`;
  return 'ไม่มีค่าธรรมเนียม';
}

function closeButton() {
  return new ButtonBuilder()
    .setCustomId('kanom:topup:close')
    .setLabel('ปิด')
    .setStyle(ButtonStyle.Secondary);
}

function retryPromptPayButton() {
  return new ButtonBuilder()
    .setCustomId('kanom:topup:retry:promptpay')
    .setLabel('ทำรายการใหม่อีกครั้ง')
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Primary);
}

function invalidAmountV2(message) {
  return v2Payload([
    container([
      text('# ⚠️ แจ้งเตือน'),
      separator(),
      text(message),
      separator(),
      actionRow(closeButton()),
    ]),
  ], { ephemeral: true });
}

function topupStatusV2(slot, data = {}) {
  switch (slot) {
    case 'topup_qr': {
      const children = [
        text('# 🏦 เติมเงินผ่านพร้อมเพย์'),
        separator(),
        text(`จำนวนเงินที่ต้องชำระ ${currencyLabel(data.amount)}`),
        separator(false, 1),
        text(`-# **👤 ชื่อบัญชี** ${data.account_name || '-'}`),
        text(`-# **⏰ เหลือเวลาอีก** ${data.countdown || '-'}`),
        separator(),
        mediaGallery(data.qr_image),
        separator(),
      ];
      if (data.slip_url) {
        children.push(actionRow(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('โอนแล้วแนบสลิปที่นี่')
            .setURL(data.slip_url),
        ));
      }
      return v2Payload([container(children)]);
    }
    case 'topup_timeout':
      return v2Payload([
        container([
          text('# 🔴 เกินเวลาที่กำหนด'),
          separator(),
          text('**📋 รายละเอียด**'),
          separator(false, 1),
          text('หากทำรายการไม่ทันให้กดทำรายการใหม่อีกครั้ง แล้วแนบสลิปได้เลยหากส่งสลิปไม่ทัน ขออภัยหากคุณได้ทำรายการไปแล้ว'),
          separator(),
          actionRow(retryPromptPayButton(), closeButton()),
        ]),
      ]);
    case 'processing':
      return v2Payload([
        container([
          text('# ⌛️ กำลังประมวลผล'),
          separator(),
          text('**📋 รายละเอียด**'),
          separator(false, 1),
          text('กำลังตรวจสอบสลิป กรุณารอสักครู่'),
        ]),
      ]);
    case 'error':
      return v2Payload([
        container([
          text('# 🔴 เกิดข้อผิดพลาด'),
          separator(),
          text('**📋 รายละเอียด**'),
          separator(false, 1),
          text(data.reason || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'),
        ]),
      ]);
    case 'topup_failed':
      return v2Payload([
        container([
          text('# 🔴 เติมเงินไม่สำเร็จ'),
          separator(),
          text('**📋 รายละเอียด**'),
          separator(false, 1),
          text(data.reason || 'ไม่สามารถเติมเงินได้ในขณะนี้'),
        ]),
      ]);
    case 'topup_success':
      return v2Payload([
        container([
          text('# 🟢 เติมเงินสำเร็จ'),
          separator(),
          text([
            `**👤 คนทำรายการ**\n<@${data.member}>`,
            `**💰 จำนวนเงินที่เติม**\n${currencyLabel(data.amount)}`,
            `**🏧 ยอดทั้งหมดที่มี**\n${currencyLabel(data.total_balance)}`,
            `**🏦 ช่องทางการเติม**\n${data.method || '-'}`,
            `**🕑 วันที่และเวลาทำรายการ**\n${data.datetime || '-'}`,
          ].join('\n\n')),
        ]),
      ]);
    default:
      throw new Error(`Unsupported wallet-topup Components V2 slot: ${slot}`);
  }
}

async function renderTopupStatus(ctx, slot, data = {}, legacyComponents = []) {
  if (usesComponentsV2(ctx)) return topupStatusV2(slot, data);
  return {
    embeds: [await ctx.services.embeds.renderEmbed(slot, data)],
    components: legacyComponents,
  };
}

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
    const expiresAt = new Date(Date.now() + Math.max(1, minutes) * 60 * 1000);
    await query(
      `INSERT INTO shop.temporary_role_grants
        (external_subject_id, guild_discord_id, member_discord_id, role_discord_id, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (external_subject_id, guild_discord_id, member_discord_id, role_discord_id)
       DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [ctx.config.subjectId, interaction.guild.id, member.id, role.id, expiresAt],
    );
    if (!member.roles.cache.has(role.id)) await member.roles.add(role);
    scheduleRoleRemoval(ctx, interaction.client, {
      guild_discord_id: interaction.guild.id,
      member_discord_id: member.id,
      role_discord_id: role.id,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('[central-bot] slip access role grant failed:', err.message);
  }
}

function scheduleRoleRemoval(ctx, client, grant) {
  const delay = Math.max(0, new Date(grant.expires_at).getTime() - Date.now());
  ctx.lifecycle.setTimeout(async () => {
    try {
      const { rows } = await query(
        `SELECT 1 FROM shop.temporary_role_grants
          WHERE external_subject_id = $1 AND guild_discord_id = $2
            AND member_discord_id = $3 AND role_discord_id = $4
            AND expires_at <= now()`,
        [ctx.config.subjectId, grant.guild_discord_id, grant.member_discord_id, grant.role_discord_id],
      );
      // A newer grant extended the expiry, so this older timer must do nothing.
      if (rows.length === 0) return;
      const guild = client.guilds.cache.get(String(grant.guild_discord_id))
        || (await client.guilds.fetch(String(grant.guild_discord_id)).catch(() => null));
      const member = await guild?.members.fetch(String(grant.member_discord_id)).catch(() => null);
      if (member?.roles.cache.has(String(grant.role_discord_id))) {
        await member.roles.remove(String(grant.role_discord_id));
      }
      await query(
        `DELETE FROM shop.temporary_role_grants
          WHERE external_subject_id = $1 AND guild_discord_id = $2
            AND member_discord_id = $3 AND role_discord_id = $4
            AND expires_at <= now()`,
        [ctx.config.subjectId, grant.guild_discord_id, grant.member_discord_id, grant.role_discord_id],
      );
    } catch (err) {
      ctx.log(`Temporary slip role removal failed: ${err.message}`);
    }
  }, Math.min(delay, 2_147_000_000));
}

async function onReady(client, ctx) {
  const { rows } = await query(
    `SELECT guild_discord_id, member_discord_id, role_discord_id, expires_at
       FROM shop.temporary_role_grants
      WHERE external_subject_id = $1
      ORDER BY expires_at ASC`,
    [ctx.config.subjectId],
  );
  rows.forEach((grant) => scheduleRoleRemoval(ctx, client, grant));
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
      signal: AbortSignal.timeout(VOUCHER_REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return { ok: false, message: 'บริการ TrueMoney ใช้เวลาตอบกลับนานเกินไป กรุณาตรวจสอบรายการก่อนลองอีกครั้ง' };
    }
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
    if (usesComponentsV2(ctx)) {
      await interaction.reply(invalidAmountV2('ร้านยังไม่ได้ตั้งค่าพร้อมเพย์ กรุณาติดต่อผู้ดูแลร้าน'));
    } else {
      await interaction.reply({ content: 'ร้านยังไม่ได้ตั้งค่าพร้อมเพย์ (PROMPTPAY_NUMBER)', ephemeral: true });
    }
    return;
  }
  const modal = promptPayAmountModal(ctx);
  await interaction.showModal(modal);
}

function promptPayAmountModal(ctx) {
  const min = ctx.config.number('MIN_TOPUP', 20);
  const amount = new TextInputBuilder()
    .setCustomId('amount').setLabel('จำนวนเงินที่ต้องการเติม (บาท)')
    .setStyle(TextInputStyle.Short).setRequired(true)
    .setPlaceholder(`ขั้นต่ำ ${min} บาท`);
  const modal = new ModalBuilder().setCustomId('kanom:topup:pp:modal').setTitle('เติมเงินผ่านพร้อมเพย์');
  modal.addComponents(new ActionRowBuilder().addComponents(amount));
  return modal;
}

// PromptPay amount modal → QR embed with live countdown → timeout embed.
async function onPpModal(interaction, ctx) {
  const min = ctx.config.number('MIN_TOPUP', 20);
  const amount = Number(interaction.fields.getTextInputValue('amount').trim());
  if (!Number.isFinite(amount) || amount <= 0) {
    if (usesComponentsV2(ctx)) {
      await interaction.reply(invalidAmountV2('กรุณาระบุจำนวนเงินมากกว่า 0 บาท'));
    } else {
      await interaction.reply({ content: 'กรุณาระบุจำนวนเงินมากกว่า 0', ephemeral: true });
    }
    return;
  }
  if (amount < min) {
    if (usesComponentsV2(ctx)) {
      await interaction.reply(invalidAmountV2(`ต้องเติมขั้นต่ำ ${min} บาท`));
    } else {
      await interaction.reply({ content: `ยอดเติมขั้นต่ำ ${min} บาท`, ephemeral: true });
    }
    return;
  }

  const phone = String(ctx.config.get('PROMPTPAY_NUMBER', '')).replace(/\D/g, '');
  await interaction.deferReply({ ephemeral: true });

  // promptpay.io renders the EMV PromptPay QR for us — no extra dependency.
  const qrImage = `https://promptpay.io/${phone}/${amount.toFixed(2)}.png`;
  const minutes = Math.max(1, ctx.config.number('TOPUP_QR_TIMEOUT', 5));
  const targetTs = Math.floor(Date.now() / 1000) + minutes * 60;

  const slipChannelId = ctx.config.get('SLIP_CHECK_CHANNEL');
  const slipUrl = slipChannelId && interaction.guildId
    ? `https://discord.com/channels/${interaction.guildId}/${slipChannelId}`
    : null;

  const renderQr = (secLeft) => renderTopupStatus(ctx, 'topup_qr', {
      amount: `${amount.toFixed(2)} THB`,
      account_name: ctx.config.get('PROMPTPAY_ACCOUNT_NAME', '-'),
      countdown: fmtCountdown(secLeft),
      qr_image: qrImage,
      slip_url: slipUrl,
    }, legacySlipComponents(slipUrl));

  // Link to the slip channel so the member knows where to post the slip.
  await interaction.editReply(await renderQr(minutes * 60));

  // Temp role so the member can see the slip channel; auto-removed after the QR window.
  await grantTempSlipRole(interaction, ctx, minutes);

  const tick = ctx.lifecycle.setInterval(() => {
    ctx.lifecycle.runExclusive(`promptpay-countdown:${interaction.id}`, async () => {
      const left = Math.max(0, targetTs - Math.floor(Date.now() / 1000));
      try {
        if (left <= 0) {
          ctx.lifecycle.clearTimer(tick);
          await interaction.editReply(await renderTopupStatus(ctx, 'topup_timeout')).catch(() => {});
          return;
        }
        await interaction.editReply(await renderQr(left));
      } catch (err) {
        ctx.lifecycle.clearTimer(tick);
        ctx.log(`PromptPay countdown stopped: ${err.message}`);
      }
    }).catch((err) => ctx.log(`PromptPay countdown crashed: ${err.message}`));
  }, COUNTDOWN_TICK_MS);
}

function legacySlipComponents(slipUrl) {
  if (!slipUrl) return [];
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setURL(slipUrl)
      .setLabel('โอนแล้วแนบสลิปที่นี่')
      .setStyle(ButtonStyle.Link),
  )];
}

// TrueMoney voucher modal → redeem → credit → topup_success / topup_failed.
async function onTmnModal(interaction, ctx) {
  const giftUrl = interaction.fields.getTextInputValue('gift').trim();
  if (!GIFT_RE.test(giftUrl)) {
    if (usesComponentsV2(ctx)) {
      await interaction.reply(ephemeralPayload(await renderTopupStatus(ctx, 'topup_failed', {
        reason: 'กรุณากรอกลิงก์ซองอั่งเปาให้ถูกต้อง',
      })));
    } else {
      await interaction.reply({ content: 'กรุณากรอกลิงก์ซองอั่งเปาให้ถูกต้อง (ขึ้นต้น https://gift.truemoney.com/campaign/?v=)', ephemeral: true });
    }
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const result = await redeemVoucher(ctx, giftUrl);
  if (!result.ok) {
    await interaction.editReply(await renderTopupStatus(ctx, 'topup_failed', { reason: result.message }));
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
    await interaction.editReply(await renderTopupStatus(ctx, 'topup_failed', {
      reason: 'ค่าธรรมเนียมมากกว่าหรือเท่ากับยอดซอง — ไม่สามารถเติมได้',
    }));
    return;
  }

  const balance = await ctx.services.wallet.credit(interaction.user.id, creditSatang, {
    type: 'TOPUP',
    note: 'truemoney voucher',
  });
  const successData = {
    member: interaction.user.id,
    amount: thb(creditSatang),
    total_balance: thb(balance),
    method: 'ซองทรูมันนี่',
    datetime: new Date().toLocaleString('th-TH'),
    fee: thb(feeSatang),
    gross: thb(gross),
  };
  const success = await renderTopupStatus(ctx, 'topup_success', successData);
  await interaction.editReply(success);

  // Post the same success embed publicly, like a SlipOK top-up does (slip.js).
  const channelId = ctx.config.get('TOPUP_NOTIFY_CHANNEL');
  if (channelId && interaction.guild) {
    const channel = interaction.guild.channels.cache.get(String(channelId))
      || (await interaction.guild.channels.fetch(String(channelId)).catch(() => null));
    if (channel?.isTextBased()) await channel.send(success).catch(() => {});
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
  const trueMoneyStyle = usesComponentsV2(ctx) ? ButtonStyle.Danger : ButtonStyle.Success;
  const row = new ActionRowBuilder().addComponents(
    mkButton('kanom:topup:btn:promptpay', 'พร้อมเพย์ธนาคาร', ButtonStyle.Primary, '🏧', 'btn_promptpay'),
    mkButton('kanom:topup:btn:truemoney', 'ซองอั่งเปาทรูมันนี่', trueMoneyStyle, '🧧', 'btn_truemoney'),
  );
  if (usesComponentsV2(ctx)) {
    return v2Payload([
      container([
        text('# เลือกช่องทางเติมเงิน'),
        separator(),
        text('**🔻 อ่านก่อนเติม**'),
        separator(false, 1),
        text(`เติมเงินผ่านซองอั่งเปาทรูมันนี่ ${trueMoneyFeeText(ctx)}`),
        separator(),
        actionRow(...row.components),
      ]),
    ]);
  }
  const embed = await ctx.services.embeds.renderEmbed('topup_method');
  return { embeds: [embed], components: [row] };
}

// Build the standalone top-up panel (topup_panel embed + a "เติมเงิน" button). Posted
// by /topup-panel so members can top up WITHOUT the Roblox Robux Payout feature.
async function buildTopupPanel(ctx) {
  const cfg = await ctx.services.embeds.getConfig('topup_panel');
  const role = ((cfg && cfg.components) || {}).btn_topup || {};
  const btn = new ButtonBuilder()
    .setCustomId('kanom:topup:open')
    .setLabel(String(role.label || 'เติมเงิน').slice(0, 80))
    .setStyle(buttonStyle(role.style, ButtonStyle.Primary));
  const emoji = parseEmoji(role.emoji) || '💰';
  if (emoji) { try { btn.setEmoji(emoji); } catch (_e) { /* skip invalid emoji */ } }
  if (usesComponentsV2(ctx)) {
    return v2Payload([
      container([
        text(`# ${cfg.title || '💰 เติมเงินเข้ากระเป๋า'}`),
        separator(),
        text(cfg.description || 'กดปุ่ม **เติมเงิน** ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ'),
        separator(),
        actionRow(btn),
      ]),
    ]);
  }
  const embed = await ctx.services.embeds.renderEmbed('topup_panel');
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] };
}

// Member clicked เติมเงิน on the standalone panel → show the method picker (ephemeral).
async function onOpenTopup(interaction, ctx) {
  await interaction.reply(ephemeralPayload(await buildTopupMethod(ctx)));
}

async function onRetryPromptPay(interaction, ctx) {
  await interaction.showModal(promptPayAmountModal(ctx));
}

async function onClose(interaction) {
  await interaction.deferUpdate();
  await interaction.deleteReply().catch(() => {});
}

module.exports = {
  onReady,
  buildTopupMethod,
  buildTopupPanel,
  renderTopupStatus,
  usesComponentsV2,
  components: {
    'kanom:topup:open': onOpenTopup,
    'kanom:topup:btn:': onTopupMethod,
    'kanom:topup:retry:promptpay': onRetryPromptPay,
    'kanom:topup:close': onClose,
    'kanom:topup:tmn:modal': onTmnModal,
    'kanom:topup:pp:modal': onPpModal,
  },
};
