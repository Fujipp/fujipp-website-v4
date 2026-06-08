// src/features/wallet-topup/index.js
// Shop wallet + top-up. Owns the member wallet store (layer B) and exposes it to
// other features via ctx.services.wallet (e.g. Roblox redeem debits it).
//
// Config keys (billing.feature_variable_templates): API_SLIPOK_KEY, SLIPOK_BRANCH_ID,
// PROMPTPAY_NUMBER, MIN_TOPUP, API_TRUEMONEY_KEY_ID, TRUEMONEY_PHONE, TRUEMONEY_BASE, TRUEMONEY_FEE
//
// v1 top-up is a manual admin credit (/wallet-add). Automated SlipOK / TrueMoney
// verification reuses the same wallet.credit() and is a follow-up.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeWallet } = require('../../lib/wallet');

const BRAND = 0x37373d;
const thb = (satang) => `฿${(satang / 100).toLocaleString('th-TH')}`;

async function handleWallet(interaction, ctx) {
  await interaction.deferReply({ ephemeral: true });
  const balance = await ctx.services.wallet.getBalance(interaction.user.id);
  const embed = new EmbedBuilder()
    .setColor(BRAND)
    .setTitle('กระเป๋าเงินของคุณ')
    .setDescription(`ยอดคงเหลือ **${thb(balance)}**`);
  await interaction.editReply({ embeds: [embed] });
}

async function handleWalletAdd(interaction, ctx) {
  if (!ctx.config.isAuthorized(interaction.user.id)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้', ephemeral: true });
    return;
  }
  const member = interaction.options.getUser('member', true);
  const amountThb = interaction.options.getInteger('amount', true);
  await interaction.deferReply({ ephemeral: true });

  const balance = await ctx.services.wallet.credit(member.id, amountThb * 100, {
    type: 'TOPUP',
    note: `manual by ${interaction.user.id}`,
  });
  const embed = new EmbedBuilder()
    .setColor(0x3ba55d)
    .setTitle('เติมเงินสำเร็จ')
    .setDescription(`เติม **${thb(amountThb * 100)}** ให้ <@${member.id}>\nยอดใหม่ **${thb(balance)}**`);
  await interaction.editReply({ embeds: [embed] });
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
};
