// src/features/price-board/index.js
// Price Board — port of the legacy discord-bot-004-kanom-price. Posts a parent
// "board" embed with category buttons into a channel; clicking a category button
// opens that category's price embed (image + an order-room link) ephemerally.
// Optionally re-posts the board on a schedule so it stays near the bottom of an
// active channel (the legacy bot's 2-hour cron).
//
// Config keys (mirror billing.feature_variable_templates 1:1):
//   PRICE_BOARD_TARGET_CHANNEL_ID (CHANNEL_ID) — channel auto-repost/startup posts into
//   PRICE_BOARD_AUTO_REPOST       (BOOLEAN)    — re-post on a schedule
//   PRICE_BOARD_REPOST_HOURS      (NUMBER)     — hours between auto re-posts
//   PRICE_BOARD_SEND_ON_STARTUP   (BOOLEAN)    — post once when the bot boots
//   PRICE_BOARD_BUY_CHANNEL_URL   (STRING)     — fallback URL for the order-room link
//
// Categories are FIXED at 8 (price_cat1..price_cat8 embed slots). A category button
// only appears when the board slot's component role btn_catN has a label, so an admin
// shows/hides a category by editing the board embed in the Embed Designer. Component
// custom_ids are fixed here (kanom:priceboard:catN); only appearance is configurable.

const {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { isAdmin } = require('../../lib/perms');
const { buttonStyle, parseEmoji, applyButton } = require('../../lib/components');

const CATEGORIES = [1, 2, 3, 4, 5, 6, 7, 8];
const ID_PREFIX = 'kanom:priceboard:cat'; // + N
const catCustomId = (n) => `${ID_PREFIX}${n}`;

// Build the board: the configured price_board embed + one button per category that
// has a label. Buttons chunk into rows of 5 (Discord's per-row limit).
async function buildBoard(ctx) {
  const cfg = await ctx.services.embeds.getConfig('price_board');
  const embed = await ctx.services.embeds.renderEmbed('price_board');
  const comp = cfg.components || {};

  const buttons = [];
  for (const n of CATEGORIES) {
    const role = comp[`btn_cat${n}`];
    if (!role || !role.label) continue; // unlabeled category stays hidden
    buttons.push(applyButton(
      new ButtonBuilder().setCustomId(catCustomId(n)).setStyle(buttonStyle(role.style, ButtonStyle.Primary)),
      role,
      `หมวด ${n}`,
    ));
  }

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  return { embeds: [embed], components: rows };
}

// Post the board into PRICE_BOARD_TARGET_CHANNEL_ID (used by startup + auto-repost).
async function postBoard(client, ctx) {
  const channelId = ctx.config.get('PRICE_BOARD_TARGET_CHANNEL_ID');
  if (!channelId) return;
  const channel = client.channels.cache.get(String(channelId))
    || (await client.channels.fetch(String(channelId)).catch(() => null));
  if (!channel || !channel.isTextBased() || typeof channel.send !== 'function') {
    console.error(`[central-bot] price-board: target channel ${channelId} not found or not sendable`);
    return;
  }
  await channel.send(await buildBoard(ctx));
}

// Category button click → reply with that category's price embed (ephemeral) + the
// order-room link button. The link url comes from the slot's btn_buy.url if set, else
// the PRICE_BOARD_BUY_CHANNEL_URL config.
async function onCategoryClick(interaction, ctx) {
  const n = Number(interaction.customId.slice(ID_PREFIX.length));
  if (!CATEGORIES.includes(n)) return;
  const slot = `price_cat${n}`;

  const cfg = await ctx.services.embeds.getConfig(slot);
  const embed = await ctx.services.embeds.renderEmbed(slot, { member: `<@${interaction.user.id}>` });

  const rows = [];
  const buy = (cfg.components && cfg.components.btn_buy) || {};
  const url = buy.url || ctx.config.get('PRICE_BOARD_BUY_CHANNEL_URL');
  if (url && /^https?:\/\//i.test(url)) {
    rows.push(new ActionRowBuilder().addComponents(
      applyButton(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url), buy, 'ห้องสั่งซื้อสินค้า'),
    ));
  }
  await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
}

// /price-board — admin posts the board into the current channel.
async function handlePostBoard(interaction, ctx) {
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (เฉพาะแอดมินเซิร์ฟเวอร์)', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  await interaction.channel.send(await buildBoard(ctx));
  await interaction.editReply({ content: 'โพสต์บอร์ดราคาแล้ว ✅' });
}

// Auto-repost timer is in-memory: one process serves one subject, so a single timer
// is enough. A restart re-arms it from onReady. (Running the runtime on multiple
// nodes would double-post — same single-node assumption as the panel refresher.)
let repostTimer = null;

async function onReady(client, ctx) {
  if (ctx.config.bool('PRICE_BOARD_SEND_ON_STARTUP', false)) {
    await postBoard(client, ctx).catch((err) => {
      console.error('[central-bot] price-board: startup post failed:', err.message);
    });
  }

  if (ctx.config.bool('PRICE_BOARD_AUTO_REPOST', false)) {
    const hours = Math.max(0.25, ctx.config.number('PRICE_BOARD_REPOST_HOURS', 2));
    if (repostTimer) clearInterval(repostTimer);
    repostTimer = setInterval(() => {
      postBoard(client, ctx).catch((err) => {
        console.error('[central-bot] price-board: auto-repost failed:', err.message);
      });
    }, hours * 3600_000);
    console.log(`[central-bot] price-board: auto-repost every ${hours}h`);
  }
}

module.exports = {
  code: 'price-board',
  name: 'Price Board',

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('price-board')
        .setDescription('โพสต์บอร์ดราคา (แอดมินเท่านั้น)')
        .toJSON(),
    ];
  },

  handlers: {
    'price-board': handlePostBoard,
  },

  components: {
    [ID_PREFIX]: onCategoryClick, // matches kanom:priceboard:cat1..cat8 by prefix
  },

  onReady,
};
