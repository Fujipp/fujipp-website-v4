// src/features/runtime-monitor/index.js
// Runtime Monitor — an ADMIN-ONLY command (`/runtime`) that lists every bot
// instance on the platform with its owner, avatar, and current status, so the
// platform operator can check things from inside their own Discord bot.
//
// Gated strictly to AUTHORIZED_USER_IDS (ctx.config.isAuthorized) — NOT the
// guild's Administrator permission — because it exposes every customer's bot
// and owner. A server admin who isn't the platform operator must not see it.
//
// Status shown is bots.bot_instances.status (a snapshot updated on
// start/stop/restart), not live pm2 state — a crashed bot may still read
// RUNNING here. The web admin panel has true-live pm2 status; live state in
// Discord would need an HTTP call to the backend/runtime (out of scope here).
//
// Config keys: none. Loads only when the 'runtime-monitor' feature is enabled.

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../lib/db');

// Discord allows at most 10 embeds per message.
const EMBEDS_PER_MESSAGE = 10;

// bots.bot_instances.status → embed colour.
const STATUS_COLOR = {
  RUNNING: 0x2e9e73,   // green
  STOPPED: 0x6b7280,   // grey
  CRASHED: 0xd64545,   // red
  SUSPENDED: 0xd64545, // red
  READY: 0x4b9fd6,     // blue
  CREATED: 0x9aa0a6,   // neutral
};

function fmt(ts) {
  return ts ? `<t:${Math.floor(new Date(ts).getTime() / 1000)}:R>` : '—';
}

function ownerLabel(row) {
  return row.display_name || row.username || row.email || row.user_id.slice(0, 8);
}

function botEmbed(row) {
  const embed = new EmbedBuilder()
    .setColor(STATUS_COLOR[row.status] ?? 0x9aa0a6)
    .setTitle(row.name)
    .addFields(
      { name: 'เจ้าของ', value: ownerLabel(row), inline: true },
      { name: 'สถานะ', value: `\`${row.status}\``, inline: true },
      { name: 'เริ่มล่าสุด', value: fmt(row.last_started_at), inline: true },
      { name: 'หยุดล่าสุด', value: fmt(row.last_stopped_at), inline: true },
    )
    .setFooter({ text: `id: ${row.id}` });
  if (row.discord_avatar_url) embed.setThumbnail(row.discord_avatar_url);
  return embed;
}

async function handleRuntime(interaction, ctx) {
  // Platform-operator-only — strict, not guild Administrator.
  if (!ctx.config.isAuthorized(interaction.user.id)) {
    await interaction.reply({ content: 'คำสั่งนี้ใช้ได้เฉพาะผู้ดูแลแพลตฟอร์มเท่านั้น', flags: MessageFlags.Ephemeral }).catch(() => {});
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { rows } = await db.query(
    `SELECT b.id, b.name, b.status, b.discord_avatar_url,
            b.last_started_at, b.last_stopped_at, b.user_id,
            p.display_name, p.username, p.email
       FROM bots.bot_instances b
       JOIN public.profiles p ON p.id = b.user_id
      ORDER BY b.created_at`,
  );

  if (rows.length === 0) {
    await interaction.editReply({ content: 'ยังไม่มีบอทในระบบ' });
    return;
  }

  const embeds = rows.map(botEmbed);

  // First page goes in the deferred reply; the rest as ephemeral follow-ups
  // (each message carries at most 10 embeds).
  for (let i = 0; i < embeds.length; i += EMBEDS_PER_MESSAGE) {
    const chunk = embeds.slice(i, i + EMBEDS_PER_MESSAGE);
    if (i === 0) {
      await interaction.editReply({ content: `รวม ${rows.length} บอท`, embeds: chunk });
    } else {
      await interaction.followUp({ embeds: chunk, flags: MessageFlags.Ephemeral });
    }
  }
}

module.exports = {
  code: 'runtime-monitor',
  name: 'Runtime Monitor',

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('runtime')
        .setDescription('ดูสถานะ runtime ของทุกบอทในแพลตฟอร์ม (เฉพาะผู้ดูแล)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    ];
  },

  handlers: {
    runtime: handleRuntime,
  },
};
