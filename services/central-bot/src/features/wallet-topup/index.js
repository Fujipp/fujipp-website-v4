// src/features/wallet-topup/index.js
// Shop wallet + top-up. Owns the member wallet store (layer B) and exposes it to
// other features via ctx.services.wallet (e.g. Roblox redeem debits it).
//
// Config keys (billing.feature_variable_templates): API_SLIPOK_KEY, SLIPOK_BRANCH_ID,
// PROMPTPAY_NUMBER, PROMPTPAY_ACCOUNT_NAME, MIN_TOPUP, TOPUP_QR_TIMEOUT,
// SLIP_CHECK_CHANNEL, TOPUP_NOTIFY_CHANNEL, API_TRUEMONEY_KEY_ID, TRUEMONEY_PHONE,
// TRUEMONEY_BASE, TRUEMONEY_FEE (%), TRUEMONEY_FEE_FLAT (baht)
//
// Top-up paths: TrueMoney voucher + PromptPay QR with SlipOK slip verification
// (slip.js), plus a manual admin credit (/wallet-add).

const { SlashCommandBuilder } = require('discord.js');
const { makeWallet } = require('../../lib/wallet');
const topup = require('./topup');
const slip = require('./slip');
const { grantTopupRole } = require('./topup-role');
const { isAdmin } = require('../../lib/perms');
const { withDiscordContext } = require('./discord-context');

const thb = (satang) => `฿${(satang / 100).toLocaleString('th-TH')}`;

async function handleWallet(interaction, ctx) {
  await interaction.deferReply({ ephemeral: true });
  const balance = await ctx.services.wallet.getBalance(interaction.user.id);
  await interaction.editReply(await topup.buildWalletBalance(ctx, interaction.user, balance, interaction));
  const unsubscribe = ctx.services.wallet.subscribeBalance(interaction.user.id, async (nextBalance) => {
    try {
      await interaction.editReply(await topup.buildWalletBalance(ctx, interaction.user, nextBalance, interaction));
    } catch {
      unsubscribe();
    }
  });
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
  const embed = await ctx.services.embeds.renderEmbed('topup_success', withDiscordContext(interaction, {
    member: member.id,
    amount: thb(amountThb * 100),
    total_balance: thb(balance),
    method: 'แอดมินเติม',
    datetime: new Date().toLocaleString('th-TH'),
  }, member));
  await interaction.editReply({ embeds: [embed] });

  // Post the same success embed publicly, like a SlipOK top-up does (slip.js).
  const channelId = ctx.config.get('TOPUP_NOTIFY_CHANNEL');
  if (channelId && interaction.guild) {
    const channel = interaction.guild.channels.cache.get(String(channelId))
      || (await interaction.guild.channels.fetch(String(channelId)).catch(() => null));
    if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => {});
  }

  // Grant the configured top-up role (no-op if unset).
  await grantTopupRole(ctx, interaction.guild, member.id);

  // A manual credit moves the lifetime top-up total — refresh rank roles if the
  // top-spender-rank feature is enabled (no-op otherwise).
  ctx.services.rankSync?.(interaction.guild)?.catch(() => {});
}

// /topup-monthly — top-up totals over the last 1 month (from the ledger).
// Members see their own total; an admin can pass member for one member, or
// omit it to see the whole shop's total.
async function handleTopupMonthly(interaction, ctx) {
  const target = interaction.options.getUser('member');
  const admin = isAdmin(interaction, ctx);
  if (target && !admin) {
    await interaction.reply({ content: 'ดูยอดของสมาชิกคนอื่นได้เฉพาะแอดมินเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  if (admin && !target) {
    const s = await ctx.services.wallet.getTopupSummary();
    await interaction.editReply(
      `📅 ยอดเติมเงินรวมทั้งร้านใน 1 เดือนล่าสุด: **${thb(s.totalSatang)}**\n`
      + `รวม ${s.entryCount} รายการ จากสมาชิก ${s.memberCount} คน`,
    );
    return;
  }

  const member = target ?? interaction.user;
  const s = await ctx.services.wallet.getTopupSummary({ memberId: member.id });
  await interaction.editReply(
    `📅 ยอดเติมเงินของ <@${member.id}> ใน 1 เดือนล่าสุด: **${thb(s.totalSatang)}** (${s.entryCount} รายการ)`,
  );
}

// /topup-panel — admin posts a standalone top-up panel into the channel. Members
// click เติมเงิน to open the method picker, so top-up works without the Roblox feature.
async function handleTopupPanel(interaction, ctx) {
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    await interaction.channel.send(await topup.buildTopupPanel(ctx, interaction));
  } catch (error) {
    ctx.log(
      'Configurable top-up panel send failed; retrying with classic panel:',
      error?.code || 'unknown',
      error?.message || String(error),
    );
    await interaction.channel.send(topup.buildEmergencyTopupPanel());
  }
  await interaction.editReply({ content: 'โพสต์แผงเติมเงินแล้ว ✅' });
}

module.exports = {
  code: 'wallet-topup',
  name: 'Shop Wallet & Top-up',
  validate(config) {
    const promptPayReady = Boolean(config.get('PROMPTPAY_NUMBER'));
    const trueMoneyReady = Boolean(
      config.get('TRUEMONEY_BASE')
      && config.get('API_TRUEMONEY_KEY_ID')
      && config.get('TRUEMONEY_PHONE'),
    );
    return promptPayReady || trueMoneyReady ? [] : ['no top-up payment method is fully configured'];
  },

  // Register the wallet store so other features (Roblox redeem) can use it.
  provides(ctx) {
    ctx.services.wallet = makeWallet(ctx.config.subjectId, ctx.lifecycle);
  },

  onReady: topup.onReady,

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
      new SlashCommandBuilder()
        .setName('topup-monthly')
        .setDescription('เช็คยอดเติมเงินใน 1 เดือนล่าสุด (แอดมิน: ไม่ระบุสมาชิก = รวมทั้งร้าน)')
        .addUserOption((o) => o.setName('member').setDescription('สมาชิก (แอดมินเท่านั้น)').setRequired(false))
        .toJSON(),
      new SlashCommandBuilder()
        .setName('topup-panel')
        .setDescription('โพสต์แผงเติมเงิน (แอดมินเท่านั้น)')
        .toJSON(),
    ];
  },

  handlers: {
    wallet: handleWallet,
    'wallet-add': handleWalletAdd,
    'topup-monthly': handleTopupMonthly,
    'topup-panel': handleTopupPanel,
  },

  // Top-up flow components (TrueMoney voucher + PromptPay QR).
  components: topup.components,

  // Slip verification listens to messageCreate in SLIP_CHECK_CHANNEL; the extra
  // (privileged) intents are only requested when the slip config is present.
  intents: slip.intents,
  accessControlledEvents: ['messageCreate'],
  events: slip.events,
};
