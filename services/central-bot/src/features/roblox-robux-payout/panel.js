// src/features/roblox-robux-payout/panel.js
// The interactive shop panel (config layer 3 components). /panel posts the shop_panel
// embed + a group select and action buttons. Component custom_ids are FIXED here
// (routed by bot.js); only the embed's appearance is configurable. Payment + payout
// flows are wired in later stages — for now topup/buy show their next embed/stub.

const {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const roblox = require('./roblox');
const { redeemRobux } = require('./redeem');

// Fixed component ids (routed by prefix in bot.js).
const ID = {
  group: 'kanom:panel:group',
  topup: 'kanom:panel:topup',
  buy: 'kanom:panel:buy',
  balance: 'kanom:panel:balance',
  topupMethod: 'kanom:topup:method',
  buyModal: 'kanom:buy:modal', // + ":<groupKey>"
};

const thb = (satang) => `฿${(satang / 100).toLocaleString('th-TH')}`;

function buildComponents(ctx) {
  const rows = [];

  const groups = roblox.getGroupConfigs().list;
  if (groups.length) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(ID.group)
      .setPlaceholder('เลือกกลุ่มที่ต้องการซื้อ')
      .addOptions(
        groups.slice(0, 25).map((g, i) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(String(g.name || `กลุ่ม ${i + 1}`).slice(0, 100))
            .setValue(String(g.key))),
      );
    rows.push(new ActionRowBuilder().addComponents(select));
  }

  const buttons = [
    new ButtonBuilder().setCustomId(ID.topup).setLabel('เติมเงิน').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(ID.buy).setLabel('ซื้อสินค้า').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(ID.balance).setLabel('เช็คยอดคงเหลือ').setStyle(ButtonStyle.Secondary),
  ];
  const link = ctx.config.get('GROUP_LINK');
  if (link && /^https?:\/\//i.test(link)) {
    buttons.push(new ButtonBuilder().setLabel('ลิงก์กลุ่ม').setStyle(ButtonStyle.Link).setURL(link));
  }
  rows.push(new ActionRowBuilder().addComponents(buttons));

  return rows;
}

// /panel — admin posts the shop panel into the channel.
async function handlePanel(interaction, ctx) {
  if (!ctx.config.isAuthorized(interaction.user.id)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้', ephemeral: true });
    return;
  }
  const embed = await ctx.services.embeds.renderEmbed('shop_panel');
  await interaction.reply({ embeds: [embed], components: buildComponents(ctx) });
}

async function onBalance(interaction, ctx) {
  const wallet = ctx.services && ctx.services.wallet;
  if (!wallet) {
    await interaction.reply({ content: 'ระบบกระเป๋าเงินยังไม่เปิด', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  const balance = await wallet.getBalance(interaction.user.id);
  const embed = await ctx.services.embeds.renderEmbed('balance', {
    member: interaction.user.id,
    balance: thb(balance),
  });
  await interaction.editReply({ embeds: [embed] });
}

async function onTopup(interaction, ctx) {
  const embed = await ctx.services.embeds.renderEmbed('topup_method');
  const select = new StringSelectMenuBuilder()
    .setCustomId(ID.topupMethod)
    .setPlaceholder('เลือกช่องทางการเติมเงิน')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('พร้อมเพย์ธนาคาร').setValue('promptpay'),
      new StringSelectMenuOptionBuilder().setLabel('ซองอั่งเปาทรูมันนี่').setValue('truemoney'),
    );
  await interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  });
}

async function onTopupMethod(interaction, ctx) {
  // Payment integration (PromptPay QR + SlipOK, TrueMoney voucher) lands in the next stage.
  const embed = await ctx.services.embeds.renderEmbed('processing');
  await interaction.reply({
    content: 'ระบบชำระเงินจริงกำลังพัฒนา จะเปิดให้ใช้เร็วๆ นี้',
    embeds: [embed],
    ephemeral: true,
  });
}

// Choosing a group opens a modal to enter the Roblox username + Robux amount.
async function onGroupSelect(interaction, ctx) {
  const key = interaction.values?.[0];
  const group = roblox.getGroupConfigs().list.find((g) => String(g.key) === String(key));
  const rate = ctx.config.number('ROBUX_RATE', 0);

  const modal = new ModalBuilder()
    .setCustomId(`${ID.buyModal}:${key}`)
    .setTitle(`ซื้อ Robux${group?.name ? ` · ${group.name}` : ''}`.slice(0, 45));
  const username = new TextInputBuilder()
    .setCustomId('username').setLabel('Roblox username').setStyle(TextInputStyle.Short).setRequired(true);
  const amount = new TextInputBuilder()
    .setCustomId('robux')
    .setLabel(rate > 0 ? `จำนวน Robux (เรท 1 บาท = ${rate})` : 'จำนวน Robux')
    .setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(
    new ActionRowBuilder().addComponents(username),
    new ActionRowBuilder().addComponents(amount),
  );
  await interaction.showModal(modal);
}

async function onBuyModal(interaction, ctx) {
  const groupKey = interaction.customId.split(':')[3] || null;
  const username = interaction.fields.getTextInputValue('username').trim();
  const robux = Number.parseInt(interaction.fields.getTextInputValue('robux').trim(), 10);
  await interaction.deferReply({ ephemeral: true });

  const result = await redeemRobux(ctx, { discordUserId: interaction.user.id, username, robux, groupKey });
  if (!result.ok) {
    await interaction.editReply({ content: result.message });
    return;
  }
  const embed = await ctx.services.embeds.renderEmbed('redeem_success', {
    member: interaction.user.id,
    robux: result.robux.toLocaleString(),
    group_name: result.groupName,
    balance: thb(result.balanceAfter),
  });
  await interaction.editReply({ embeds: [embed] });
}

async function onBuy(interaction) {
  await interaction.reply({ content: 'เลือกกลุ่มที่ต้องการจากเมนูด้านบนเพื่อซื้อ Robux', ephemeral: true });
}

module.exports = {
  panelCommand: () =>
    new SlashCommandBuilder().setName('panel').setDescription('โพสต์แผงร้าน (แอดมินเท่านั้น)').toJSON(),
  handlePanel,
  components: {
    [ID.balance]: onBalance,
    [ID.topupMethod]: onTopupMethod, // longest-match wins over :topup
    [ID.topup]: onTopup,
    [ID.buy]: onBuy,
    [ID.buyModal]: onBuyModal,
    [ID.group]: onGroupSelect,
  },
};
