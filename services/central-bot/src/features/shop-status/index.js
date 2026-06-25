// src/features/shop-status/index.js
// Shop Status — port of the legacy discord-bot-002-idaxdshop /status command.
// An admin sets the store's status with /status open | close | busy. For each status
// the bot:
//   1. announces it into STATUS_ANNOUNCE_CHANNEL_ID (or the current channel), and
//   2. renames STATUS_TARGET_CHANNEL_ID to that status's channel name.
//
// The announcement is edited in place: the bot remembers the message it last posted in
// the announce channel (shop.shop_status_messages, our database via lib/shop-store-db)
// and edits it on the next /status, so toggling open/close doesn't spam the channel. If
// the old message is gone (deleted) it posts a fresh one and remembers that instead.
//
// Output is configurable per the STATUS_OUTPUT_MODE enum:
//   EMBED → the status's Embed Designer slot (status_open/close/busy)
//   TEXT  → the plain STATUS_*_TEXT content
//   BOTH  → both (default)
//
// Config keys (mirror billing.feature_variable_templates 1:1 — injected as env per subject):
//   STATUS_TARGET_CHANNEL_ID    (CHANNEL_ID) — channel renamed to reflect the status
//   STATUS_ANNOUNCE_CHANNEL_ID  (CHANNEL_ID) — channel the announcement is posted into
//   STATUS_OUTPUT_MODE          (ENUM)       — EMBED | TEXT | BOTH
//   STATUS_OPEN_CHANNEL_NAME    (STRING)     — target channel name when open
//   STATUS_CLOSED_CHANNEL_NAME  (STRING)     — target channel name when closed
//   STATUS_BUSY_CHANNEL_NAME    (STRING)     — target channel name when busy
//   STATUS_OPEN_TEXT            (TEXT)       — plain-text announcement when open
//   STATUS_CLOSED_TEXT          (TEXT)       — plain-text announcement when closed
//   STATUS_BUSY_TEXT            (TEXT)       — plain-text announcement when busy
//
// Embeds are edited in the Embed Designer (slots status_open/close/busy); {{time}} is
// substituted with the current Asia/Bangkok timestamp.

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../../lib/perms');
const { getStatusStore } = require('../../lib/shop-store-db');

// Per-status metadata: which slot/config keys to read and the default channel name +
// fallback text used when the admin hasn't configured one.
const STATUSES = {
  open: {
    slot: 'status_open',
    nameKey: 'STATUS_OPEN_CHANNEL_NAME',
    textKey: 'STATUS_OPEN_TEXT',
    defaultName: '🟢ㆍสถานะㆍร้านเปิด',
    defaultText: '🟢 ร้านเปิดแล้ว ยินดีให้บริการครับ',
    ok: '✅ ตั้งสถานะเป็น "ร้านเปิด" เรียบร้อย',
  },
  close: {
    slot: 'status_close',
    nameKey: 'STATUS_CLOSED_CHANNEL_NAME',
    textKey: 'STATUS_CLOSED_TEXT',
    defaultName: '🔴ㆍสถานะㆍร้านปิด',
    defaultText: '🔴 ร้านปิดแล้ว ไว้กลับมาเปิดใหม่นะครับ',
    ok: '🛑 ตั้งสถานะเป็น "ร้านปิด" เรียบร้อย',
  },
  busy: {
    slot: 'status_busy',
    nameKey: 'STATUS_BUSY_CHANNEL_NAME',
    textKey: 'STATUS_BUSY_TEXT',
    defaultName: '🟡ㆍสถานะㆍไม่ว่าง',
    defaultText: '🟡 ตอนนี้ไม่ว่าง ตอบกลับช้าหน่อยนะครับ',
    ok: '🟡 ตั้งสถานะเป็น "ไม่ว่าง" เรียบร้อย',
  },
};

const VALID_MODES = new Set(['EMBED', 'TEXT', 'BOTH']);

function isTextSendable(ch) {
  return !!ch && 'send' in ch && typeof ch.send === 'function';
}

function thNow() {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok', hour12: false,
  }).format(new Date());
}

// Resolve a channel id to a channel object (cache then fetch), or null.
async function resolveChannel(client, channelId) {
  if (!channelId) return null;
  return client.channels.cache.get(String(channelId))
    || (await client.channels.fetch(String(channelId)).catch(() => null));
}

// Rename the target channel to the status's name (best-effort; needs ManageChannels and
// is rate-limited by Discord to ~2 renames per 10 min, so a rapid toggle may no-op).
async function renameTarget(client, ctx, meta) {
  const targetId = ctx.config.get('STATUS_TARGET_CHANNEL_ID');
  if (!targetId) return;
  const ch = await resolveChannel(client, targetId);
  if (!ch || !('setName' in ch) || !ch.guild) return;
  const newName = String(ctx.config.get(meta.nameKey, meta.defaultName) || meta.defaultName).trim();
  if (!newName || ch.name === newName) return;
  try {
    const me = await ch.guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) return;
    await ch.setName(newName).catch(() => {});
  } catch {
    /* best-effort */
  }
}

// Build the message payload for a status per STATUS_OUTPUT_MODE. Always yields at least
// one visible element so .send()/.edit() can't throw on an empty message.
async function buildPayload(ctx, key, meta) {
  const mode = String(ctx.config.get('STATUS_OUTPUT_MODE', 'BOTH')).toUpperCase();
  const useMode = VALID_MODES.has(mode) ? mode : 'BOTH';

  const payload = { allowedMentions: { parse: [] } };

  if (useMode === 'EMBED' || useMode === 'BOTH') {
    payload.embeds = [await ctx.services.embeds.renderEmbed(meta.slot, { time: thNow() })];
  }
  if (useMode === 'TEXT' || useMode === 'BOTH') {
    const text = String(ctx.config.get(meta.textKey, '') || '').trim();
    payload.content = (text || meta.defaultText).slice(0, 2000);
  }
  // EMBED-only with (defensively) no embed → fall back to the text line.
  if (!payload.embeds && !payload.content) payload.content = meta.defaultText;
  return payload;
}

// Post/edit the announcement in the announce channel, remembering its message id so the
// next /status edits the same message instead of posting a new one.
async function announce(ctx, channel, key, payload) {
  const store = getStatusStore(ctx.config.subjectId);
  const prev = await store.get(channel.id).catch(() => null);

  if (prev && prev.messageId) {
    const msg = await channel.messages.fetch(prev.messageId).catch(() => null);
    if (msg) {
      await msg.edit(payload);
      await store.set(channel.id, msg.id, key).catch(() => {});
      return msg;
    }
  }

  const sent = await channel.send(payload);
  await store.set(channel.id, sent.id, key).catch(() => {});
  return sent;
}

async function handleStatus(interaction, ctx) {
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }
  if (!interaction.guild) {
    await interaction.reply({ content: '❌ ใช้คำสั่งนี้ได้เฉพาะในกิลด์ครับ', ephemeral: true });
    return;
  }

  const key = interaction.options.getSubcommand(true);
  const meta = STATUSES[key];
  if (!meta) { await interaction.reply({ content: 'คำสั่งไม่ถูกต้อง', ephemeral: true }); return; }

  await interaction.deferReply({ ephemeral: true });

  // Announce channel: configured one, else the channel the command was run in.
  const announceId = ctx.config.get('STATUS_ANNOUNCE_CHANNEL_ID');
  const announceChannel = announceId
    ? await resolveChannel(interaction.client, announceId)
    : interaction.channel;

  if (!isTextSendable(announceChannel) || !('messages' in announceChannel)) {
    await interaction.editReply('❌ ส่งประกาศไม่ได้ — ตั้งห้องประกาศ (STATUS_ANNOUNCE_CHANNEL_ID) หรือใช้คำสั่งในห้องที่บอทส่งข้อความได้');
    return;
  }

  // Rename the target channel first (best-effort), then post/edit the announcement.
  await renameTarget(interaction.client, ctx, meta);

  try {
    const payload = await buildPayload(ctx, key, meta);
    const msg = await announce(ctx, announceChannel, key, payload);
    await interaction.editReply(`${meta.ok}\nประกาศที่: ${msg.url}`);
  } catch (err) {
    console.error('[central-bot] shop-status announce failed:', err.message);
    await interaction.editReply('❌ ประกาศไม่สำเร็จ — ตรวจสอบสิทธิ์บอทในห้องประกาศ');
  }
}

module.exports = {
  code: 'shop-status',
  name: 'Shop Status',

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('status')
        .setDescription('ตั้งสถานะร้าน (ประกาศ + เปลี่ยนชื่อห้อง)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((s) => s.setName('open').setDescription('ประกาศ: ร้านเปิด'))
        .addSubcommand((s) => s.setName('close').setDescription('ประกาศ: ร้านปิด'))
        .addSubcommand((s) => s.setName('busy').setDescription('ประกาศ: ไม่ว่าง'))
        .toJSON(),
    ];
  },

  handlers: {
    status: handleStatus,
  },
};
