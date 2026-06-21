// src/features/server-log/webhook.js
// Find-or-create the webhook the server-log feature posts through. Posting via a
// webhook (not the bot account) is the whole point — it keeps logging traffic off
// the bot's own message budget and lets the log carry its own name/avatar.
//
// The webhook is resolved lazily and cached in-memory per channel. If the admin
// changes LOG_CHANNEL_ID, saving config auto-restarts the bot, so the cache starts
// empty against the new channel on the next boot — no invalidation needed here.

const { ChannelType, PermissionFlagsBits } = require('discord.js');

const WEBHOOK_NAME = 'Server Log';
const TEXT_TYPES = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement]);

// channelId -> { hook, at } | { hook: null, at }  (null caches a failed resolve so
// we don't hammer fetchWebhooks on every event when perms/channel are wrong).
const cache = new Map();
const FAIL_TTL_MS = 60_000;

async function resolve(client, channelId, log) {
  const channel = client.channels.cache.get(channelId)
    || (await client.channels.fetch(channelId).catch(() => null));
  if (!channel || !TEXT_TYPES.has(channel.type)) {
    log?.(`server-log: LOG_CHANNEL_ID ${channelId} is not a text channel`);
    return null;
  }

  const me = await channel.guild.members.fetchMe().catch(() => null);
  if (!me || !channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageWebhooks)) {
    log?.(`server-log: missing Manage Webhooks permission in ${channelId}`);
    return null;
  }

  // Reuse a token-bearing webhook this bot already created here; else make one.
  const existing = await channel.fetchWebhooks().catch(() => null);
  const mine = existing?.find(
    (w) => w.owner?.id === client.user?.id && w.name === WEBHOOK_NAME && w.token,
  );
  if (mine) return mine;

  return channel
    .createWebhook({ name: WEBHOOK_NAME, reason: 'Server Log feature — audit logging' })
    .catch((err) => {
      log?.(`server-log: createWebhook failed in ${channelId}: ${err.message}`);
      return null;
    });
}

// Resolve (and cache) the log webhook for channelId. Returns a discord.js Webhook
// (callable via .send) or null when it can't be created/reused.
async function getLogWebhook(client, channelId, log) {
  if (!channelId) return null;
  const hit = cache.get(channelId);
  if (hit && (hit.hook || Date.now() - hit.at < FAIL_TTL_MS)) return hit.hook;

  const hook = await resolve(client, channelId, log);
  cache.set(channelId, { hook, at: Date.now() });
  return hook;
}

module.exports = { getLogWebhook, WEBHOOK_NAME };
