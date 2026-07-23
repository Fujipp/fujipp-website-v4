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
const { withDiscordContext } = require('./discord-context');

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

function section(content, accessoryUrl) {
  return {
    type: 9,
    components: [text(content)],
    accessory: { type: 11, media: { url: accessoryUrl } },
  };
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

function appearance(config, key) {
  return (config?.components || {})[key] || {};
}

function configurableButton(config, key, customId, fallbackLabel, fallbackStyle, fallbackEmoji) {
  const role = appearance(config, key);
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(String(role.label || fallbackLabel).slice(0, 80))
    .setStyle(buttonStyle(role.style, fallbackStyle));
  const emoji = parseEmoji(role.emoji) || fallbackEmoji;
  if (emoji) { try { button.setEmoji(emoji); } catch (_e) { /* skip invalid emoji */ } }
  return button;
}

function closeButton(config) {
  return configurableButton(config, 'btn_close', 'kanom:topup:close', 'ปิด', ButtonStyle.Secondary);
}

function retryPromptPayButton(config) {
  return configurableButton(
    config, 'btn_retry', 'kanom:topup:retry:promptpay',
    'ทำรายการใหม่อีกครั้ง', ButtonStyle.Primary, '🔄',
  );
}

function componentText(config, key, fallback) {
  return String(config?.componentsV2?.texts?.[key] || fallback);
}

function configuredContainerOptions(config) {
  const raw = config?.componentsV2?.container;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const options = {};
  const accent = Number(raw.accentColor);
  if (Number.isInteger(accent) && accent >= 0 && accent <= 0xFFFFFF) options.accent_color = accent;
  if (raw.spoiler === true) options.spoiler = true;
  return options;
}

function customLinkRow(block) {
  if (!Array.isArray(block?.buttons)) return null;
  const buttons = [];
  for (const item of block.buttons.slice(0, 5)) {
    const label = String(item?.label || '').trim().slice(0, 80);
    const url = String(item?.url || '').trim();
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch (_e) { continue; }
    if (!label || url.length > 512 || !['http:', 'https:'].includes(parsedUrl.protocol)) continue;
    const button = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url);
    const emoji = parseEmoji(item?.emoji);
    if (emoji) { try { button.setEmoji(emoji); } catch (_e) { /* skip invalid emoji */ } }
    buttons.push(button);
  }
  return buttons.length ? actionRow(...buttons) : null;
}

function configuredChildren(config, fallback, rows = {}, requiredRowKeys = []) {
  const layout = config?.componentsV2?.layout;
  if (!Array.isArray(layout) || layout.length === 0) return fallback;

  const usedRows = new Set();
  const children = [];
  let nodeCount = 0;
  const rowNodeCost = (row) => 1 + (Array.isArray(row?.components) ? row.components.length : 0);
  const pendingRequiredRows = new Set(requiredRowKeys.filter((key) => rows[key]));
  let reservedNodeCount = [...pendingRequiredRows].reduce((total, key) => total + rowNodeCost(rows[key]), 0);
  const append = (child, cost = 1, requiredRowKey = '') => {
    const releasedNodes = requiredRowKey && pendingRequiredRows.has(requiredRowKey) ? cost : 0;
    if (nodeCount + cost + reservedNodeCount - releasedNodes > 40) return false;
    children.push(child);
    nodeCount += cost;
    if (releasedNodes) {
      pendingRequiredRows.delete(requiredRowKey);
      reservedNodeCount -= releasedNodes;
    }
    return true;
  };

  // Discord counts nested buttons inside action rows toward the 40-node limit.
  // Stop before that boundary so an oversized custom layout cannot reject the
  // entire top-up response.
  for (const block of layout) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'text') {
      const content = String(block.content || '').slice(0, 4000);
      if (content && !append(text(content))) break;
      continue;
    }
    if (block.type === 'separator') {
      if (!append(separator(block.divider !== false, Number(block.spacing) === 1 ? 1 : 2))) break;
      continue;
    }
    if (block.type === 'media') {
      const url = String(block.url || '').trim();
      if (/^https?:\/\//i.test(url)) {
        const item = { media: { url } };
        if (block.description) item.description = String(block.description).slice(0, 1024);
        if (block.spoiler === true) item.spoiler = true;
        if (!append({ type: 12, items: [item] }, 2)) break;
      }
      continue;
    }
    if (block.type === 'section') {
      const content = String(block.content || '').slice(0, 4000);
      const accessoryUrl = String(block.accessoryUrl || '').trim();
      if (content && /^https?:\/\//i.test(accessoryUrl) && !append(section(content, accessoryUrl), 3)) break;
      continue;
    }
    if (block.type === 'row') {
      const fixedRow = rows[block.rowKey];
      const linkRow = customLinkRow(block);
      const row = fixedRow
        ? { ...fixedRow, components: [...(fixedRow.components || []), ...(linkRow?.components || [])].slice(0, 5) }
        : linkRow;
      if (!row) continue;
      if (!append(row, rowNodeCost(row), fixedRow ? block.rowKey : '')) break;
      if (fixedRow) usedRows.add(block.rowKey);
    }
  }

  for (const rowKey of requiredRowKeys) {
    if (!usedRows.has(rowKey) && rows[rowKey]) append(rows[rowKey], rowNodeCost(rows[rowKey]), rowKey);
  }
  return children.length ? children : fallback;
}

function configuredV2Payload(config, fallback, rows = {}, requiredRowKeys = [], options = {}) {
  const children = configuredChildren(config, fallback, rows, requiredRowKeys);
  return v2Payload([container(children, configuredContainerOptions(config))], options);
}

function slipLinkButton(config, url) {
  const role = appearance(config, 'btn_slip');
  const button = new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setLabel(String(role.label || 'โอนแล้วแนบสลิปที่นี่').slice(0, 80))
    .setURL(url);
  const emoji = parseEmoji(role.emoji);
  if (emoji) { try { button.setEmoji(emoji); } catch (_e) { /* skip invalid emoji */ } }
  return button;
}

async function invalidAmountV2(ctx, message, values = { reason: message }) {
  const config = await ctx.services.embeds.renderConfig('topup_invalid', values);
  const fallback = [
    text(componentText(config, 'heading', '# ⚠️ แจ้งเตือน')),
    separator(),
    text(componentText(config, 'detail', message)),
    separator(),
    actionRow(closeButton(config)),
  ];
  return configuredV2Payload(config, fallback, {
    close_action: actionRow(closeButton(config)),
  }, ['close_action'], { ephemeral: true });
}

async function invalidAmountPayload(ctx, message, source = null) {
  const values = withDiscordContext(source, { reason: message });
  if (usesComponentsV2(ctx)) return invalidAmountV2(ctx, message, values);
  return { embeds: [await ctx.services.embeds.renderEmbed('topup_invalid', values)], ephemeral: true };
}

async function topupStatusV2(ctx, slot, data = {}) {
  const config = await ctx.services.embeds.renderConfig(slot, data);
  switch (slot) {
    case 'topup_qr': {
      const children = [
        text(componentText(config, 'heading', '# 🏦 เติมเงินผ่านพร้อมเพย์')),
        separator(),
        text(componentText(config, 'amount', `จำนวนเงินที่ต้องชำระ ${currencyLabel(data.amount)}`)),
        separator(false, 1),
        text(componentText(config, 'account', `-# **👤 ชื่อบัญชี** ${data.account_name || '-'}`)),
        text(componentText(config, 'countdown', `-# **⏰ เหลือเวลาอีก** ${data.countdown || '-'}`)),
        separator(),
        mediaGallery(data.qr_image),
        separator(),
      ];
      const rows = {};
      if (data.slip_url) {
        rows.slip_action = actionRow(slipLinkButton(config, data.slip_url));
        children.push(rows.slip_action);
      }
      return configuredV2Payload(config, children, rows, data.slip_url ? ['slip_action'] : []);
    }
    case 'topup_timeout': {
      const row = actionRow(retryPromptPayButton(config), closeButton(config));
      const fallback = [
        text(componentText(config, 'heading', '# 🔴 เกินเวลาที่กำหนด')),
        separator(),
        text(componentText(config, 'detail_heading', '**📋 รายละเอียด**')),
        separator(false, 1),
        text(componentText(config, 'detail', 'หากทำรายการไม่ทันให้กดทำรายการใหม่อีกครั้ง แล้วแนบสลิปได้เลยหากส่งสลิปไม่ทัน ขออภัยหากคุณได้ทำรายการไปแล้ว')),
        separator(), row,
      ];
      return configuredV2Payload(config, fallback, { timeout_actions: row }, ['timeout_actions']);
    }
    case 'processing': {
      const fallback = [
        text(componentText(config, 'heading', '# ⌛️ กำลังประมวลผล')),
        separator(),
        text(componentText(config, 'detail_heading', '**📋 รายละเอียด**')),
        separator(false, 1),
        text(componentText(config, 'detail', 'กำลังตรวจสอบสลิป กรุณารอสักครู่')),
      ];
      return configuredV2Payload(config, fallback);
    }
    case 'error': {
      const fallback = [
        text(componentText(config, 'heading', '# 🔴 เกิดข้อผิดพลาด')),
        separator(),
        text(componentText(config, 'detail_heading', '**📋 รายละเอียด**')),
        separator(false, 1),
        text(componentText(config, 'detail', data.reason || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')),
      ];
      return configuredV2Payload(config, fallback);
    }
    case 'topup_failed': {
      const fallback = [
        text(componentText(config, 'heading', '# 🔴 เติมเงินไม่สำเร็จ')),
        separator(),
        text(componentText(config, 'detail_heading', '**📋 รายละเอียด**')),
        separator(false, 1),
        text(componentText(config, 'detail', data.reason || 'ไม่สามารถเติมเงินได้ในขณะนี้')),
      ];
      return configuredV2Payload(config, fallback);
    }
    case 'topup_success': {
      const fallback = [
        text(componentText(config, 'heading', '# 🟢 เติมเงินสำเร็จ')),
        separator(),
        text(componentText(config, 'detail', [
            `**👤 คนทำรายการ**\n<@${data.member}>`,
            `**💰 จำนวนเงินที่เติม**\n${currencyLabel(data.amount)}`,
            `**🏧 ยอดทั้งหมดที่มี**\n${currencyLabel(data.total_balance)}`,
            `**🏦 ช่องทางการเติม**\n${data.method || '-'}`,
            `**🕑 วันที่และเวลาทำรายการ**\n${data.datetime || '-'}`,
          ].join('\n\n'))),
      ];
      return configuredV2Payload(config, fallback);
    }
    default:
      throw new Error(`Unsupported wallet-topup Components V2 slot: ${slot}`);
  }
}

async function renderTopupStatus(ctx, slot, data = {}, legacyComponents = [], source = null) {
  const values = withDiscordContext(source, data);
  if (usesComponentsV2(ctx)) return topupStatusV2(ctx, slot, values);
  return {
    embeds: [await ctx.services.embeds.renderEmbed(slot, values)],
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
  try {
    if (method === 'truemoney') {
      await interaction.showModal(trueMoneyGiftModal());
      return;
    }

    // promptpay — QR scan + slip verification
    const phone = String(ctx.config.get('PROMPTPAY_NUMBER', '')).replace(/\D/g, '');
    if (phone.length !== 10 && phone.length !== 13) {
      await interaction.reply(await invalidAmountPayload(ctx, 'ร้านยังไม่ได้ตั้งค่าพร้อมเพย์ กรุณาติดต่อผู้ดูแลร้าน', interaction));
      return;
    }
    await interaction.showModal(promptPayAmountModal(ctx));
  } catch (error) {
    if (interaction.deferred || interaction.replied) throw error;
    ctx.log(
      `Top-up ${method} modal failed; retrying with emergency modal:`,
      error?.code || 'unknown',
      error?.message || String(error),
    );
    await interaction.showModal(method === 'truemoney'
      ? trueMoneyGiftModal({ emergency: true })
      : promptPayAmountModal(ctx, { emergency: true }));
  }
}

function trueMoneyGiftModal(options = {}) {
  const modal = new ModalBuilder()
    .setCustomId('kanom:topup:tmn:modal')
    .setTitle(options.emergency ? 'TrueMoney top-up' : 'เติมเงินผ่านซองทรูมันนี่');
  const link = new TextInputBuilder()
    .setCustomId('gift')
    .setLabel(options.emergency ? 'TrueMoney gift link' : 'ลิงก์ซองอั่งเปา')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('https://gift.truemoney.com/campaign/?v=...');
  modal.addComponents(new ActionRowBuilder().addComponents(link));
  return modal;
}

function promptPayAmountModal(ctx, options = {}) {
  const min = ctx.config.number('MIN_TOPUP', 20);
  const amount = new TextInputBuilder()
    .setCustomId('amount').setLabel(options.emergency ? 'Amount (THB)' : 'จำนวนเงินที่ต้องการเติม (บาท)')
    .setStyle(TextInputStyle.Short).setRequired(true)
    .setPlaceholder(`ขั้นต่ำ ${min} บาท`);
  const modal = new ModalBuilder()
    .setCustomId('kanom:topup:pp:modal')
    .setTitle(options.emergency ? 'PromptPay top-up' : 'เติมเงินผ่านพร้อมเพย์');
  modal.addComponents(new ActionRowBuilder().addComponents(amount));
  return modal;
}

// PromptPay amount modal → QR embed with live countdown → timeout embed.
async function onPpModal(interaction, ctx) {
  const min = ctx.config.number('MIN_TOPUP', 20);
  const amount = Number(interaction.fields.getTextInputValue('amount').trim());
  if (!Number.isFinite(amount) || amount <= 0) {
    await interaction.reply(await invalidAmountPayload(ctx, 'กรุณาระบุจำนวนเงินมากกว่า 0 บาท', interaction));
    return;
  }
  if (amount < min) {
    await interaction.reply(await invalidAmountPayload(ctx, `ต้องเติมขั้นต่ำ ${min} บาท`, interaction));
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
    }, legacySlipComponents(slipUrl), interaction);

  // Link to the slip channel so the member knows where to post the slip. A
  // customer-edited Embed can still be malformed independently of the payment
  // logic, so retain a template-free response that keeps the QR flow usable.
  try {
    await interaction.editReply(await renderQr(minutes * 60));
  } catch (error) {
    ctx.log(
      'Configured PromptPay QR reply failed; using emergency QR response:',
      error?.code || 'unknown',
      error?.message || String(error),
    );
    await interaction.editReply({
      content: [
        '**เติมเงินผ่านพร้อมเพย์**',
        `จำนวนเงิน: **${amount.toFixed(2)} THB**`,
        `ชื่อบัญชี: **${ctx.config.get('PROMPTPAY_ACCOUNT_NAME', '-')}**`,
        `กรุณาชำระภายใน ${minutes} นาที`,
        qrImage,
      ].join('\n'),
      components: legacySlipComponents(slipUrl),
    });
  }

  // Temp role so the member can see the slip channel; auto-removed after the QR window.
  await grantTempSlipRole(interaction, ctx, minutes);

  const tick = ctx.lifecycle.setInterval(() => {
    ctx.lifecycle.runExclusive(`promptpay-countdown:${interaction.id}`, async () => {
      const left = Math.max(0, targetTs - Math.floor(Date.now() / 1000));
      try {
        if (left <= 0) {
          ctx.lifecycle.clearTimer(tick);
          await interaction.editReply(
            await renderTopupStatus(ctx, 'topup_timeout', {}, [], interaction),
          ).catch(() => {});
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
    await interaction.reply(ephemeralPayload(await renderTopupStatus(ctx, 'topup_failed', {
      reason: 'กรุณากรอกลิงก์ซองอั่งเปาให้ถูกต้อง (ขึ้นต้น https://gift.truemoney.com/campaign/?v=)',
    }, [], interaction)));
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const result = await redeemVoucher(ctx, giftUrl);
  if (!result.ok) {
    await interaction.editReply(await renderTopupStatus(ctx, 'topup_failed', { reason: result.message }, [], interaction));
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
    }, [], interaction));
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
  const success = await renderTopupStatus(ctx, 'topup_success', successData, [], interaction);
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
// message. Labels, emoji, and styles are configurable while the custom IDs and
// handlers stay fixed so appearance edits cannot break the payment flow.
async function buildTopupMethod(ctx, source = null, options = {}) {
  const values = withDiscordContext(source, { fee_text: trueMoneyFeeText(ctx) });
  const cfg = await ctx.services.embeds.renderConfig('topup_method', values);
  const renderComponentsV2 = options.forceEmbed !== true && usesComponentsV2(ctx);
  const roles = (cfg && cfg.components) || {};
  const mkButton = (id, label, style, fallbackEmoji, roleKey) => {
    const role = roles[roleKey] || {};
    const btn = new ButtonBuilder()
      .setCustomId(id)
      .setLabel(String(role.label || label).slice(0, 80))
      .setStyle(buttonStyle(role.style, style));
    const emoji = parseEmoji(role.emoji) || fallbackEmoji;
    if (emoji) { try { btn.setEmoji(emoji); } catch (_e) { /* skip invalid emoji */ } }
    return btn;
  };
  const trueMoneyStyle = renderComponentsV2 ? ButtonStyle.Danger : ButtonStyle.Success;
  const row = new ActionRowBuilder().addComponents(
    mkButton('kanom:topup:btn:promptpay', 'พร้อมเพย์ธนาคาร', ButtonStyle.Primary, '🏧', 'btn_promptpay'),
    mkButton('kanom:topup:btn:truemoney', 'ซองอั่งเปาทรูมันนี่', trueMoneyStyle, '🧧', 'btn_truemoney'),
  );
  if (renderComponentsV2) {
    const actions = actionRow(...row.components);
    const fallback = [
      text(componentText(cfg, 'heading', '# เลือกช่องทางเติมเงิน')),
      separator(),
      text(componentText(cfg, 'notice_heading', '**🔻 อ่านก่อนเติม**')),
      separator(false, 1),
      text(componentText(cfg, 'notice', `เติมเงินผ่านซองอั่งเปาทรูมันนี่ ${trueMoneyFeeText(ctx)}`)),
      separator(), actions,
    ];
    return configuredV2Payload(cfg, fallback, { topup_method_actions: actions }, ['topup_method_actions']);
  }
  const embed = await ctx.services.embeds.renderEmbed('topup_method', {
    ...values,
  });
  return { embeds: [embed], components: [row] };
}

// Build the standalone top-up panel (topup_panel embed + a "เติมเงิน" button). Posted
// by /topup-panel so members can top up WITHOUT the Roblox Robux Payout feature.
async function buildConfigurableTopupPanel(ctx, source = null) {
  const values = withDiscordContext(source);
  for (const key of [
    'member', 'member_id', 'member_mention', 'member_username',
    'member_display_name', 'member_avatar_url', 'avatar_url',
  ]) delete values[key];
  const cfg = await ctx.services.embeds.renderConfig('topup_panel', values);
  const btn = configurableButton(cfg, 'btn_topup', 'kanom:topup:open', 'เติมเงิน', ButtonStyle.Success, '💰');
  const balanceBtn = configurableButton(cfg, 'btn_balance', 'kanom:topup:balance', 'เช็คยอดเงินคงเหลือ', ButtonStyle.Secondary, '💳');
  if (usesComponentsV2(ctx)) {
    const actions = actionRow(btn, balanceBtn);
    const fallback = [
      text(componentText(cfg, 'heading', '# เติมเงินเข้ากระเป๋า')),
      separator(),
      separator(false, 1),
      text(componentText(cfg, 'description', 'กดปุ่ม เติมเงิน ด้านล่างเพื่อเลือกช่องทางและเติมเงินเข้ากระเป๋าเงินของคุณ')),
      separator(), actions,
    ];
    return configuredV2Payload(cfg, fallback, { topup_panel_actions: actions }, ['topup_panel_actions']);
  }
  const embed = await ctx.services.embeds.renderEmbed('topup_panel', values);
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(btn, balanceBtn)] };
}

async function buildTopupPanel(ctx, source = null) {
  try {
    return await buildConfigurableTopupPanel(ctx, source);
  } catch (error) {
    ctx.log(
      'Configurable top-up panel failed; using emergency panel:',
      error?.code || 'unknown',
      error?.message || String(error),
    );
    return buildEmergencyTopupPanel();
  }
}

function buildEmergencyTopupPanel() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kanom:topup:open')
      .setLabel('เติมเงิน')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💰'),
    new ButtonBuilder()
      .setCustomId('kanom:topup:balance')
      .setLabel('เช็คยอดเงินคงเหลือ')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💳'),
  );
  return {
    content: '**เติมเงินเข้ากระเป๋า**\nกดปุ่มด้านล่างเพื่อเติมเงินหรือเช็คยอดเงินคงเหลือ',
    components: [row],
  };
}

async function buildWalletBalance(ctx, user, balanceSatang, source = null) {
  const avatarUrl = user.displayAvatarURL({ extension: 'webp', size: 160 });
  if (!usesComponentsV2(ctx)) {
    return {
      embeds: [await ctx.services.embeds.renderEmbed('balance', withDiscordContext(source, {
        member: user.id,
        balance: thb(balanceSatang),
        avatar_url: avatarUrl,
      }, user))],
    };
  }
  const balance = currencyLabel(thb(balanceSatang));
  const cfg = await ctx.services.embeds.renderConfig('balance', withDiscordContext(source, {
    member: user.id,
    balance,
    avatar_url: avatarUrl,
  }, user));
  const fallback = [
    text(componentText(cfg, 'heading', '# 💳 เงินในบัญชีของคุณ')),
    separator(),
    section(componentText(cfg, 'balance_text', `# ยอดคงเหลือ ${balance}`), avatarUrl),
    separator(false, 1),
    separator(),
  ];
  return configuredV2Payload(cfg, fallback);
}

async function onBalance(interaction, ctx) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const balance = await ctx.services.wallet.getBalance(interaction.user.id);
  await interaction.editReply(await buildWalletBalance(ctx, interaction.user, balance, interaction));
}

// Member clicked เติมเงิน on the standalone panel → show the method picker (ephemeral).
async function onOpenTopup(interaction, ctx) {
  try {
    await interaction.reply(ephemeralPayload(
      await buildTopupMethod(ctx, interaction),
    ));
  } catch (error) {
    if (interaction.deferred || interaction.replied) throw error;
    ctx.log(
      'Configurable top-up method reply failed; retrying with emergency controls:',
      error?.code || 'unknown',
      error?.message || String(error),
    );
    const emergencyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kanom:topup:btn:promptpay')
        .setLabel('พร้อมเพย์ธนาคาร')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🏧'),
      new ButtonBuilder()
        .setCustomId('kanom:topup:btn:truemoney')
        .setLabel('ซองอั่งเปาทรูมันนี่')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🧧'),
    );
    await interaction.reply({
      content: '**เลือกช่องทางเติมเงิน**',
      components: [emergencyRow],
      flags: MessageFlags.Ephemeral,
    });
  }
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
  buildEmergencyTopupPanel,
  buildWalletBalance,
  renderTopupStatus,
  usesComponentsV2,
  components: {
    'kanom:topup:open': onOpenTopup,
    'kanom:topup:balance': onBalance,
    'kanom:topup:btn:': onTopupMethod,
    'kanom:topup:retry:promptpay': onRetryPromptPay,
    'kanom:topup:close': onClose,
    'kanom:topup:tmn:modal': onTmnModal,
    'kanom:topup:pp:modal': onPpModal,
  },
};
