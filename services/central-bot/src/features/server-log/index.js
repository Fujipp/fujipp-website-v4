// src/features/server-log/index.js
// Server Log — a server-wide audit log. Listens to gateway events (messages,
// members, moderation, channels, voice) and posts each as an embed THROUGH A
// WEBHOOK in the configured log channel, not as the bot account, so logging never
// eats the bot's own message budget. Every category has its own on/off toggle.
//
// Config keys (mirror billing.feature_variable_templates 1:1):
//   LOG_ENABLED                   (BOOLEAN)    — master on/off
//   LOG_CHANNEL_ID                (CHANNEL_ID) — DEFAULT channel the webhook posts into
//   LOG_MESSAGE_EVENTS            (BOOLEAN)    — message edit / delete / bulk-delete
//   LOG_MEMBER_EVENTS             (BOOLEAN)    — join / leave / nickname / role change
//   LOG_MODERATION_EVENTS         (BOOLEAN)    — ban / unban / timeout
//   LOG_CHANNEL_EVENTS            (BOOLEAN)    — channel create / delete / update
//   LOG_VOICE_EVENTS              (BOOLEAN)    — voice join / leave / move
//
// Each category may ALSO be routed to its own room via an optional per-category
// channel override; when the override is empty the category falls back to
// LOG_CHANNEL_ID, so a bot with only the default channel set behaves as before:
//   LOG_MESSAGE_CHANNEL_ID, LOG_MEMBER_CHANNEL_ID, LOG_MODERATION_CHANNEL_ID,
//   LOG_CHANNEL_EVENTS_CHANNEL_ID, LOG_VOICE_CHANNEL_ID  (all CHANNEL_ID).
//
// Privileged intents: message + member coverage need Message Content / Server
// Members enabled in the bot's Developer Portal. We only request a privileged
// intent when its category is on, so a bot using only channel/moderation/voice
// logging logs in without them. The embed frame (author/footer/fallback color) is
// configurable via the `log_base` embed slot; per-event accents are built in code.

const { GatewayIntentBits } = require('discord.js');
const { getLogWebhook, WEBHOOK_NAME } = require('./webhook');
const fmt = require('./format');

const SLOT = 'log_base';

const flags = {
  message: (c) => c.bool('LOG_MESSAGE_EVENTS', true),
  member: (c) => c.bool('LOG_MEMBER_EVENTS', true),
  moderation: (c) => c.bool('LOG_MODERATION_EVENTS', true),
  channel: (c) => c.bool('LOG_CHANNEL_EVENTS', true),
  voice: (c) => c.bool('LOG_VOICE_EVENTS', false),
};

// Per-category channel override key. Empty/unset → fall back to LOG_CHANNEL_ID.
const channelKeys = {
  message: 'LOG_MESSAGE_CHANNEL_ID',
  member: 'LOG_MEMBER_CHANNEL_ID',
  moderation: 'LOG_MODERATION_CHANNEL_ID',
  channel: 'LOG_CHANNEL_EVENTS_CHANNEL_ID',
  voice: 'LOG_VOICE_CHANNEL_ID',
};

// Only request a privileged intent when its category is enabled (login fails with
// "disallowed intents" if a privileged intent is requested but not portal-enabled).
function intents(config) {
  const set = new Set([GatewayIntentBits.Guilds]); // channel events ride on Guilds
  if (flags.message(config)) {
    set.add(GatewayIntentBits.GuildMessages);
    set.add(GatewayIntentBits.MessageContent);
  }
  if (flags.member(config) || flags.moderation(config)) {
    set.add(GatewayIntentBits.GuildMembers); // join/leave + timeout via memberUpdate
  }
  if (flags.moderation(config)) set.add(GatewayIntentBits.GuildModeration);
  if (flags.voice(config)) set.add(GatewayIntentBits.GuildVoiceStates);
  return [...set];
}

function vars(part) {
  return { event: part.title || '', time: `<t:${Math.floor(Date.now() / 1000)}:F>`, actor: '' };
}

function fillVars(text, v) {
  return typeof text === 'string'
    ? text.replace(/\{\{(\w+)\}\}/g, (_, k) => (v[k] != null ? String(v[k]) : ''))
    : text;
}

// Compose the per-event part onto the configurable frame and post via the webhook.
async function emit(client, ctx, channelId, part) {
  if (!part) return; // builder decided this event isn't worth logging
  let frame = {};
  try {
    frame = (await ctx.services.embeds.getConfig(SLOT)) || {};
  } catch { /* fall back to bare embed */ }

  const v = vars(part);
  const embed = {
    color: part.color ?? (typeof frame.color === 'number' ? frame.color : undefined),
    title: part.title,
    description: part.description,
    fields: part.fields,
    timestamp: new Date().toISOString(),
  };
  if (frame.author && frame.author.name) {
    embed.author = { name: fillVars(frame.author.name, v), icon_url: frame.author.icon_url || undefined };
  }
  if (frame.footer && frame.footer.text) {
    embed.footer = { text: fillVars(frame.footer.text, v), icon_url: frame.footer.icon_url || undefined };
  }

  const hook = await getLogWebhook(client, channelId, ctx.log);
  if (!hook) return;
  await hook.send({ username: WEBHOOK_NAME, embeds: [embed] }).catch((err) => {
    ctx.log?.(`server-log: webhook send failed: ${err.message}`);
  });
}

// Resolve which channel a given category logs into: its own override if set, else
// the default LOG_CHANNEL_ID.
function logChannelFor(ctx, category) {
  const override = ctx.config.get(channelKeys[category]);
  return override || ctx.config.get('LOG_CHANNEL_ID') || null;
}

// Gate shared by every listener: master switch on, has a guild, and a channel is
// resolved for this category (its override or the default). Returns the resolved
// log channel id, or null when logging should be skipped.
function gate(ctx, guild, category) {
  if (!ctx.config.bool('LOG_ENABLED', false)) return null;
  if (!guild) return null;
  return logChannelFor(ctx, category);
}

const events = {
  // ── Messages ──
  async messageDelete(message, ctx) {
    if (!flags.message(ctx.config)) return;
    const logChannelId = gate(ctx, message.guild, 'message');
    if (!logChannelId || message.channelId === logChannelId) return;
    if (message.author?.bot || message.webhookId) return; // skip bot/webhook noise
    await emit(message.client, ctx, logChannelId, fmt.messageDelete(message));
  },
  async messageUpdate(oldMessage, newMessage, ctx) {
    if (!flags.message(ctx.config)) return;
    const logChannelId = gate(ctx, newMessage.guild, 'message');
    if (!logChannelId || newMessage.channelId === logChannelId) return;
    if (newMessage.author?.bot || newMessage.webhookId) return;
    if (oldMessage.content === newMessage.content) return; // embed/attachment-only edit
    await emit(newMessage.client, ctx, logChannelId, fmt.messageUpdate(oldMessage, newMessage));
  },
  async messageDeleteBulk(messages, channel, ctx) {
    if (!flags.message(ctx.config)) return;
    const logChannelId = gate(ctx, channel?.guild, 'message');
    if (!logChannelId || channel?.id === logChannelId) return;
    await emit(channel.client, ctx, logChannelId, fmt.messageDeleteBulk(messages, channel));
  },

  // ── Members ──
  async guildMemberAdd(member, ctx) {
    if (!flags.member(ctx.config)) return;
    const logChannelId = gate(ctx, member.guild, 'member');
    if (!logChannelId) return;
    await emit(member.client, ctx, logChannelId, fmt.memberAdd(member));
  },
  async guildMemberRemove(member, ctx) {
    if (!flags.member(ctx.config)) return;
    const logChannelId = gate(ctx, member.guild, 'member');
    if (!logChannelId) return;
    await emit(member.client, ctx, logChannelId, fmt.memberRemove(member));
  },
  // One listener serves both member (nick/roles) and moderation (timeout) toggles —
  // each emits to its own resolved channel so they can land in different rooms.
  async guildMemberUpdate(oldMember, newMember, ctx) {
    if (!ctx.config.bool('LOG_ENABLED', false) || !newMember.guild) return;
    if (flags.member(ctx.config)) {
      const memberChannel = logChannelFor(ctx, 'member');
      if (memberChannel) {
        await emit(newMember.client, ctx, memberChannel, fmt.memberUpdate(oldMember, newMember));
      }
    }
    if (flags.moderation(ctx.config)) {
      const modChannel = logChannelFor(ctx, 'moderation');
      if (modChannel) {
        await emit(newMember.client, ctx, modChannel, fmt.timeout(oldMember, newMember));
      }
    }
  },

  // ── Moderation ──
  async guildBanAdd(ban, ctx) {
    if (!flags.moderation(ctx.config)) return;
    const logChannelId = gate(ctx, ban.guild, 'moderation');
    if (!logChannelId) return;
    await emit(ban.client, ctx, logChannelId, fmt.banAdd(ban));
  },
  async guildBanRemove(ban, ctx) {
    if (!flags.moderation(ctx.config)) return;
    const logChannelId = gate(ctx, ban.guild, 'moderation');
    if (!logChannelId) return;
    await emit(ban.client, ctx, logChannelId, fmt.banRemove(ban));
  },

  // ── Channels (ride on the Guilds intent) ──
  async channelCreate(channel, ctx) {
    if (!flags.channel(ctx.config)) return;
    const logChannelId = gate(ctx, channel.guild, 'channel');
    if (!logChannelId) return;
    await emit(channel.client, ctx, logChannelId, fmt.channelCreate(channel));
  },
  async channelDelete(channel, ctx) {
    if (!flags.channel(ctx.config)) return;
    const logChannelId = gate(ctx, channel.guild, 'channel');
    if (!logChannelId) return;
    await emit(channel.client, ctx, logChannelId, fmt.channelDelete(channel));
  },
  async channelUpdate(oldChannel, newChannel, ctx) {
    if (!flags.channel(ctx.config)) return;
    const logChannelId = gate(ctx, newChannel.guild, 'channel');
    if (!logChannelId) return;
    await emit(newChannel.client, ctx, logChannelId, fmt.channelUpdate(oldChannel, newChannel));
  },

  // ── Voice ──
  async voiceStateUpdate(oldState, newState, ctx) {
    if (!flags.voice(ctx.config)) return;
    const logChannelId = gate(ctx, newState.guild, 'voice');
    if (!logChannelId) return;
    await emit(newState.client, ctx, logChannelId, fmt.voiceUpdate(oldState, newState));
  },
};

module.exports = {
  code: 'server-log',
  name: 'Server Log',
  intents,
  events,
};
