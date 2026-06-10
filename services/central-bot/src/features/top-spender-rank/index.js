// src/features/top-spender-rank/index.js
// Top-spender leaderboard + role rewards — port of the legacy Kanom /top.
// /top rebuilds the reward roles from the lifetime top-up leaderboard
// (shop.member_wallets.total_topup_satang): rank roles (top 1 / top 10) and
// milestone roles by accumulated baht. Requires wallet-topup.
//
// Managing roles across the whole guild needs the privileged SERVER MEMBERS
// intent — enable it in the Discord Dev Portal; we only request it when a
// reward role is actually configured.
//
// Config keys: TOP_SPENDER_TOP1_ROLE_ID, TOP_SPENDER_TOP10_ROLE_ID,
// TOP_SPENDER_MILESTONE_ROLES (JSON [{threshold(บาท), roleId}]),
// TOP_SPENDER_LEADERBOARD_CHANNEL.

const { SlashCommandBuilder, EmbedBuilder, GatewayIntentBits } = require('discord.js');
const { isAdmin } = require('../../lib/perms');

const COLOR = 15902662;
const baht = (satang) => (Number(satang) / 100).toFixed(2);

function milestoneRoles(ctx) {
  const raw = String(ctx.config.get('TOP_SPENDER_MILESTONE_ROLES', '')).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((m) => ({ threshold: Number(m?.threshold), roleId: String(m?.roleId || '').trim() }))
      .filter((m) => Number.isFinite(m.threshold) && m.threshold > 0 && m.roleId);
  } catch (_e) {
    console.error('[central-bot] TOP_SPENDER_MILESTONE_ROLES is not valid JSON');
    return [];
  }
}

function managedRoleIds(ctx) {
  return [
    ctx.config.get('TOP_SPENDER_TOP1_ROLE_ID'),
    ctx.config.get('TOP_SPENDER_TOP10_ROLE_ID'),
    ...milestoneRoles(ctx).map((m) => m.roleId),
  ].filter(Boolean).map(String);
}

function rolesConfigured(config) {
  if (config.get('TOP_SPENDER_TOP1_ROLE_ID') || config.get('TOP_SPENDER_TOP10_ROLE_ID')) return true;
  return Boolean(String(config.get('TOP_SPENDER_MILESTONE_ROLES', '')).trim());
}

// Sweeping roles over the whole member list needs the members intent.
function intents(config) {
  return rolesConfigured(config) ? [GatewayIntentBits.GuildMembers] : [];
}

async function handleTop(interaction, ctx) {
  if (!ctx.services?.wallet) {
    await interaction.reply({ content: 'ต้องเปิดฟีเจอร์ wallet-topup ก่อนจึงจะใช้คำสั่งนี้ได้', ephemeral: true });
    return;
  }
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const leaderboard = await ctx.services.wallet.getLeaderboard(50);
  if (leaderboard.length === 0) {
    await interaction.editReply('❌ ยังไม่มีข้อมูลยอดเติมสะสม');
    return;
  }

  const guild = interaction.guild;
  const top1RoleId = ctx.config.get('TOP_SPENDER_TOP1_ROLE_ID');
  const top10RoleId = ctx.config.get('TOP_SPENDER_TOP10_ROLE_ID');
  const milestones = milestoneRoles(ctx);
  const managed = managedRoleIds(ctx);

  let updated = 0;
  const errors = [];

  if (managed.length > 0) {
    // Role sweep needs every member cached (Server Members Intent).
    try {
      await guild.members.fetch();
    } catch (err) {
      await interaction.editReply(
        `❌ ดึงรายชื่อสมาชิกไม่สำเร็จ (${err.message}) — ตรวจว่าเปิด Server Members Intent ใน Discord Dev Portal แล้ว`,
      );
      return;
    }

    // Strip every managed role first, then re-grant from the leaderboard.
    for (const roleId of managed) {
      const role = guild.roles.cache.get(roleId);
      if (!role) continue;
      for (const member of role.members.values()) {
        await member.roles.remove(role).catch(() => {});
      }
    }

    for (let i = 0; i < leaderboard.length; i += 1) {
      const entry = leaderboard[i];
      const rank = i + 1;
      const member = guild.members.cache.get(entry.member_discord_id);
      if (!member) continue;

      const give = new Set();
      if (rank === 1 && top1RoleId) give.add(String(top1RoleId));
      if (rank <= 10 && top10RoleId) give.add(String(top10RoleId));
      const totalBaht = Number(entry.total_topup_satang) / 100;
      for (const m of milestones) {
        if (totalBaht >= m.threshold) give.add(m.roleId);
      }

      try {
        for (const roleId of give) {
          const role = guild.roles.cache.get(roleId);
          if (role && !member.roles.cache.has(roleId)) await member.roles.add(role);
        }
        if (give.size > 0) updated += 1;
      } catch (err) {
        errors.push(`<@${entry.member_discord_id}>: ${err.message}`);
      }
    }
  }

  const top10 = leaderboard.slice(0, 10);
  const board = top10.map((entry, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    return `${medal} <@${entry.member_discord_id}> — **${baht(entry.total_topup_satang)}** บาท`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('<:Ts_22_discord_1ture:1397892606209429584> Top ยอดเติมสะสม')
    .setDescription(
      `> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n\`\`\`อัปเดตยศให้ ${updated} คน\`\`\`\n`
      + `> <:Ts_14_discord_pointg:1397694229333016647> : Top 10 ยอดเติมสะสม\n${board}`,
    )
    .setTimestamp();
  if (errors.length > 0) {
    embed.addFields({
      name: '⚠️ Errors',
      value: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n…และอีก ${errors.length - 5} รายการ` : ''),
    });
  }

  await interaction.editReply({ embeds: [embed] });

  // Also post the board publicly when a leaderboard channel is configured.
  const channelId = ctx.config.get('TOP_SPENDER_LEADERBOARD_CHANNEL');
  if (channelId) {
    const channel = guild.channels.cache.get(String(channelId))
      || (await guild.channels.fetch(String(channelId)).catch(() => null));
    if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = {
  code: 'top-spender-rank',
  name: 'Top Spender Rank',
  intents,

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('top')
        .setDescription('อัปเดตยศตามยอดเติมเงินสะสม + โชว์ Top 10 (แอดมินเท่านั้น)')
        .toJSON(),
    ];
  },

  handlers: { top: handleTop },
};
