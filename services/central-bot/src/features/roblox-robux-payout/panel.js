// src/features/roblox-robux-payout/panel.js
// The interactive shop panel (config layer 3 components). /panel posts the shop_panel
// embed + a group select and action buttons. Component custom_ids are FIXED here
// (routed by bot.js); only the embed's appearance is configurable. Payment + payout
// flows are wired in later stages — for now topup/buy show their next embed/stub.

const {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} = require('discord.js');
const roblox = require('./roblox');
const { isAdmin } = require('../../lib/perms');
const buy = require('./buy');
const { buttonStyle, parseEmoji, applyButton } = require('../../lib/components');

// Fixed component ids (routed by prefix in bot.js).
const ID = {
  group: 'kanom:panel:group',
  topup: 'kanom:panel:topup',
  buy: 'kanom:panel:buy',
  balance: 'kanom:panel:balance',
  topupMethod: 'kanom:topup:method',
};

const thb = (satang) => `฿${(satang / 100).toLocaleString('th-TH')}`;

// Best-effort live Robux stock per group (read-only; tolerates missing cookies).
async function fetchStock(groups) {
  return Promise.all(groups.map((g) =>
    roblox.getGroupFunds({ groupKey: g.key }).then((f) => (f && f.ok ? f.robux : null)).catch(() => null)));
}

// ─── Countdown (PAYMENT_COUNTDOWN_*) ─────────────────────────────────────────
// PAYMENT_COUNTDOWN_TARGET accepts an ISO datetime (absolute target, like the
// legacy bot's pause date) or a number of seconds counted from when the panel
// was posted.
function countdownTarget(ctx, postedAt) {
  const raw = String(ctx.config.get('PAYMENT_COUNTDOWN_TARGET', '')).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return postedAt + Number(raw) * 1000;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : null;
}

function formatCountdown(targetMs) {
  const remaining = Math.floor((targetMs - Date.now()) / 1000);
  if (remaining <= 0) return 'ครบกำหนดแล้ว';
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return `${days} วัน ${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`;
}

// Build the full panel embed: configured shop_panel slot + live per-group stock
// fields + optional countdown.
async function buildPanelEmbed(ctx, groups, stock, postedAt) {
  const embed = await ctx.services.embeds.renderEmbed('shop_panel');
  if (groups.length) {
    embed.addFields(groups.slice(0, 25).map((g, i) => ({
      name: `Robux ${g.name || `กลุ่ม ${i + 1}`}`.slice(0, 256),
      value: `\`\`\`${stock[i] != null ? stock[i].toLocaleString() : '—'}\`\`\``,
      inline: true,
    })));
  }
  if (ctx.config.bool('PAYMENT_COUNTDOWN_ENABLED', false)) {
    const target = countdownTarget(ctx, postedAt);
    if (target) {
      embed.addFields({ name: '⏳ นับถอยหลัง', value: `\`\`\`${formatCountdown(target)}\`\`\``, inline: false });
    }
  }
  return embed;
}

// ─── Auto-refresh (port of the legacy payment.js 10s updater) ────────────────
// Keeps the posted panel's stock + countdown live. In-memory: a bot restart
// stops refreshing until an admin posts /panel again. Keyed by channel so
// re-posting /panel replaces the old refresher instead of stacking intervals
// that keep polling the Roblox API for an abandoned panel message.
const refreshTimers = new Map(); // channelId -> intervalId

function startPanelRefresh(message, ctx) {
  const intervalMs = Math.max(5_000, ctx.config.number('PAYMENT_REFRESH_INTERVAL', 10_000));
  const postedAt = Date.now();
  const channelId = message.channelId;

  const existing = refreshTimers.get(channelId);
  if (existing) clearInterval(existing);

  const stop = (intervalId) => {
    clearInterval(intervalId);
    if (refreshTimers.get(channelId) === intervalId) refreshTimers.delete(channelId);
  };

  const intervalId = setInterval(async () => {
    try {
      const groups = roblox.getGroupConfigs().list;
      const stock = groups.length ? await fetchStock(groups) : [];
      const cfg = await ctx.services.embeds.getConfig('shop_panel');
      const embed = await buildPanelEmbed(ctx, groups, stock, postedAt);
      await message.edit({ embeds: [embed], components: buildComponents(ctx, groups, stock, cfg.components || {}) });
    } catch (err) {
      console.error('[central-bot] panel refresh error:', err.message);
      if (/unknown message|missing access/i.test(err.message)) stop(intervalId);
    }
  }, intervalMs);

  refreshTimers.set(channelId, intervalId);
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

  // Buying goes through the group select above; the panel only offers topup/balance.
  const buttons = [
    applyButton(new ButtonBuilder().setCustomId(ID.topup).setStyle(buttonStyle(comp.btn_topup && comp.btn_topup.style, ButtonStyle.Primary)), comp.btn_topup, 'เติมเงิน'),
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
  const embed = await buildPanelEmbed(ctx, groups, stock, Date.now());

  const message = await interaction.channel.send({
    embeds: [embed],
    components: buildComponents(ctx, groups, stock, cfg.components || {}),
  });
  startPanelRefresh(message, ctx);
  await interaction.editReply({ content: 'โพสต์แผงร้านแล้ว ✅ (ยอดกลุ่ม + นับถอยหลังอัปเดตอัตโนมัติ)' });
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
  const roles = (cfg.components && cfg.components) || {};
  const embed = await ctx.services.embeds.renderEmbed('topup_method');

  // Buttons (not a select) so a member can pick a method, complete it, and pick again
  // without the menu sticking on the last choice. Label/emoji are configurable via the
  // topup_method component roles btn_promptpay / btn_truemoney (fall back to defaults).
  const mkButton = (id, label, style, fallbackEmoji, roleKey) => {
    const role = roles[roleKey] || {};
    const btn = new ButtonBuilder()
      .setCustomId(id)
      .setLabel(String(role.label || label).slice(0, 80))
      .setStyle(style);
    const emoji = parseEmoji(role.emoji) || fallbackEmoji;
    if (emoji) { try { btn.setEmoji(emoji); } catch (_e) { /* skip invalid emoji */ } }
    return btn;
  };

  const row = new ActionRowBuilder().addComponents(
    mkButton('kanom:topup:btn:promptpay', 'พร้อมเพย์ธนาคาร', ButtonStyle.Primary, '🏧', 'btn_promptpay'),
    mkButton('kanom:topup:btn:truemoney', 'ซองอั่งเปาทรูมันนี่', ButtonStyle.Success, '🧧', 'btn_truemoney'),
  );
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// topup_method select + voucher redeem are handled by the wallet-topup feature.
// Group select / buy button route into the full buy flow (eligibility check →
// package select → confirm → payout queue) in buy.js.

module.exports = {
  panelCommand: () =>
    new SlashCommandBuilder().setName('panel').setDescription('โพสต์แผงร้าน (แอดมินเท่านั้น)').toJSON(),
  handlePanel,
  components: {
    [ID.balance]: onBalance,
    [ID.topup]: onTopup,
    [ID.buy]: buy.onBuyButton,
    [ID.group]: buy.onGroupSelect,
    ...buy.components,
  },
};
