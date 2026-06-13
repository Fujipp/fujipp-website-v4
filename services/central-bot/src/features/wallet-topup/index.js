// src/features/wallet-topup/index.js
// Shop wallet + top-up. Owns the member wallet store (layer B) and exposes it to
// other features via ctx.services.wallet (e.g. Roblox redeem debits it).
//
// Config keys (billing.feature_variable_templates): API_SLIPOK_KEY, SLIPOK_BRANCH_ID,
// PROMPTPAY_NUMBER, PROMPTPAY_ACCOUNT_NAME, MIN_TOPUP, TOPUP_QR_TIMEOUT,
// SLIP_CHECK_CHANNEL, TOPUP_NOTIFY_CHANNEL, API_TRUEMONEY_KEY_ID, TRUEMONEY_PHONE,
// TRUEMONEY_BASE, TRUEMONEY_FEE
//
// Top-up paths: TrueMoney voucher + PromptPay QR with SlipOK slip verification
// (slip.js), plus a manual admin credit (/wallet-add).

const { SlashCommandBuilder } = require('discord.js');
const { makeWallet } = require('../../lib/wallet');
const topup = require('./topup');
const slip = require('./slip');
const { isAdmin } = require('../../lib/perms');

const thb = (satang) => `฿${(satang / 100).toLocaleString('th-TH')}`;

async function handleWallet(interaction, ctx) {
  await interaction.deferReply({ ephemeral: true });
  const balance = await ctx.services.wallet.getBalance(interaction.user.id);
  const embed = await ctx.services.embeds.renderEmbed('balance', {
    member: interaction.user.id,
    balance: thb(balance),
  });
  await interaction.editReply({ embeds: [embed] });
}

async function handleWalletAdd(interaction, ctx) {
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }
  const member = interaction.options.getUser('member', true);
  const amountThb = interaction.options.getInteger('amount', true);
  await interaction.deferReply({ ephemeral: true });

  const balance = await ctx.services.wallet.credit(member.id, amountThb * 100, {
    type: 'TOPUP',
    note: `manual by ${interaction.user.id}`,
  });
  const embed = await ctx.services.embeds.renderEmbed('topup_success', {
    member: member.id,
    amount: thb(amountThb * 100),
    total_balance: thb(balance),
    method: 'แอดมินเติม',
    datetime: new Date().toLocaleString('th-TH'),
  });
  await interaction.editReply({ embeds: [embed] });

  // Post the same success embed publicly, like a SlipOK top-up does (slip.js).
  const channelId = ctx.config.get('TOPUP_NOTIFY_CHANNEL');
  if (channelId && interaction.guild) {
    const channel = interaction.guild.channels.cache.get(String(channelId))
      || (await interaction.guild.channels.fetch(String(channelId)).catch(() => null));
    if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => {});
  }

  // A manual credit moves the lifetime top-up total — refresh rank roles if the
  // top-spender-rank feature is enabled (no-op otherwise).
  ctx.services.rankSync?.(interaction.guild)?.catch(() => {});
}

module.exports = {
  code: 'wallet-topup',
  name: 'Shop Wallet & Top-up',

  // Register the wallet store so other features (Roblox redeem) can use it.
  provides(ctx) {
    ctx.services.wallet = makeWallet(ctx.config.subjectId);
  },

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('wallet')
        .setDescription('ดูยอดเงินในกระเป๋าของคุณ')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('wallet-add')
        .setDescription('เติมเงินให้สมาชิก (แอดมินเท่านั้น)')
        .addUserOption((o) => o.setName('member').setDescription('สมาชิก').setRequired(true))
        .addIntegerOption((o) => o.setName('amount').setDescription('จำนวนเงิน (บาท)').setRequired(true).setMinValue(1))
        .toJSON(),
    ];
  },

  handlers: {
    wallet: handleWallet,
    'wallet-add': handleWalletAdd,
  },

  // Top-up flow components (TrueMoney voucher + PromptPay QR).
  components: topup.components,

  // Slip verification listens to messageCreate in SLIP_CHECK_CHANNEL; the extra
  // (privileged) intents are only requested when the slip config is present.
  intents: slip.intents,
  events: slip.events,
};
