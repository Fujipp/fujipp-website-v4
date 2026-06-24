// src/features/member-spending/index.js
// Manual membership / spending tracker — port of the legacy discord-bot-002-idaxdshop
// /topup. An admin records how much a member has spent; the bot posts a "บัตรสมาชิก"
// membership card (Embed Designer slots spending_card_first / spending_card_next),
// keeps {amount, count} per member in shop.member_spending (via lib/shop-store-db, so it
// honours the BYO-DB choice), grants a first-tier then upgrade role at a threshold, and
// refreshes Top1 / Top5 reward roles from the leaderboard.
//
// This is NOT the automated wallet (wallet-topup / top-spender-rank) — amounts are
// admin-entered and nothing is tied to a payment flow. Command: /topup, Top5 (not Top10).
//
// Config keys (injected as env per subject): SPENDING_FIRST_ROLE_ID,
// SPENDING_UPGRADE_TIERS (JSON [{amount(บาท), roleId}]), SPENDING_TIER_STACK (bool),
// SPENDING_COUNT_ENABLED (bool), SPENDING_UPGRADE_COUNT, SPENDING_TOP1_ROLE_ID,
// SPENDING_TOP5_ROLE_ID, plus SPENDING_DB_USE_OWN / SPENDING_DB_URL (own database).

const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, GatewayIntentBits,
} = require('discord.js');
const { isAdmin } = require('../../lib/perms');
const { getSpendingStore } = require('../../lib/shop-store-db');

const PAGE_SIZE = 20;
const baht = (satang) => (Number(satang) / 100).toLocaleString('th-TH');
const toUserId = (input) => (String(input || '').match(/\d{16,20}/) || [''])[0];

// ─── config helpers ──────────────────────────────────────────────────────────
// Amount tiers: [{amount(baht), roleId}] sorted ascending. Invalid entries dropped.
function parseTiers(ctx) {
  const raw = ctx.config.json('SPENDING_UPGRADE_TIERS', null);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => ({ amount: Number(t?.amount), roleId: String(t?.roleId || '').trim() }))
    .filter((t) => Number.isFinite(t.amount) && t.amount > 0 && t.roleId)
    .sort((a, b) => a.amount - b.amount);
}

function cfg(ctx) {
  return {
    firstRoleId: ctx.config.get('SPENDING_FIRST_ROLE_ID'),
    top1RoleId: ctx.config.get('SPENDING_TOP1_ROLE_ID'),
    top5RoleId: ctx.config.get('SPENDING_TOP5_ROLE_ID'),
    tiers: parseTiers(ctx),
    tierStack: ctx.config.bool('SPENDING_TIER_STACK', true),
    countEnabled: ctx.config.bool('SPENDING_COUNT_ENABLED', false),
    upgradeCount: ctx.config.number('SPENDING_UPGRADE_COUNT', 5),
  };
}

function rolesConfigured(config) {
  return Boolean(
    config.get('SPENDING_TOP1_ROLE_ID') || config.get('SPENDING_TOP5_ROLE_ID')
    || config.get('SPENDING_FIRST_ROLE_ID')
    || String(config.get('SPENDING_UPGRADE_TIERS', '')).trim(),
  );
}

// Member-list / role sweeps need the privileged Server Members intent.
function intents(config) {
  return rolesConfigured(config) ? [GatewayIntentBits.GuildMembers] : [];
}

function requireAdmin(interaction, ctx) {
  if (isAdmin(interaction, ctx)) return true;
  interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true }).catch(() => {});
  return false;
}

// ─── role helpers (safe: check existence + perm + hierarchy before add/remove) ─
async function canManageRole(member, roleId) {
  if (!roleId) return null;
  const role = member.guild.roles.cache.get(String(roleId));
  if (!role) return null;
  const me = await member.guild.members.fetchMe();
  const ok = me.permissions.has(PermissionFlagsBits.ManageRoles)
    && me.roles.highest.comparePositionTo(role) > 0;
  return ok ? role : null;
}

async function addRoleSafe(member, roleId) {
  const role = await canManageRole(member, roleId);
  if (role && !member.roles.cache.has(role.id)) await member.roles.add(role).catch(() => {});
}

async function removeRoleSafe(member, roleId) {
  const role = await canManageRole(member, roleId);
  if (role && member.roles.cache.has(role.id)) await member.roles.remove(role).catch(() => {});
}

// Grant the amount-tier roles a member now qualifies for. A tier qualifies by amount
// (baht ≥ tier.amount); when count is enabled, reaching the count threshold also
// qualifies the lowest tier. When stacking is on the member keeps every qualified tier;
// when off, only the highest qualified tier is kept and lower tier roles are stripped.
async function applyTierRoles(member, amountBaht, txCount, c) {
  const { tiers } = c;
  if (tiers.length === 0) return;
  const qualified = new Set(tiers.filter((t) => amountBaht >= t.amount));
  if (c.countEnabled && c.upgradeCount > 0 && txCount >= c.upgradeCount) qualified.add(tiers[0]);

  if (c.tierStack) {
    for (const t of tiers) if (qualified.has(t)) await addRoleSafe(member, t.roleId);
    return;
  }
  // only-highest: tiers are ascending, so the last qualified one is the highest.
  let highest = null;
  for (const t of tiers) if (qualified.has(t)) highest = t;
  for (const t of tiers) {
    if (t === highest) await addRoleSafe(member, t.roleId);
    else await removeRoleSafe(member, t.roleId);
  }
}

// Refresh Top1 / Top5 reward roles from the leaderboard. Top1 → rank 1, Top5 → ranks 2–5.
// Serialized per guild so concurrent /topup add calls never overlap strip/re-grant.
const sweepChains = new Map();
async function runRankSweep(guild, ctx) {
  const c = cfg(ctx);
  if (!c.top1RoleId && !c.top5RoleId) return;

  try {
    await guild.members.fetch();
  } catch {
    return; // missing Server Members intent — skip rather than throw
  }

  const store = getSpendingStore(ctx.config.subjectId);
  const board = await store.leaderboard(50);
  const top1Id = board[0]?.memberId;
  const top5Ids = new Set(board.slice(0, 5).map((e) => e.memberId));
  if (top1Id) top5Ids.delete(top1Id); // Top5 role covers ranks 2–5

  const roleTop1 = c.top1RoleId ? guild.roles.cache.get(String(c.top1RoleId)) : null;
  const roleTop5 = c.top5RoleId ? guild.roles.cache.get(String(c.top5RoleId)) : null;

  if (roleTop1) {
    for (const [mid, m] of roleTop1.members) {
      if (mid !== top1Id) await m.roles.remove(roleTop1).catch(() => {});
    }
    if (top1Id) {
      const m = await guild.members.fetch(top1Id).catch(() => null);
      if (m && !m.roles.cache.has(roleTop1.id)) await m.roles.add(roleTop1).catch(() => {});
    }
  }
  if (roleTop5) {
    for (const [mid, m] of roleTop5.members) {
      if (!top5Ids.has(mid)) await m.roles.remove(roleTop5).catch(() => {});
    }
    for (const uid of top5Ids) {
      const m = await guild.members.fetch(uid).catch(() => null);
      if (m && !m.roles.cache.has(roleTop5.id)) await m.roles.add(roleTop5).catch(() => {});
    }
  }
}
function refreshRanks(guild, ctx) {
  if (!guild) return Promise.resolve();
  const prev = sweepChains.get(guild.id) ?? Promise.resolve();
  const next = prev.then(() => runRankSweep(guild, ctx));
  sweepChains.set(guild.id, next.catch(() => {}));
  return next;
}

// ─── leaderboard embed + pagination ──────────────────────────────────────────
function listEmbed(board, page) {
  const pages = Math.max(1, Math.ceil(board.length / PAGE_SIZE));
  const cur = Math.min(Math.max(1, page), pages);
  const start = (cur - 1) * PAGE_SIZE;
  const lines = board.slice(start, start + PAGE_SIZE).map((e, i) => {
    const n = start + i + 1;
    return `\`${n}.\` <@${e.memberId}> → \`${baht(e.amountSatang)} บาท\` • \`${e.txCount} ครั้ง\``;
  });
  const embed = new EmbedBuilder()
    .setColor(0xe46daf)
    .setTitle('<:Customer_1:1397770440293879991> อันดับการใช้เงิน')
    .setDescription(lines.join('\n') || '— ว่าง —')
    .setFooter({ text: `page ${cur}/${pages}` })
    .setTimestamp(new Date());
  return { embed, page: cur, pages };
}
function pageControls(page, pages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('spending:list:prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
    new ButtonBuilder().setCustomId('spending:list:next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= pages),
  );
}

// ─── subcommands ─────────────────────────────────────────────────────────────
async function subAdd(interaction, ctx) {
  const user = interaction.options.getUser('user', true);
  const amountBaht = interaction.options.getInteger('amount', true);
  if (amountBaht <= 0) { await interaction.reply({ ephemeral: true, content: '❌ ต้องใส่จำนวนมากกว่า 0' }); return; }
  await interaction.deferReply({ ephemeral: true });

  const store = getSpendingStore(ctx.config.subjectId);
  const { amountSatang, txCount, isFirst } = await store.addAmount(user.id, amountBaht * 100);

  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  const c = cfg(ctx);
  if (member) {
    await addRoleSafe(member, c.firstRoleId);
    await applyTierRoles(member, amountSatang / 100, txCount, c);
  }
  await refreshRanks(interaction.guild, ctx);

  const card = await ctx.services.embeds.renderEmbed(isFirst ? 'spending_card_first' : 'spending_card_next', {
    member: member?.displayName || user.username,
    today: amountBaht.toLocaleString('th-TH'),
    total: baht(amountSatang),
    count: txCount,
    avatar: (member || user).displayAvatarURL({ size: 256 }),
  });
  if (interaction.channel && 'send' in interaction.channel) {
    await interaction.channel.send({
      content: `<a:kawaii_bow:1393983463320719481>：||<@${user.id}>||`,
      embeds: [card],
      allowedMentions: { parse: [] },
    }).catch(() => {});
  }
  await interaction.editReply('✅ อัปเดตบัตรสมาชิกแล้ว');
}

function updateModal(userId) {
  return new ModalBuilder()
    .setCustomId('spending:update:submit')
    .setTitle('ตั้งยอด/จำนวนครั้งใหม่')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('user_id').setLabel('User ID หรือ Mention').setStyle(TextInputStyle.Short).setRequired(true).setValue(userId),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('amount').setLabel('ตั้งยอดรวม (บาท) — เว้นว่างเพื่อไม่เปลี่ยน').setStyle(TextInputStyle.Short).setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('count').setLabel('ตั้งจำนวนครั้ง — เว้นว่างเพื่อไม่เปลี่ยน').setStyle(TextInputStyle.Short).setRequired(false),
      ),
    );
}

async function subDelete(interaction, ctx) {
  const user = interaction.options.getUser('user', true);
  const store = getSpendingStore(ctx.config.subjectId);
  const removed = await store.remove(user.id);
  if (!removed) { await interaction.reply({ ephemeral: true, content: '❌ ไม่พบข้อมูลของผู้ใช้นี้' }); return; }
  await refreshRanks(interaction.guild, ctx);
  await interaction.reply({ ephemeral: true, content: `🗑️ ลบข้อมูลการใช้เงินของ <@${user.id}> เรียบร้อย` });
}

async function subCheck(interaction, ctx) {
  const user = interaction.options.getUser('user') ?? interaction.user;
  const store = getSpendingStore(ctx.config.subjectId);
  const e = (await store.get(user.id)) || { amountSatang: 0, txCount: 0 };
  await interaction.reply({
    ephemeral: true,
    embeds: [new EmbedBuilder().setColor(0x00ae86).setTitle('🔎 ตรวจสอบยอดการใช้เงิน')
      .setDescription(`<@${user.id}> มียอดสะสม \`${baht(e.amountSatang)}\` บาท • \`${e.txCount}\` ครั้ง`).setTimestamp()],
  });
}

async function subList(interaction, ctx) {
  await refreshRanks(interaction.guild, ctx);
  const board = await getSpendingStore(ctx.config.subjectId).leaderboard(1000);
  const { embed, page, pages } = listEmbed(board, 1);
  await interaction.reply({ embeds: [embed], components: [pageControls(page, pages)] });
}

async function subTotal(interaction, ctx) {
  const { amountSatang, txCount } = await getSpendingStore(ctx.config.subjectId).totals();
  await interaction.reply({
    ephemeral: true,
    embeds: [new EmbedBuilder().setColor(0xe46daf).setTitle('<:Treasure:1398066484911276082> ยอดรวมทั้งหมด')
      .setDescription(`รวมยอดเงินทั้งหมด: \`${baht(amountSatang)}\` บาท\nรวมจำนวนครั้งทั้งหมด: \`${txCount}\` ครั้ง`).setTimestamp()],
  });
}

async function subRank(interaction, ctx) {
  await interaction.deferReply({ ephemeral: true });
  await refreshRanks(interaction.guild, ctx);
  const board = await getSpendingStore(ctx.config.subjectId).leaderboard(5);
  const top1 = board[0]?.memberId;
  const top5 = board.slice(0, 5).map((e) => e.memberId);
  const lines = [
    top1 ? `🏆 **TOP 1**: <@${top1}>` : '🏆 **TOP 1**: —',
    top5.length ? `⭐ **TOP 5**: ${top5.map((uid) => `<@${uid}>`).join(', ')}` : '⭐ **TOP 5**: —',
  ];
  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(0xe46daf).setTitle('🔄 รีเฟรชยศ TOP1 / TOP5 แล้ว').setDescription(lines.join('\n')).setTimestamp()],
  });
}

async function handleTopup(interaction, ctx) {
  if (!requireAdmin(interaction, ctx)) return;
  if (!interaction.guild) { await interaction.reply({ ephemeral: true, content: '❌ ใช้คำสั่งนี้ได้เฉพาะในกิลด์ครับ' }); return; }
  const sub = interaction.options.getSubcommand(true);
  switch (sub) {
    case 'add': return subAdd(interaction, ctx);
    case 'update': return interaction.showModal(updateModal(interaction.options.getUser('user', true).id));
    case 'delete': return subDelete(interaction, ctx);
    case 'check': return subCheck(interaction, ctx);
    case 'list': return subList(interaction, ctx);
    case 'total': return subTotal(interaction, ctx);
    case 'rank': return subRank(interaction, ctx);
    default: return undefined;
  }
}

// ─── component handlers ──────────────────────────────────────────────────────
async function onListPage(interaction, ctx) {
  const ft = interaction.message?.embeds?.[0]?.footer?.text || '';
  const m = ft.match(/page\s+(\d+)\/(\d+)/i);
  let page = m ? Number(m[1]) : 1;
  page += interaction.customId.endsWith(':next') ? 1 : -1;
  const board = await getSpendingStore(ctx.config.subjectId).leaderboard(1000);
  const { embed, page: cur, pages } = listEmbed(board, page);
  await interaction.update({ embeds: [embed], components: [pageControls(cur, pages)] });
}

async function onUpdateModal(interaction, ctx) {
  if (!isAdmin(interaction, ctx)) { await interaction.reply({ ephemeral: true, content: 'ไม่มีสิทธิ์' }); return; }
  const userId = toUserId(interaction.fields.getTextInputValue('user_id'));
  if (!userId) { await interaction.reply({ ephemeral: true, content: '❌ User ID ไม่ถูกต้อง' }); return; }
  const amountRaw = interaction.fields.getTextInputValue('amount')?.trim();
  const countRaw = interaction.fields.getTextInputValue('count')?.trim();
  const amountSatang = amountRaw ? Math.round(Number(amountRaw) * 100) : null;
  const txCount = countRaw ? Number(countRaw) : null;
  if ((amountRaw && !Number.isFinite(amountSatang)) || (countRaw && !Number.isFinite(txCount))) {
    await interaction.reply({ ephemeral: true, content: '❌ ค่าที่กรอกต้องเป็นตัวเลข' });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  const e = await getSpendingStore(ctx.config.subjectId).setAmounts(userId, { amountSatang, txCount });
  await refreshRanks(interaction.guild, ctx);
  await interaction.editReply(`✅ ตั้งค่า <@${userId}> เป็น \`${baht(e.amountSatang)}\` บาท • \`${e.txCount}\` ครั้ง`);
}

module.exports = {
  code: 'member-spending',
  name: 'Member Spending Card',
  intents,

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('topup')
        .setDescription('จัดการระบบยอดการใช้เงิน (กรอกเอง)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((s) => s.setName('add').setDescription('เพิ่มยอดการใช้เงินให้ผู้ใช้')
          .addUserOption((o) => o.setName('user').setDescription('ผู้ใช้').setRequired(true))
          .addIntegerOption((o) => o.setName('amount').setDescription('จำนวนเงิน (บาท)').setRequired(true)))
        .addSubcommand((s) => s.setName('update').setDescription('ตั้งยอด/จำนวนครั้งใหม่ (เปิด Modal)')
          .addUserOption((o) => o.setName('user').setDescription('ผู้ใช้').setRequired(true)))
        .addSubcommand((s) => s.setName('delete').setDescription('ลบข้อมูลการใช้เงินของผู้ใช้')
          .addUserOption((o) => o.setName('user').setDescription('ผู้ใช้').setRequired(true)))
        .addSubcommand((s) => s.setName('check').setDescription('ตรวจสอบยอดการใช้เงิน')
          .addUserOption((o) => o.setName('user').setDescription('ผู้ใช้ (เว้นว่าง=ตัวเอง)').setRequired(false)))
        .addSubcommand((s) => s.setName('list').setDescription('แสดงอันดับการใช้เงิน (พร้อมปุ่มเปลี่ยนหน้า)'))
        .addSubcommand((s) => s.setName('total').setDescription('สรุปยอดรวมทั้งหมด'))
        .addSubcommand((s) => s.setName('rank').setDescription('รีเฟรชยศ TOP1/TOP5 ตามอันดับปัจจุบัน')),
    ];
  },

  handlers: { topup: handleTopup },

  components: {
    'spending:list:': onListPage,
    'spending:update:submit': onUpdateModal,
  },
};
