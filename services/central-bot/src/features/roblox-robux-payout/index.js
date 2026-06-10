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

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const roblox = require('./roblox');
const panel = require('./panel');
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
  const embed = new EmbedBuilder()
    .setColor(result.color ?? BRAND)
    .setTitle('ตรวจสอบสิทธิ์รับ Robux')
    .setDescription(result.message || 'ไม่สามารถตรวจสอบได้')
    .setFooter({ text: ctx.config.get('ROBLOX_GROUP_NAME', 'Roblox') });
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
  const embed = new EmbedBuilder()
    .setColor(BRAND)
    .setTitle('ยอด Robux ของกลุ่ม')
    .setDescription(`คงเหลือ **${funds.robux.toLocaleString()}** Robux`)
    .setFooter({ text: ctx.config.get('ROBLOX_GROUP_NAME', 'Roblox') });
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

  const embed = new EmbedBuilder()
    .setColor(0x3ba55d)
    .setTitle('จ่าย Robux สำเร็จ')
    .setDescription(`ส่ง **${amount.toLocaleString()}** Robux ให้ \`${user.username}\` แล้ว`);
  await interaction.editReply({ embeds: [embed] });

  const notifyChannelId = ctx.config.get('ROBUX_NOTIFY_CHANNEL');
  if (notifyChannelId) {
    const channel = interaction.client.channels.cache.get(notifyChannelId)
      || (await interaction.client.channels.fetch(notifyChannelId).catch(() => null));
    if (channel?.isTextBased()) channel.send({ embeds: [embed] }).catch(() => {});
  }
}

// Self-service: member spends their shop wallet (THB) to receive Robux.
async function handleRedeem(interaction, ctx) {
  if (!ensureEnabled(interaction, ctx)) return;
  const wallet = ctx.services && ctx.services.wallet;
  if (!wallet) {
    await interaction.reply({ content: 'ระบบกระเป๋าเงินยังไม่เปิด (ต้องเปิดฟีเจอร์ wallet-topup)', ephemeral: true });
    return;
  }
  const rate = ctx.config.number('ROBUX_RATE', 0);
  if (!rate || rate <= 0) {
    await interaction.reply({ content: 'ร้านยังไม่ได้ตั้งเรท (ROBUX_RATE)', ephemeral: true });
    return;
  }
  const username = interaction.options.getString('username', true);
  const robux = interaction.options.getInteger('amount', true);
  // ROBUX_RATE = Robux per 1 baht, so THB cost = robux / rate (round up to satang).
  const costSatang = Math.ceil((robux / rate) * 100);
  await interaction.deferReply({ ephemeral: true });

  const user = await roblox.getUserByUsername(username);
  if (!user.ok) {
    await interaction.editReply({ content: user.error?.message || 'ไม่พบผู้ใช้' });
    return;
  }

  // Debit first; refund if the payout fails.
  let balanceAfter;
  try {
    balanceAfter = await wallet.debit(interaction.user.id, costSatang, {
      type: 'ROBUX_REDEEM',
      note: `${robux} Robux → ${user.username}`,
    });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_FUNDS') {
      await interaction.editReply({ content: `ยอดเงินไม่พอ ต้องใช้ ฿${(costSatang / 100).toLocaleString('th-TH')}` });
      return;
    }
    throw err;
  }

  const payout = await roblox.makeOneTimePayout(user.userId, robux);
  if (!payout.ok) {
    await wallet.credit(interaction.user.id, costSatang, { type: 'REFUND', note: 'payout failed' }).catch(() => {});
    await interaction.editReply({
      content: `จ่าย Robux ไม่สำเร็จ คืนเงินแล้ว: ${payout.error?.message || roblox.mapErrorCode(payout.error?.code)}`,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x3ba55d)
    .setTitle('แลก Robux สำเร็จ')
    .setDescription(`ส่ง **${robux.toLocaleString()}** Robux ให้ \`${user.username}\`\nคงเหลือ **฿${(balanceAfter / 100).toLocaleString('th-TH')}**`);
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
