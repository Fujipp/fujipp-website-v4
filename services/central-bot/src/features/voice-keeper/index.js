// src/features/voice-keeper/index.js
// Voice Keeper — port of the legacy IDAXD Shop (discord-bot-002) /join /leave.
// Keeps the bot sitting in a voice channel 24/7: it joins on startup (when
// configured), rejoins automatically if it's kicked/moved/disconnected, and a
// 30-minute heartbeat repairs the connection if it ever drops silently.
//
// Two ways to drive it (either works):
//   1. SETTINGS — set VOICE_CHANNEL_ID + VOICE_KEEP_ENABLED. Saving config
//      auto-restarts the bot, which then joins on the next ClientReady.
//   2. COMMANDS — /join [channel] makes the bot enter (and stay in) a channel
//      live; /leave makes it exit and stops the keep loop. These live overrides
//      are in-memory: on the next restart the bot falls back to the SETTINGS.
//
// Config keys (mirror billing.feature_variable_templates 1:1):
//   VOICE_CHANNEL_ID   (CHANNEL_ID) — the voice channel to camp in
//   VOICE_KEEP_ENABLED (BOOLEAN)    — join automatically on startup

const { SlashCommandBuilder, GatewayIntentBits, ChannelType, PermissionFlagsBits, Events } = require('discord.js');
const {
  joinVoiceChannel,
  getVoiceConnection,
  entersState,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const { isAdmin } = require('../../lib/perms');

const REJOIN_COOLDOWN_MS = 5_000;
const HEARTBEAT_MS = 30 * 60 * 1000; // 30 นาที
const READY_TIMEOUT_MS = 7_500;

// Live keep-state for THIS bot process (single subject). channelId implies the
// guild — we resolve it from the client. Initialised from config on ready, then
// mutated by /join and /leave.
const keep = { enabled: false, channelId: null };
const rejoinCooldownAt = new Map(); // guildId -> ts ms

const VOICE_TYPES = [ChannelType.GuildVoice, ChannelType.GuildStageVoice];

// Resolve a voice channel by id (cache first, then fetch).
async function resolveVoiceChannel(client, channelId) {
  if (!channelId) return null;
  const channel = client.channels.cache.get(channelId)
    || (await client.channels.fetch(channelId).catch(() => null));
  if (!channel || !VOICE_TYPES.includes(channel.type)) return null;
  return channel;
}

// Join (or re-join) a voice channel, tearing down any existing connection first
// so we never stack two on one guild. Best-effort: if it can't reach Ready, the
// heartbeat / VoiceStateUpdate rejoin will keep retrying.
async function safeJoin(client, channelId, log) {
  const channel = await resolveVoiceChannel(client, channelId);
  if (!channel) return;

  const guild = channel.guild;
  const me = await guild.members.fetchMe().catch(() => null);
  if (!me) return;
  if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.Connect)) {
    log?.(`voice-keeper: missing Connect permission for ${channel.id}`);
    return;
  }

  try { getVoiceConnection(guild.id)?.destroy(); } catch { /* no-op */ }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, READY_TIMEOUT_MS);
  } catch {
    // Not Ready in time — leave the connection in place; the heartbeat repairs it.
  }
}

// Rejoin the kept channel, throttled per guild so a burst of voice-state events
// (kick → move → disconnect) doesn't spawn overlapping joins.
function scheduleRejoin(client, channelId, guildId, log) {
  const now = Date.now();
  if (now - (rejoinCooldownAt.get(guildId) ?? 0) < REJOIN_COOLDOWN_MS) return;
  rejoinCooldownAt.set(guildId, now);
  safeJoin(client, channelId, log).catch(() => {});
}

// Voice connections + receiving VoiceStateUpdate need the voice-states intent.
// It is NOT privileged, so request it unconditionally (feature only loads when enabled).
function intents() {
  return [GatewayIntentBits.GuildVoiceStates];
}

async function onReady(client, ctx) {
  if (ctx.config.bool('VOICE_KEEP_ENABLED', false)) {
    const channelId = ctx.config.get('VOICE_CHANNEL_ID');
    if (channelId) {
      keep.enabled = true;
      keep.channelId = String(channelId);
      const channel = await resolveVoiceChannel(client, keep.channelId);
      if (channel) scheduleRejoin(client, keep.channelId, channel.guild.id, ctx.log);
    }
  }

  // Heartbeat: if the keep is on but we're not connected to the right channel, rejoin.
  setInterval(async () => {
    if (!keep.enabled || !keep.channelId) return;
    const channel = await resolveVoiceChannel(client, keep.channelId);
    if (!channel) return;
    const conn = getVoiceConnection(channel.guild.id);
    if (!conn || conn.joinConfig.channelId !== keep.channelId) {
      scheduleRejoin(client, keep.channelId, channel.guild.id, ctx.log);
    }
  }, HEARTBEAT_MS).unref?.();

  // If the bot gets kicked / moved / disconnected, drag it back to the kept channel.
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (!keep.enabled || !keep.channelId) return;
    const changedUserId = newState.id ?? oldState.id;
    if (changedUserId !== client.user?.id) return;

    const disconnected = !newState.channelId && !!oldState.channelId;
    const movedAway = !!newState.channelId && newState.channelId !== keep.channelId;
    if (disconnected || movedAway) {
      scheduleRejoin(client, keep.channelId, newState.guild.id, ctx.log);
    }
  });
}

async function handleJoin(interaction, ctx) {
  if (!interaction.guild) {
    await interaction.reply({ content: 'ใช้ในเซิร์ฟเวอร์เท่านั้น', ephemeral: true });
    return;
  }
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }

  const optionChannel = interaction.options.getChannel('channel');
  const memberVoiceId = interaction.member?.voice?.channelId;
  const targetChannelId = optionChannel?.id ?? memberVoiceId;
  if (!targetChannelId) {
    await interaction.reply({ content: '❌ โปรดอยู่ในห้องเสียง หรือระบุห้องเสียงที่จะให้บอทเข้า', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  await safeJoin(interaction.client, targetChannelId, ctx.log);

  const conn = getVoiceConnection(interaction.guild.id);
  if (conn?.joinConfig?.channelId === targetChannelId) {
    keep.enabled = true;
    keep.channelId = String(targetChannelId);
    await interaction.editReply(`✅ เข้า <#${targetChannelId}> แล้ว และจะอยู่ 24/7 (ถ้าหลุดจะกลับเข้าห้องเดิมอัตโนมัติ)`);
  } else {
    await interaction.editReply(`❌ เข้า <#${targetChannelId}> ไม่สำเร็จ — ตรวจสิทธิ์ Connect ของบอทในห้องนั้น`);
  }
}

async function handleLeave(interaction, ctx) {
  if (!interaction.guild) {
    await interaction.reply({ content: 'ใช้ในเซิร์ฟเวอร์เท่านั้น', ephemeral: true });
    return;
  }
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }

  keep.enabled = false;
  keep.channelId = null;
  try { getVoiceConnection(interaction.guild.id)?.destroy(); } catch { /* no-op */ }
  await interaction.reply({ content: '👋 ออกจากห้องเสียงแล้ว และปิดโหมดอยู่ห้อง 24/7', ephemeral: true });
}

module.exports = {
  code: 'voice-keeper',
  name: 'Voice Keeper',
  intents,
  onReady,

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('join')
        .setDescription('ให้บอทเข้าห้องเสียงและอยู่ 24/7 (เว้นว่าง = ห้องที่คุณอยู่)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption((o) => o
          .setName('channel')
          .setDescription('ห้องเสียง (ว่าง = ใช้ห้องที่คุณอยู่)')
          .addChannelTypes(...VOICE_TYPES)
          .setRequired(false))
        .toJSON(),
      new SlashCommandBuilder()
        .setName('leave')
        .setDescription('ให้บอทออกจากห้องเสียงและปิดโหมดอยู่ห้อง 24/7')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON(),
    ];
  },

  handlers: { join: handleJoin, leave: handleLeave },
};
