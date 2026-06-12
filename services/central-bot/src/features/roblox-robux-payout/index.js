// src/features/roblox-robux-payout/index.js
// Roblox Robux Payout feature.
//
// Config (injected as env by the orchestrator, keys mirror billing.feature_variable_templates):
//   ROBLOX_GROUP_ID{,_1,_2,_3}, ROBLOX_SECURITY_COOKIE{,_1,_2,_3},
//   ROBLOX_TOTP_SECRET{,_1,_2,_3}, ROBLOX_GROUP_NAME{,_1,_2,_3},
//   ROBUX_RATE (Robux per 1 baht), ROBUX_ENABLED, ROBUX_PAYOUT_COOLDOWN,
//   ROBUX_NOTIFY_CHANNEL, ROBLOX_GROUPS (legacy JSON)
//
// The Roblox API client (roblox.js) is the proven implementation ported from the
// original kanom-roblox bot; it reads the ROBLOX_* env keys directly.

const { SlashCommandBuilder } = require('discord.js');
const roblox = require('./roblox');
const panel = require('./panel');
const { redeemRobux } = require('./redeem');
const { isAdmin } = require('../../lib/perms');

const BRAND = 0x37373d;

function ensureEnabled(interaction, ctx) {
  if (!ctx.config.bool('ROBUX_ENABLED', true)) {
    interaction.reply({ content: 'ระบบจ่าย Robux ถูกปิดอยู่', ephemeral: true });
    return false;
  }
  return true;
}

async function handleCheck(interaction, ctx) {
  if (!ensureEnabled(interaction, ctx)) return;
  const username = interaction.options.getString('username', true);
  await interaction.deferReply();

  const result = await roblox.checkRobloxEligibility(username);
  const embed = await ctx.services.embeds.renderEmbed('check_result', {
    message: result.message || 'ไม่สามารถตรวจสอบได้',
    username: result.username || username,
    group_name: ctx.config.get('ROBLOX_GROUP_NAME', 'Roblox'),
  });
  // The seeded template has no color so the result drives green/red; a bot
  // override that sets a fixed color wins.
  if (embed.data.color == null) embed.setColor(result.color ?? BRAND);
  await interaction.editReply({ embeds: [embed] });
}

async function handleBalance(interaction, ctx) {
  if (!ensureEnabled(interaction, ctx)) return;
  await interaction.deferReply({ ephemeral: true });

  const funds = await roblox.getGroupFunds();
  if (!funds.ok) {
    await interaction.editReply({ content: `ดึงยอดกลุ่มไม่สำเร็จ: ${funds.error?.message || 'unknown'}` });
    return;
  }
  const embed = await ctx.services.embeds.renderEmbed('group_balance', {
    robux: funds.robux.toLocaleString(),
    group_name: ctx.config.get('ROBLOX_GROUP_NAME', 'Roblox'),
  });
  await interaction.editReply({ embeds: [embed] });
}

async function handlePayout(interaction, ctx) {
  if (!ensureEnabled(interaction, ctx)) return;
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }
  const username = interaction.options.getString('username', true);
  const amount = interaction.options.getInteger('amount', true);
  await interaction.deferReply({ ephemeral: true });

  const user = await roblox.getUserByUsername(username);
  if (!user.ok) {
    await interaction.editReply({ content: user.error?.message || 'ไม่พบผู้ใช้' });
    return;
  }

  // Admin manual payout (no wallet debit). Self-service redeem that debits the
  // member's shop wallet is /robux-redeem below.
  const payout = await roblox.makeOneTimePayout(user.userId, amount);
  if (!payout.ok) {
    await interaction.editReply({
      content: `จ่าย Robux ไม่สำเร็จ: ${payout.error?.message || roblox.mapErrorCode(payout.error?.code)}`,
    });
    return;
  }

  const embed = await ctx.services.embeds.renderEmbed('payout_admin_success', {
    robux: amount.toLocaleString(),
    username: user.username,
  });
  await interaction.editReply({ embeds: [embed] });

  const notifyChannelId = ctx.config.get('ROBUX_NOTIFY_CHANNEL');
  if (notifyChannelId) {
    const channel = interaction.client.channels.cache.get(notifyChannelId)
      || (await interaction.client.channels.fetch(notifyChannelId).catch(() => null));
    if (channel?.isTextBased()) channel.send({ embeds: [embed] }).catch(() => {});
  }
}

// Self-service: member spends their shop wallet (THB) to receive Robux.
// Money logic lives in redeem.js (shared core): eligibility → debit → payout → refund.
async function handleRedeem(interaction, ctx) {
  if (!ensureEnabled(interaction, ctx)) return;
  const username = interaction.options.getString('username', true);
  const robux = interaction.options.getInteger('amount', true);
  await interaction.deferReply({ ephemeral: true });

  const result = await redeemRobux(ctx, {
    discordUserId: interaction.user.id,
    username,
    robux,
  });
  if (!result.ok) {
    await interaction.editReply({ content: result.message });
    return;
  }

  const embed = await ctx.services.embeds.renderEmbed('redeem_success', {
    member: result.username,
    robux: robux.toLocaleString(),
    group_name: result.groupName || ctx.config.get('ROBLOX_GROUP_NAME', 'Roblox'),
    balance: `฿${(result.balanceAfter / 100).toLocaleString('th-TH')}`,
  });
  await interaction.editReply({ embeds: [embed] });

  const notifyChannelId = ctx.config.get('ROBUX_NOTIFY_CHANNEL');
  if (notifyChannelId) {
    const channel = interaction.client.channels.cache.get(notifyChannelId)
      || (await interaction.client.channels.fetch(notifyChannelId).catch(() => null));
    if (channel?.isTextBased()) channel.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = {
  code: 'roblox-robux-payout',
  name: 'Roblox Robux Payout',
  commands() {
    return [
      new SlashCommandBuilder()
        .setName('robux-check')
        .setDescription('ตรวจสอบสิทธิ์รับ Robux ของผู้ใช้ Roblox')
        .addStringOption((o) => o.setName('username').setDescription('Roblox username').setRequired(true))
        .toJSON(),
      new SlashCommandBuilder()
        .setName('robux-balance')
        .setDescription('ดูยอด Robux คงเหลือของกลุ่ม')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('robux-payout')
        .setDescription('จ่าย Robux ให้ผู้ใช้ (แอดมินเท่านั้น)')
        .addStringOption((o) => o.setName('username').setDescription('Roblox username').setRequired(true))
        .addIntegerOption((o) => o.setName('amount').setDescription('จำนวน Robux').setRequired(true).setMinValue(1))
        .toJSON(),
      new SlashCommandBuilder()
        .setName('robux-redeem')
        .setDescription('แลก Robux ด้วยเงินในกระเป๋าของคุณ')
        .addStringOption((o) => o.setName('username').setDescription('Roblox username ของคุณ').setRequired(true))
        .addIntegerOption((o) => o.setName('amount').setDescription('จำนวน Robux').setRequired(true).setMinValue(1))
        .toJSON(),
      panel.panelCommand(),
    ];
  },
  handlers: {
    'robux-check': handleCheck,
    'robux-balance': handleBalance,
    'robux-payout': handlePayout,
    'robux-redeem': handleRedeem,
    panel: panel.handlePanel,
  },
  components: panel.components,
};
