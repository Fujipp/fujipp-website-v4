// src/features/review-credit/index.js
// Review counter — port of the legacy Aka Shop (discord-bot-003) review bot.
//
// On every member message in the configured review channel: bump a persistent
// counter, react with configured emojis, optionally grant a "reviewed" role,
// rename the channel to the configured template (rate-limited to Discord's
// 2-renames-per-10-min), and reply with a random configured message (deleting the
// previous reply first). Counter state lives in shop.review_credit_state.
//
// Admin commands:
//   /checkcredit — recount every member message in the channel and sync the counter
//   /recredit    — re-apply reactions + reply to the latest message (counter unchanged)
//
// Config keys: REVIEW_CHANNEL_ID, REVIEW_CHANNEL_NAME_TEMPLATE, REVIEW_REPLY_MESSAGES
// (JSON array), REVIEW_REACTIONS (JSON array), REVIEW_DELETE_OLD_REPLY,
// REVIEW_DEFAULT_ROLE_ID.
//
// Granting a role to a member who is not in the event payload needs the privileged
// SERVER MEMBERS intent — only requested when REVIEW_DEFAULT_ROLE_ID is set.

const { SlashCommandBuilder, GatewayIntentBits } = require('discord.js');
const { isAdmin } = require('../../lib/perms');
const { makeReviewStore } = require('./store');
const { ChannelRenameLimiter } = require('./rate-limiter');

const renameLimiter = new ChannelRenameLimiter(2, 600000);
const DEFAULT_NAME_TEMPLATE = '꒰💯꒱┆review 〻{count}';

// ─── Config helpers ──────────────────────────────────────────────────────────
const channelId = (ctx) => ctx.config.get('REVIEW_CHANNEL_ID');
const defaultRoleId = (ctx) => ctx.config.get('REVIEW_DEFAULT_ROLE_ID');
const deleteOldReply = (ctx) => ctx.config.bool('REVIEW_DELETE_OLD_REPLY', true);

function nameForCount(ctx, count) {
  const template = ctx.config.get('REVIEW_CHANNEL_NAME_TEMPLATE', DEFAULT_NAME_TEMPLATE);
  return String(template).replace(/\{count\}/g, count);
}

// JSON-array config that tolerates a bare string or a comma-less single value.
function stringArray(ctx, key) {
  const parsed = ctx.config.json(key, null);
  if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
  const raw = String(ctx.config.get(key, '')).trim();
  return raw ? [raw] : [];
}

const reactions = (ctx) => stringArray(ctx, 'REVIEW_REACTIONS');
const replyMessages = (ctx) => stringArray(ctx, 'REVIEW_REPLY_MESSAGES');

function pickReply(ctx) {
  const messages = replyMessages(ctx);
  if (messages.length === 0) return '';
  return messages[Math.floor(Math.random() * messages.length)];
}

// Lazily created per-process store, scoped to this bot (subject).
let store = null;
function getStore(ctx) {
  if (!store) store = makeReviewStore(ctx.config.subjectId);
  return store;
}

// ─── Shared actions ──────────────────────────────────────────────────────────
async function applyReactions(message, ctx) {
  const list = reactions(ctx);
  if (list.length === 0) return false;
  const results = await Promise.allSettled(list.map((emoji) => message.react(emoji)));
  return results.some((r) => r.status === 'fulfilled');
}

async function maybeAssignRole(message, ctx) {
  const roleId = defaultRoleId(ctx);
  if (!roleId || !message.guild) return;
  try {
    const member = message.member || (await message.guild.members.fetch(message.author.id));
    if (member && !member.roles.cache.has(roleId)) {
      const role = await message.guild.roles.fetch(roleId).catch(() => null);
      if (role) await member.roles.add(role);
    }
  } catch (err) {
    ctx.log(`review-credit role assign failed: ${err.message}`);
  }
}

// Rename the channel to match the counter, respecting Discord's rename limit.
async function renameToCount(channel, count, ctx) {
  const target = nameForCount(ctx, count);
  if (channel.name === target) return { ok: true, target };
  const result = await renameLimiter.executeIfAllowed(channel.id, () => channel.setName(target));
  return { ok: result.executed, target, rateLimited: result.reason === 'rate_limited' };
}

// Delete the previous bot reply (if configured) and reply to `target`, then persist
// the new reply id. `target` is the message to reply under.
async function deleteOldAndReply(channel, target, ctx) {
  const content = pickReply(ctx).trim();
  if (!content) return false;

  const st = getStore(ctx);
  if (deleteOldReply(ctx)) {
    const { lastBotMessageId } = await st.getState(channel.id);
    if (lastBotMessageId) {
      try {
        const old = await channel.messages.fetch(lastBotMessageId);
        if (old?.author?.id === channel.client.user.id) await old.delete();
      } catch {
        // already gone
      }
    }
  }

  // Prefer a reply (shows under the review). message.reply() needs READ_MESSAGE_HISTORY,
  // so if that's missing fall back to a plain channel.send — the thank-you still posts as
  // long as the bot has Send Messages.
  let sent = null;
  try {
    sent = await target.reply({ content });
  } catch (replyErr) {
    try {
      sent = await channel.send({ content });
    } catch (sendErr) {
      ctx.log(`review-credit reply failed (${replyErr.message}) and send failed (${sendErr.message}) — check the bot's Send Messages / Read Message History permission in the review channel`);
    }
  }
  if (sent) {
    await st.setLastMessageId(channel.id, sent.id);
    return true;
  }
  return false;
}

async function latestUserMessage(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  return messages.find((m) => !m.author?.bot) || null;
}

// ─── messageCreate ───────────────────────────────────────────────────────────
async function onMessage(message, ctx) {
  if (message.author?.bot) return;
  const cfgChannel = channelId(ctx);
  if (!cfgChannel || message.channelId !== cfgChannel) return;

  const count = await getStore(ctx).increment(cfgChannel);
  await applyReactions(message, ctx);
  await maybeAssignRole(message, ctx);
  await renameToCount(message.channel, count, ctx);
  await deleteOldAndReply(message.channel, message, ctx);
}

// ─── /checkcredit ────────────────────────────────────────────────────────────
async function countUserMessages(channel, onProgress) {
  let total = 0;
  let before;
  let batch = 0;
  for (;;) {
    const options = { limit: 100 };
    if (before) options.before = before;
    const messages = await channel.messages.fetch(options);
    if (!messages.size) break;
    total += messages.filter((m) => !m.author?.bot).size;
    batch += 1;
    if (onProgress && batch % 5 === 0) await onProgress(total);
    if (messages.size < 100) break;
    before = messages.last().id;
  }
  return total;
}

async function resolveChannel(interaction, ctx) {
  const cfgChannel = channelId(ctx);
  if (!cfgChannel) {
    await interaction.reply({ content: '❌ ยังไม่ได้ตั้งค่าห้องรีวิว (REVIEW_CHANNEL_ID)', ephemeral: true });
    return null;
  }
  const channel = await interaction.client.channels.fetch(cfgChannel).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: '❌ ห้องรีวิวที่ตั้งค่าไว้ไม่ถูกต้อง', ephemeral: true });
    return null;
  }
  return channel;
}

async function handleCheckCredit(interaction, ctx) {
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }
  const channel = await resolveChannel(interaction, ctx);
  if (!channel) return;

  await interaction.reply({ content: '⏳ กำลังตรวจนับข้อความในห้องรีวิว...', ephemeral: true });

  const total = await countUserMessages(channel, async (count) => {
    await interaction.editReply({ content: `⏳ กำลังตรวจนับ... (${count} ข้อความ)` }).catch(() => {});
  });

  await getStore(ctx).setCount(channel.id, total);
  const rename = await renameToCount(channel, total, ctx);

  const lines = [`✅ ซิงค์ตัวนับรีวิวเป็น \`${total}\` ตามจำนวนข้อความสมาชิก`];
  lines.push(rename.ok ? `🔄 ชื่อห้อง: ${rename.target}` : '⚠️ เปลี่ยนชื่อห้องโดน rate limit จะอัปเดตในข้อความถัดไป');
  await interaction.editReply({ content: lines.join('\n') });
}

// ─── /recredit ───────────────────────────────────────────────────────────────
async function handleReCredit(interaction, ctx) {
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }
  const channel = await resolveChannel(interaction, ctx);
  if (!channel) return;

  await interaction.reply({ content: '⏳ กำลังรีเฟรชรีแอคชันและรีพายล่าสุด...', ephemeral: true });

  const target = await latestUserMessage(channel);
  const { messageCount } = await getStore(ctx).getState(channel.id);
  const rename = await renameToCount(channel, messageCount, ctx);

  let reacted = false;
  let replied = false;
  if (target) {
    reacted = await applyReactions(target, ctx);
    replied = await deleteOldAndReply(channel, target, ctx);
  }

  const lines = [
    `📊 ตัวนับปัจจุบัน: \`${messageCount}\``,
    rename.ok ? `✅ ชื่อห้อง: ${rename.target}` : '⚠️ เปลี่ยนชื่อห้องโดน rate limit',
    reacted ? '✅ กดรีแอคชันแล้ว' : 'ℹ️ ไม่มีรีแอคชัน',
    replied ? '✅ ส่งรีพายแล้ว' : 'ℹ️ ไม่มีรีพาย',
  ];
  if (!target) lines.push('ℹ️ ไม่พบข้อความสมาชิกให้รีแอค/รีพาย');
  await interaction.editReply({ content: lines.join('\n') });
}

// ─── onReady: one-time full count ────────────────────────────────────────────
// On first start (no counter row yet — also the state after the web "recount"
// resets it), count every member message in the review channel so the counter
// starts from the real total instead of 0. Runs once; subsequent messages just
// increment.
async function onReady(client, ctx) {
  const cfgChannel = channelId(ctx);
  if (!cfgChannel) return;
  const store = getStore(ctx);
  try {
    if (await store.exists(cfgChannel)) return;
    const channel = await client.channels.fetch(cfgChannel).catch(() => null);
    if (!channel || !channel.isTextBased()) return;
    const total = await countUserMessages(channel);
    await store.setCount(cfgChannel, total);
    await renameToCount(channel, total, ctx);
    ctx.log(`review-credit: initialized counter for ${cfgChannel} = ${total}`);
  } catch (err) {
    ctx.log(`review-credit initial count failed: ${err.message}`);
  }
}

// ─── Intents ─────────────────────────────────────────────────────────────────
// GuildMessages is needed to receive messageCreate; GuildMembers (privileged) is
// only needed to grant the reviewer role to a member not in the event payload.
function intents(config) {
  const set = [GatewayIntentBits.GuildMessages];
  if (config.get('REVIEW_DEFAULT_ROLE_ID')) set.push(GatewayIntentBits.GuildMembers);
  return set;
}

module.exports = {
  code: 'review-credit',
  name: 'Review Credit',
  intents,

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('checkcredit')
        .setDescription('นับข้อความสมาชิกทั้งห้องรีวิวแล้วซิงค์ตัวนับ (แอดมินเท่านั้น)')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('recredit')
        .setDescription('รีเฟรชรีแอคชัน/รีพายล่าสุดโดยไม่เปลี่ยนตัวนับ (แอดมินเท่านั้น)')
        .toJSON(),
    ];
  },

  handlers: {
    checkcredit: handleCheckCredit,
    recredit: handleReCredit,
  },

  onReady,

  events: {
    messageCreate: onMessage,
  },
};
