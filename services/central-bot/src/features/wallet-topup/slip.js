// src/features/wallet-topup/slip.js
// PromptPay slip verification via SlipOK — port of the legacy Kanom bank/check_slip.js.
// Members post a slip image in SLIP_CHECK_CHANNEL; we verify it with SlipOK and credit
// the shop wallet. Duplicate slips are rejected by SlipOK itself (code 1012, log=true).
//
// Reading message attachments requires the privileged MESSAGE CONTENT intent — the
// customer must enable it in the Discord Dev Portal, and we only request it when the
// slip config is actually present (otherwise login would fail with disallowed intents).
//
// Config keys: SLIPOK_BRANCH_ID, API_SLIPOK_KEY, SLIP_CHECK_CHANNEL, TOPUP_NOTIFY_CHANNEL.

const { GatewayIntentBits } = require('discord.js');

const SLIPOK_BASE = 'https://api.slipok.com/api/line/apikey';

// Human-readable SlipOK error codes (same table the legacy bot used).
const SLIP_ERRORS = {
  1005: 'อัปโหลดได้เฉพาะ .jpg .jpeg .png',
  1006: 'รูปภาพไม่ถูกต้อง',
  1007: 'ไม่มี QR ในรูป — ลองครอปให้เหลือเฉพาะ QR แล้วส่งใหม่',
  1008: 'QR ไม่ใช่สำหรับตรวจสอบการชำระเงิน',
  1009: 'ระบบธนาคารขัดข้องชั่วคราว',
  1010: 'QR กำลังประมวลผล — สลิปธนาคารกรุงเทพให้รอ 1-2 นาที แล้วส่งใหม่อีกรอบ',
  1011: 'QR หมดอายุ / ไม่มีรายการ',
  1012: 'สลิปซ้ำ — เคยส่งมาแล้ว',
  1013: 'ยอดที่ส่งไม่ตรงกับยอดสลิป',
  1014: 'บัญชีผู้รับไม่ตรงกับบัญชีหลัก',
};

const thb = (satang) => `฿${(satang / 100).toLocaleString('th-TH')}`;

function slipConfigured(config) {
  return Boolean(
    config.get('SLIPOK_BRANCH_ID') && config.get('API_SLIPOK_KEY') && config.get('SLIP_CHECK_CHANNEL'),
  );
}

// Extra gateway intents this flow needs; empty when slip check is not configured.
function intents(config) {
  if (!slipConfigured(config)) return [];
  return [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent];
}

// Accept either the raw branch id or a full SlipOK link pasted by the customer.
function branchIdOf(config) {
  let id = String(config.get('SLIPOK_BRANCH_ID', '')).trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(id)) id = id.split('/').pop();
  return id;
}

async function callSlipOk(branchId, apiKey, form) {
  const res = await fetch(`${SLIPOK_BASE}/${branchId}`, {
    method: 'POST',
    headers: { 'x-authorization': String(apiKey || '') },
    body: form,
  });
  let body = {};
  try { body = await res.json(); } catch (_e) { /* non-JSON response */ }
  return { ok: res.ok, status: res.status, body };
}

async function verifyViaUrl(branchId, apiKey, imageUrl) {
  const form = new FormData();
  form.append('url', imageUrl);
  form.append('log', 'true'); // log=true makes SlipOK reject duplicate slips (1012)
  return callSlipOk(branchId, apiKey, form);
}

// Fallback: download the image and send it as a file (some slips fail the URL path).
async function verifyViaFiles(branchId, apiKey, imageUrl) {
  const img = await fetch(imageUrl);
  const buf = await img.arrayBuffer();
  const blob = new Blob([new Uint8Array(buf)], { type: img.headers.get('content-type') || 'image/jpeg' });
  const form = new FormData();
  form.append('files', blob, 'slip.jpg');
  form.append('log', 'true');
  return callSlipOk(branchId, apiKey, form);
}

function isImage(att) {
  return /^image\//.test(att.contentType || '') || /\.(png|jpe?g)$/i.test(att.name || '');
}

async function notifyChannel(message, ctx, embed) {
  const channelId = ctx.config.get('TOPUP_NOTIFY_CHANNEL');
  if (!channelId) return;
  const channel = message.guild.channels.cache.get(channelId)
    || (await message.guild.channels.fetch(channelId).catch(() => null));
  if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => {});
}

// messageCreate — verify every slip image posted in the configured check channel.
async function onMessage(message, ctx) {
  if (!message.guildId || message.author?.bot || !message.attachments?.size) return;
  if (String(message.channelId) !== String(ctx.config.get('SLIP_CHECK_CHANNEL', ''))) return;

  const branchId = branchIdOf(ctx.config);
  const apiKey = String(ctx.config.get('API_SLIPOK_KEY', '')).trim();
  if (!branchId || !apiKey) {
    const embed = await ctx.services.embeds.renderEmbed('error', {
      reason: 'ร้านยังตั้งค่า SlipOK ไม่ครบ (SLIPOK_BRANCH_ID / API_SLIPOK_KEY)',
    });
    await message.reply({ embeds: [embed] }).catch(() => {});
    return;
  }

  const images = [...message.attachments.values()].filter(isImage).slice(0, 3);
  for (const att of images) {
    const loading = await message.reply({
      embeds: [await ctx.services.embeds.renderEmbed('processing')],
    }).catch(() => null);
    if (!loading) continue;

    try {
      let result = await verifyViaUrl(branchId, apiKey, att.url);
      if (!result.ok && (result.status === 404 || /not\s*found/i.test(String(result.body?.message || '')))) {
        result = await verifyViaFiles(branchId, apiKey, att.url);
      }

      if (result.ok && result.body?.success) {
        const amountBaht = Number(result.body?.data?.amount || 0);
        if (!Number.isFinite(amountBaht) || amountBaht <= 0) {
          const embed = await ctx.services.embeds.renderEmbed('topup_failed', {
            reason: 'ตรวจสลิปผ่าน แต่ไม่พบยอดเงินในข้อมูลสลิป',
          });
          await loading.edit({ embeds: [embed] }).catch(() => {});
          continue;
        }

        const amountSatang = Math.round(amountBaht * 100);
        const balance = await ctx.services.wallet.credit(message.author.id, amountSatang, {
          type: 'TOPUP',
          reference: result.body?.data?.transRef || null,
          note: 'slipok',
        });
        const embed = await ctx.services.embeds.renderEmbed('topup_success', {
          member: message.author.id,
          amount: thb(amountSatang),
          total_balance: thb(balance),
          method: 'QR (SlipOK)',
          datetime: new Date().toLocaleString('th-TH'),
        });
        await loading.edit({ embeds: [embed] }).catch(() => {});
        await notifyChannel(message, ctx, embed);
        // Refresh rank roles off the new lifetime total (no-op if top-spender-rank is off).
        ctx.services.rankSync?.(message.guild)?.catch(() => {});
      } else {
        const code = Number(result.body?.code ?? result.status);
        const reason = SLIP_ERRORS[code]
          || String(result.body?.message || '').trim()
          || 'ไม่สามารถตรวจสอบสลิปได้ในขณะนี้';
        const embed = await ctx.services.embeds.renderEmbed('topup_failed', { reason });
        await loading.edit({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      console.error('[central-bot] slip verify failed:', err.message);
      const embed = await ctx.services.embeds.renderEmbed('error', {
        reason: 'เชื่อมต่อบริการตรวจสลิปล้มเหลว กรุณาลองใหม่อีกครั้ง',
      });
      await loading.edit({ embeds: [embed] }).catch(() => {});
    }
  }
}

module.exports = {
  slipConfigured,
  intents,
  events: { messageCreate: onMessage },
};
