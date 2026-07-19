// src/features/app-premium-shop/panel.js
// /app-panel posts the premium-app shop panel: the app_panel embed + up to 3
// category dropdowns (live products from gafiwshop) + เติมเงิน / เช็คยอดเงิน /
// อัพเดท Stock buttons. Component custom_ids are fixed (routed by bot.js); only
// the appearance is configurable via the app_panel slot's component roles.
// เติมเงิน reuses the wallet-topup method picker (kanom:topup:open).

const {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags,
} = require('discord.js');
const gafiw = require('./gafiw');
const buy = require('./buy');
const { salePriceBaht, marginTable, categorize } = require('./pricing');
const { isAdmin } = require('../../lib/perms');
const { buttonStyle, parseEmoji, applyButton } = require('../../lib/components');

const ID = {
  category: 'app:panel:cat', // + ":<1|2|3>"
  balance: 'app:panel:balance',
  stock: 'app:panel:stock',
};

const thb = (satang) => `฿${(satang / 100).toLocaleString('th-TH')}`;

// Substitute {{var}} placeholders in a component template string.
function fillVars(template, vars) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_m, key) => (vars[key] != null ? String(vars[key]) : ''));
}

async function buildPanel(ctx) {
  const res = await gafiw.getProducts(ctx, { fresh: true });
  const products = res.ok ? res.products : [];
  const totalStock = products.reduce((sum, p) => sum + Math.max(0, p.stock), 0);

  const cfg = await ctx.services.embeds.getConfig('app_panel');
  const comp = cfg.components || {};
  const embed = await ctx.services.embeds.renderEmbed('app_panel', {
    total_stock: totalStock.toLocaleString(),
    product_count: products.length.toLocaleString(),
    updated_at: new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
  });

  const rows = [];
  const table = marginTable(ctx);
  const categories = categorize(ctx, products);
  categories.forEach((items, i) => {
    if (!items.length) return;
    const role = comp[`cat_select_${i + 1}`] || {};
    const optionEmoji = parseEmoji(role.emoji);
    const labelTpl = String(role.option_label || '{{name}}');
    const descTpl = String(role.option_description || '💰 ราคา {{price}} บาท • คงเหลือ {{stock}} ชิ้น');
    const select = new StringSelectMenuBuilder()
      .setCustomId(`${ID.category}:${i + 1}`)
      .setPlaceholder(String(role.placeholder || `🎬 เลือกแอพที่ต้องการหมวดที่ ${i + 1}`).slice(0, 150))
      .addOptions(items.map((p) => {
        const vars = {
          name: p.name,
          price: salePriceBaht(ctx, p, table).toLocaleString('th-TH'),
          stock: p.stock.toLocaleString(),
          category: p.typeMenu,
        };
        const opt = new StringSelectMenuOptionBuilder()
          .setLabel(fillVars(labelTpl, vars).slice(0, 100) || p.name.slice(0, 100))
          .setValue(p.typeId)
          .setDescription((p.stock > 0
            ? fillVars(descTpl, vars)
            : `❌ สินค้าหมดชั่วคราว • ราคา ${vars.price} บาท`).slice(0, 100));
        if (optionEmoji) { try { opt.setEmoji(optionEmoji); } catch (_e) { /* skip */ } }
        return opt;
      }));
    rows.push(new ActionRowBuilder().addComponents(select));
  });

  rows.push(new ActionRowBuilder().addComponents(
    applyButton(new ButtonBuilder().setCustomId('kanom:topup:open').setStyle(buttonStyle(comp.btn_topup?.style, ButtonStyle.Success)), comp.btn_topup, 'เติมเงิน'),
    applyButton(new ButtonBuilder().setCustomId(ID.balance).setStyle(buttonStyle(comp.btn_balance?.style, ButtonStyle.Primary)), comp.btn_balance, 'เช็คยอดเงิน'),
    applyButton(new ButtonBuilder().setCustomId(ID.stock).setStyle(buttonStyle(comp.btn_stock?.style, ButtonStyle.Secondary)), comp.btn_stock, 'อัพเดท Stock สินค้า'),
  ));

  return { ok: res.ok, message: res.message, embeds: [embed], components: rows };
}

// /app-panel — admin posts the shop panel into the channel.
async function handlePanel(interaction, ctx) {
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  const panel = await buildPanel(ctx);
  await interaction.channel.send({ embeds: panel.embeds, components: panel.components });
  await interaction.editReply({
    content: panel.ok
      ? 'โพสต์แผงร้านแอพพรีเมียมแล้ว ✅ (กด "อัพเดท Stock สินค้า" เพื่อรีเฟรชรายการ)'
      : `โพสต์แผงแล้ว แต่ดึงสินค้าไม่สำเร็จ: ${panel.message} — กด "อัพเดท Stock สินค้า" เพื่อลองใหม่`,
  });
}

// อัพเดท Stock — anyone can refresh, but a short shared cooldown stops the panel
// from hammering the upstream API when many members click at once.
const STOCK_COOLDOWN_MS = 10_000;
let lastStockRefresh = 0;

async function onUpdateStock(interaction, ctx) {
  const now = Date.now();
  if (now - lastStockRefresh < STOCK_COOLDOWN_MS) {
    await interaction.reply({
      content: `⏳ เพิ่งอัพเดทไปเมื่อครู่ ลองอีกครั้งใน ${Math.ceil((STOCK_COOLDOWN_MS - (now - lastStockRefresh)) / 1000)} วินาที`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  lastStockRefresh = now;
  await interaction.deferUpdate();
  const panel = await buildPanel(ctx);
  // On a fetch failure keep the old panel rather than blanking the dropdowns.
  if (panel.ok) await interaction.message.edit({ embeds: panel.embeds, components: panel.components }).catch(() => {});
  await interaction.followUp({
    content: panel.ok ? '✅ อัพเดท Stock ล่าสุดแล้ว' : `❌ อัพเดทไม่สำเร็จ: ${panel.message}`,
    flags: MessageFlags.Ephemeral,
  }).catch(() => {});
}

async function onBalance(interaction, ctx) {
  if (!ctx.services.wallet) {
    await interaction.reply({ content: 'ระบบกระเป๋าเงินยังไม่เปิด', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  const balance = await ctx.services.wallet.getBalance(interaction.user.id);
  const embed = await ctx.services.embeds.renderEmbed('balance', {
    member: interaction.user.id,
    balance: thb(balance),
  });
  await interaction.editReply({ embeds: [embed] });
  const unsubscribe = ctx.services.wallet.subscribeBalance(interaction.user.id, async (nextBalance) => {
    try {
      const nextEmbed = await ctx.services.embeds.renderEmbed('balance', {
        member: interaction.user.id,
        balance: thb(nextBalance),
      });
      await interaction.editReply({ embeds: [nextEmbed] });
    } catch {
      unsubscribe();
    }
  });
}

module.exports = {
  panelCommand: () =>
    new SlashCommandBuilder().setName('app-panel').setDescription('โพสต์แผงร้านแอพพรีเมียม (แอดมินเท่านั้น)').toJSON(),
  handlePanel,
  components: {
    [ID.category]: buy.onCategorySelect,
    [ID.balance]: onBalance,
    [ID.stock]: onUpdateStock,
    ...buy.components,
  },
};
