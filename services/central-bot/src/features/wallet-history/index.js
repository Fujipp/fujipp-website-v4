// src/features/wallet-history/index.js
// Wallet history & admin balance tools — port of the legacy Kanom /history + /user.
// The ledger (shop.wallet_ledger) is append-only, so unlike the legacy JSON store
// there is no edit/delete: adjustments go through /wallet-set which writes an
// ADJUST entry. Requires wallet-topup (ctx.services.wallet).
//
// Config keys: WALLET_HISTORY_DEFAULT_LIMIT.

const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../../lib/perms');

const baht = (satang) => (Number(satang) / 100).toFixed(2);

function requireWallet(interaction, ctx) {
  if (ctx.services && ctx.services.wallet) return true;
  interaction.reply({ content: 'ต้องเปิดฟีเจอร์ wallet-topup ก่อนจึงจะใช้คำสั่งนี้ได้', ephemeral: true }).catch(() => {});
  return false;
}

function requireAdmin(interaction, ctx) {
  if (isAdmin(interaction, ctx)) return true;
  interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true }).catch(() => {});
  return false;
}

// /history member [limit] — latest top-up entries from the ledger.
async function handleHistory(interaction, ctx) {
  if (!requireWallet(interaction, ctx) || !requireAdmin(interaction, ctx)) return;
  const member = interaction.options.getUser('member', true);
  const defaultLimit = ctx.config.number('WALLET_HISTORY_DEFAULT_LIMIT', 10);
  const limit = Math.max(1, Math.min(50, interaction.options.getInteger('limit') ?? defaultLimit));
  await interaction.deferReply({ ephemeral: true });

  const rows = await ctx.services.wallet.getTopupHistory(member.id, limit);
  if (rows.length === 0) {
    await interaction.editReply(`❌ ไม่พบประวัติการเติมเงินของ <@${member.id}>`);
    return;
  }

  const lines = rows.map((row, i) => {
    const when = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(row.created_at));
    return `${i + 1}. ${baht(row.amount_satang)} THB | ${row.note || '-'} | ${when}`;
  });
  const totalSatang = rows.reduce((sum, row) => sum + Number(row.amount_satang), 0);

  await interaction.editReply(
    `📜 ประวัติเติมเงินของ <@${member.id}> (ล่าสุด ${rows.length} รายการ รวม ${baht(totalSatang)} THB)\n`
    + '```\n' + lines.join('\n') + '\n```',
  );
}

// /wallet-get member — admin reads any member's balance.
async function handleWalletGet(interaction, ctx) {
  if (!requireWallet(interaction, ctx) || !requireAdmin(interaction, ctx)) return;
  const member = interaction.options.getUser('member', true);
  await interaction.deferReply({ ephemeral: true });
  const balance = await ctx.services.wallet.getBalance(member.id);
  await interaction.editReply(`👛 <@${member.id}> คงเหลือ ${baht(balance)} THB`);
}

// /wallet-set member amount — set the balance to an absolute amount (ADJUST entry).
async function handleWalletSet(interaction, ctx) {
  if (!requireWallet(interaction, ctx) || !requireAdmin(interaction, ctx)) return;
  const member = interaction.options.getUser('member', true);
  const amountThb = interaction.options.getNumber('amount', true);
  if (amountThb < 0) {
    await interaction.reply({ content: 'ยอดเงินต้องไม่ติดลบ', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  const balance = await ctx.services.wallet.setBalance(member.id, Math.round(amountThb * 100), {
    note: `set by ${interaction.user.id}`,
  });
  await interaction.editReply(`✏️ ตั้งยอดของ <@${member.id}> เป็น ${baht(balance)} THB แล้ว`);
}

module.exports = {
  code: 'wallet-history',
  name: 'Wallet History',

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('history')
        .setDescription('ดูประวัติการเติมเงินของสมาชิก (แอดมินเท่านั้น)')
        .addUserOption((o) => o.setName('member').setDescription('สมาชิก').setRequired(true))
        .addIntegerOption((o) => o.setName('limit').setDescription('จำนวนรายการ (1-50)').setRequired(false))
        .toJSON(),
      new SlashCommandBuilder()
        .setName('wallet-get')
        .setDescription('ดูยอดเงินของสมาชิก (แอดมินเท่านั้น)')
        .addUserOption((o) => o.setName('member').setDescription('สมาชิก').setRequired(true))
        .toJSON(),
      new SlashCommandBuilder()
        .setName('wallet-set')
        .setDescription('ตั้งยอดเงินของสมาชิกเป็นจำนวนใหม่ (แอดมินเท่านั้น)')
        .addUserOption((o) => o.setName('member').setDescription('สมาชิก').setRequired(true))
        .addNumberOption((o) => o.setName('amount').setDescription('ยอดใหม่ (บาท)').setRequired(true).setMinValue(0))
        .toJSON(),
    ];
  },

  handlers: {
    history: handleHistory,
    'wallet-get': handleWalletGet,
    'wallet-set': handleWalletSet,
  },
};
