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

const { SlashCommandBuilder, GatewayIntentBits } = require('discord.js');
const { isAdmin } = require('../../lib/perms');

const baht = (satang) => (Number(satang) / 100).toFixed(2);

// Serialize role sweeps per guild: top-ups can fire syncRoles concurrently, and the
// strip-then-regrant sweep must not overlap with itself. Each guild keeps a promise
// chain so sweeps run one after another.
const sweepChains = new Map();

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

// Which managed roles a member at `rank` with `totalBaht` lifetime top-up should hold.
function rankRolesFor(rank, totalBaht, { top1RoleId, top10RoleId, milestones }) {
  const give = new Set();
  if (rank === 1 && top1RoleId) give.add(String(top1RoleId));
  if (rank <= 10 && top10RoleId) give.add(String(top10RoleId));
  for (const m of milestones) {
    if (totalBaht >= m.threshold) give.add(m.roleId);
  }
  return give;
}

// Reconcile the reward roles for a guild against the lifetime top-up leaderboard.
// Idempotent: computes the roles each member *should* hold by rank/milestone and only
// applies the difference, so a top-up that doesn't change anyone's rank leaves every
// role untouched (no strip-then-regrant flicker, no role-change spam). Returns
// { updated, errors, fetchError } — updated counts members whose roles actually changed;
// fetchError is set when the member fetch fails (almost always a missing Server Members
// Intent).
async function runSweep(guild, ctx) {
  const managed = managedRoleIds(ctx);
  if (managed.length === 0) return { updated: 0, errors: [] };

  const leaderboard = await ctx.services.wallet.getLeaderboard(50);
  if (leaderboard.length === 0) return { updated: 0, errors: [] };

  const cfg = {
    top1RoleId: ctx.config.get('TOP_SPENDER_TOP1_ROLE_ID'),
    top10RoleId: ctx.config.get('TOP_SPENDER_TOP10_ROLE_ID'),
    milestones: milestoneRoles(ctx),
  };

  // Role sweep needs every member cached (Server Members Intent).
  try {
    await guild.members.fetch();
  } catch (err) {
    return { updated: 0, errors: [], fetchError: err.message };
  }

  const managedSet = new Set(managed);

  // The managed roles each leaderboard member should hold, keyed by member id.
  const desired = new Map();
  for (let i = 0; i < leaderboard.length; i += 1) {
    const entry = leaderboard[i];
    const give = rankRolesFor(i + 1, Number(entry.total_topup_satang) / 100, cfg);
    if (give.size > 0) desired.set(String(entry.member_discord_id), give);
  }

  // Everyone who currently holds a managed role — so stale holders get it stripped even
  // if they fell off the leaderboard.
  const holders = new Set();
  for (const roleId of managedSet) {
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;
    for (const id of role.members.keys()) holders.add(id);
  }

  // Apply only the diff per member: add missing desired roles, remove managed roles they
  // hold but no longer deserve.
  let updated = 0;
  const errors = [];
  for (const memberId of new Set([...desired.keys(), ...holders])) {
    const member = guild.members.cache.get(memberId);
    if (!member) continue;
    const want = desired.get(memberId) ?? new Set();

    const toAdd = [...want].filter((roleId) => !member.roles.cache.has(roleId));
    const toRemove = [...managedSet].filter(
      (roleId) => member.roles.cache.has(roleId) && !want.has(roleId),
    );
    if (toAdd.length === 0 && toRemove.length === 0) continue;

    try {
      for (const roleId of toRemove) {
        const role = guild.roles.cache.get(roleId);
        if (role) await member.roles.remove(role);
      }
      for (const roleId of toAdd) {
        const role = guild.roles.cache.get(roleId);
        if (role) await member.roles.add(role);
      }
      updated += 1;
    } catch (err) {
      errors.push(`<@${memberId}>: ${err.message}`);
    }
  }
  return { updated, errors };
}

// Serialized entry point: queues the sweep on the guild's promise chain so concurrent
// top-ups never run overlapping strip/re-grant passes. Exposed as ctx.services.rankSync.
function syncRoles(guild, ctx) {
  if (!guild) return Promise.resolve({ updated: 0, errors: [] });
  const prev = sweepChains.get(guild.id) ?? Promise.resolve();
  const next = prev.then(() => runSweep(guild, ctx));
  sweepChains.set(guild.id, next.catch(() => {}));
  return next;
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

  const { updated, errors, fetchError } = await syncRoles(interaction.guild, ctx);
  if (fetchError) {
    await interaction.editReply(
      `❌ ดึงรายชื่อสมาชิกไม่สำเร็จ (${fetchError}) — ตรวจว่าเปิด Server Members Intent ใน Discord Dev Portal แล้ว`,
    );
    return;
  }

  const board = leaderboard.slice(0, 10).map((entry, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    return `${medal} <@${entry.member_discord_id}> — **${baht(entry.total_topup_satang)}** บาท`;
  }).join('\n');

  const embed = await ctx.services.embeds.renderEmbed('top_leaderboard', { updated, board });
  embed.setTimestamp();
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
    const channel = interaction.guild.channels.cache.get(String(channelId))
      || (await interaction.guild.channels.fetch(String(channelId)).catch(() => null));
    if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = {
  code: 'top-spender-rank',
  name: 'Top Spender Rank',
  intents,

  // Expose rank resync so top-ups (wallet-topup) can refresh roles automatically.
  provides(ctx) {
    ctx.services.rankSync = (guild) => syncRoles(guild, ctx);
  },

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
