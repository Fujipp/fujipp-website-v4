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
const { isAdmin } = require('../../lib/perms');
const { redeemRobux } = require('./redeem');
const { buttonStyle, parseEmoji, applyButton } = require('../../lib/components');

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

// Best-effort live Robux stock per group (read-only; tolerates missing cookies).
async function fetchStock(groups) {
  return Promise.all(groups.map((g) =>
    roblox.getGroupFunds({ groupKey: g.key }).then((f) => (f && f.ok ? f.robux : null)).catch(() => null)));
}

// `comp` = config.components (appearance overrides per role); custom_ids stay fixed.
function buildComponents(ctx, groups, stock, comp = {}) {
  const rows = [];

  if (groups.length) {
    const sel = comp.group_select || {};
    const selectEmoji = parseEmoji(sel.emoji);
    const select = new StringSelectMenuBuilder()
      .setCustomId(ID.group)
      .setPlaceholder(String(sel.placeholder || 'เลือกกลุ่มที่ต้องการซื้อ').slice(0, 150))
      .addOptions(
        groups.slice(0, 25).map((g, i) => {
          const opt = new StringSelectMenuOptionBuilder()
            .setLabel(String(g.name || `กลุ่ม ${i + 1}`).slice(0, 100))
            .setValue(String(g.key));
          if (stock && stock[i] != null) opt.setDescription(`ยอดคงเหลือ ${stock[i].toLocaleString()}`.slice(0, 100));
          if (selectEmoji) { try { opt.setEmoji(selectEmoji); } catch (_e) { /* skip */ } }
          return opt;
        }),
      );
    rows.push(new ActionRowBuilder().addComponents(select));
  }

  const buttons = [
    applyButton(new ButtonBuilder().setCustomId(ID.topup).setStyle(buttonStyle(comp.btn_topup && comp.btn_topup.style, ButtonStyle.Primary)), comp.btn_topup, 'เติมเงิน'),
    applyButton(new ButtonBuilder().setCustomId(ID.buy).setStyle(buttonStyle(comp.btn_buy && comp.btn_buy.style, ButtonStyle.Danger)), comp.btn_buy, 'ซื้อสินค้า'),
    applyButton(new ButtonBuilder().setCustomId(ID.balance).setStyle(buttonStyle(comp.btn_balance && comp.btn_balance.style, ButtonStyle.Secondary)), comp.btn_balance, 'เช็คยอดคงเหลือ'),
  ];
  const link = (comp.btn_link && comp.btn_link.url) || ctx.config.get('GROUP_LINK');
  if (link && /^https?:\/\//i.test(link)) {
    buttons.push(applyButton(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(link), comp.btn_link, 'ลิงก์กลุ่ม'));
  }
  rows.push(new ActionRowBuilder().addComponents(buttons));

  return rows;
}

// /panel — admin posts the shop panel into the channel.
async function handlePanel(interaction, ctx) {
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const groups = roblox.getGroupConfigs().list;
  const stock = groups.length ? await fetchStock(groups) : [];
  const cfg = await ctx.services.embeds.getConfig('shop_panel');
  const embed = await ctx.services.embeds.renderEmbed('shop_panel');
  // Inject per-group stock fields (Robux กลุ่ม 1/2/3) to match the original design.
  if (groups.length) {
    embed.addFields(groups.slice(0, 25).map((g, i) => ({
      name: `Robux ${g.name || `กลุ่ม ${i + 1}`}`.slice(0, 256),
      value: `\`\`\`${stock[i] != null ? stock[i].toLocaleString() : '—'}\`\`\``,
      inline: true,
    })));
  }

  await interaction.channel.send({ embeds: [embed], components: buildComponents(ctx, groups, stock, cfg.components || {}) });
  await interaction.editReply({ content: 'โพสต์แผงร้านแล้ว ✅' });
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
  const cfg = await ctx.services.embeds.getConfig('topup_method');
  const sel = (cfg.components && cfg.components.method_select) || {};
  const emoji = parseEmoji(sel.emoji);
  const embed = await ctx.services.embeds.renderEmbed('topup_method');
  const select = new StringSelectMenuBuilder()
    .setCustomId(ID.topupMethod)
    .setPlaceholder(String(sel.placeholder || 'เลือกช่องทางการเติมเงิน').slice(0, 150));
  const options = [
    new StringSelectMenuOptionBuilder().setLabel('พร้อมเพย์ธนาคาร').setValue('promptpay'),
    new StringSelectMenuOptionBuilder().setLabel('ซองอั่งเปาทรูมันนี่').setValue('truemoney'),
  ];
  if (emoji) {
    for (const opt of options) {
      try { opt.setEmoji(emoji); } catch (_e) { /* skip invalid emoji */ }
    }
  }
  select.addOptions(options);
  await interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  });
}

// topup_method select + voucher redeem are handled by the wallet-topup feature.

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
    [ID.topup]: onTopup,
    [ID.buy]: onBuy,
    [ID.buyModal]: onBuyModal,
    [ID.group]: onGroupSelect,
  },
};
