// src/features/roblox-robux-payout/buy.js
// Full self-service buy flow — port of the legacy Kanom bank/robux_selector.js:
// eligibility check (username modal) → package select (filtered by wallet balance
// and group Robux stock) → confirm/cancel → debit → payout QUEUE with cooldown →
// success or automatic refund, plus a notification to ROBUX_NOTIFY_CHANNEL with
// the buyer's Roblox avatar. Money flows through ctx.services.wallet (satang).

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  MessageFlags,
} = require('discord.js');
const roblox = require('./roblox');

const ID = {
  userModal: 'kanom:buy:user',   // + ":<groupKey>"
  pkgSelect: 'kanom:buy:pkg',
  confirm: 'kanom:buy:ok',       // + ":<purchaseId>"
  cancel: 'kanom:buy:no',
};

const COLOR_NORMAL = 15902662;
const COLOR_ERROR = 16222858;
const COLOR_SUCCESS = 9107360;
const COLOR_CONFIRM = 16247178;
const ERROR_IMAGE = 'https://www.animatedimages.org/data/media/562/animated-line-image-0378.gif';
const SUCCESS_IMAGE = 'https://www.animatedimages.org/data/media/562/animated-line-image-0388.gif';

// ─── Packages ────────────────────────────────────────────────────────────────
// The 3.5 / 4 tables are Kanom's real price lists (some entries carry a bulk
// discount, so they are NOT a pure formula). Other rates fall back to ceil().
const PACKAGES_RATE_3_5 = [
  { robux: 200, price: 58 }, { robux: 300, price: 86 }, { robux: 350, price: 100 },
  { robux: 400, price: 115 }, { robux: 500, price: 143 }, { robux: 600, price: 172 },
  { robux: 800, price: 229 }, { robux: 1000, price: 286 }, { robux: 1200, price: 343 },
  { robux: 1400, price: 400 }, { robux: 1600, price: 455 }, { robux: 2000, price: 570 },
  { robux: 3000, price: 855 }, { robux: 4000, price: 1140 }, { robux: 5000, price: 1425 },
  { robux: 7000, price: 2000 }, { robux: 10000, price: 2850 }, { robux: 20000, price: 5700 },
];

const PACKAGES_RATE_4 = [
  { robux: 200, price: 50 }, { robux: 300, price: 75 }, { robux: 400, price: 100 },
  { robux: 500, price: 125 }, { robux: 600, price: 150 }, { robux: 800, price: 200 },
  { robux: 1200, price: 300 }, { robux: 1400, price: 350 }, { robux: 1600, price: 400 },
  { robux: 2000, price: 500 }, { robux: 3000, price: 750 }, { robux: 4000, price: 1000 },
  { robux: 5000, price: 1250 }, { robux: 7000, price: 1750 }, { robux: 10000, price: 2500 },
  { robux: 20000, price: 4900 },
];

const GENERIC_ROBUX_STEPS = [200, 300, 400, 500, 600, 800, 1000, 1200, 1400, 1600, 2000, 3000, 4000, 5000, 7000, 10000, 20000];

function getPackages(ctx) {
  const rate = ctx.config.number('ROBUX_RATE', 3.5);
  if (rate === 3.5) return PACKAGES_RATE_3_5;
  if (rate === 4) return PACKAGES_RATE_4;
  if (!rate || rate <= 0) return [];
  return GENERIC_ROBUX_STEPS.map((robux) => ({ robux, price: Math.ceil(robux / rate) }));
}

// ─── Embed helpers (Kanom's designed visuals, same as the legacy bot) ────────
function tsReadable(date = new Date()) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

const baht = (satang) => (satang / 100).toFixed(2);

function loadingEmbed(text, avatarUrl) {
  const e = new EmbedBuilder()
    .setColor(COLOR_NORMAL)
    .setTitle('<a:Ts_22_discord_3loading:1397892630729461841> กำลังประมวลผล')
    .setDescription(`\n> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n\`\`\`${text}\`\`\``);
  if (avatarUrl) e.setThumbnail(avatarUrl);
  return e;
}

function errorEmbed({ reason, robloxUsername, avatarUrl }) {
  const e = new EmbedBuilder()
    .setColor(COLOR_ERROR)
    .setTitle('<:Ts_12_discord_bbane:1397694208969543720> เกิดข้อผิดพลาด')
    .setDescription([
      '> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด',
      `\`\`\`${reason || 'เกิดข้อผิดพลาด'}\`\`\``,
      '> <:Ts_9_discord_member:1397694189575344298> : Roblox Username',
      `\`\`\`${robloxUsername || '-'}\`\`\``,
      '> <:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ',
      `\`\`\`${tsReadable()}\`\`\``,
    ].join('\n'))
    .setImage(ERROR_IMAGE);
  if (avatarUrl) e.setThumbnail(avatarUrl);
  return e;
}

function formatPayoutError(error) {
  const status = error?.status ? `HTTP ${error.status}` : '';
  const code = error?.code ? `code ${error.code}` : '';
  const message = String(error?.message || 'Unknown error').trim();
  const details = [message, status, code].filter(Boolean).join(' | ');

  if (/insufficient/i.test(message) || error?.code === 12) return `Robux ในกลุ่มไม่พอ (${details})`;
  if (/permission|authorized|forbidden/i.test(message) || error?.code === 23) return `บัญชี Roblox ไม่มีสิทธิ์ payout ในกลุ่มนี้ (${details})`;
  if (/2fa|two.step|challenge|verification|totp/i.test(message) || error?.code === 35) return `ยืนยัน 2FA ของ Roblox ไม่สำเร็จ (${details})`;
  if (/rate|too many/i.test(message) || error?.code === 28) return `Roblox จำกัดความถี่การโอนชั่วคราว (${details})`;
  return `Roblox ปฏิเสธการโอน (${details})`;
}

// ─── Pending purchases + payout queue (one per bot process) ──────────────────
const PENDING_TTL_MS = 5 * 60 * 1000;
const pendingPurchases = new Map(); // purchaseId -> purchase

function prunePending() {
  const now = Date.now();
  for (const [key, val] of pendingPurchases.entries()) {
    if (now - val.timestamp > PENDING_TTL_MS) pendingPurchases.delete(key);
  }
}

const payoutQueue = [];
let isProcessingQueue = false;

function addToQueue(job, ctx) {
  payoutQueue.push(job);
  processQueue(ctx);
}

async function processQueue(ctx) {
  if (isProcessingQueue || payoutQueue.length === 0) return;
  isProcessingQueue = true;
  const cooldownMs = Math.max(0, ctx.config.number('ROBUX_PAYOUT_COOLDOWN', 5)) * 1000;

  while (payoutQueue.length > 0) {
    const job = payoutQueue.shift();
    try {
      await processPayout(job, ctx);
    } catch (err) {
      console.error('[central-bot] payout queue error:', err.message);
    }
    if (payoutQueue.length > 0 && cooldownMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, cooldownMs));
    }
  }
  isProcessingQueue = false;
}

async function processPayout(job, ctx) {
  const { interaction, purchase } = job;
  const avatarUrl = interaction.user?.displayAvatarURL?.() || '';

  const payout = await roblox.makeOneTimePayout(
    purchase.robloxUserId, purchase.pkg.robux,
    purchase.groupKey ? { groupKey: purchase.groupKey } : null,
  );

  if (!payout.ok) {
    // Refund — the wallet was debited at confirm time.
    let refundedBalance = null;
    try {
      refundedBalance = await ctx.services.wallet.credit(purchase.discordUserId, purchase.priceSatang, {
        type: 'REFUND', note: 'robux payout failed',
      });
    } catch (err) {
      console.error('[central-bot] refund failed:', err.message);
    }
    const reason = formatPayoutError(payout.error);
    await interaction.editReply({
      embeds: [errorEmbed({
        reason: `โอน Robux ไม่สำเร็จ: ${reason}\n`
          + (refundedBalance != null
            ? `ระบบคืนเงิน ${baht(purchase.priceSatang)} บาทแล้ว (คงเหลือ ${baht(refundedBalance)} บาท)`
            : 'คืนเงินอัตโนมัติไม่สำเร็จ — ติดต่อแอดมินด่วน'),
        robloxUsername: purchase.robloxUsername,
        avatarUrl,
      })],
      components: [],
    }).catch(() => {});
    await sendNotification(interaction.client, ctx, {
      success: false,
      username: interaction.user?.username || 'Unknown',
      robloxUserId: purchase.robloxUserId,
      error: payout.error?.message || 'Unknown error',
    });
    return;
  }

  const balance = await ctx.services.wallet.getBalance(purchase.discordUserId);
  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLOR_SUCCESS)
      .setTitle('<:Ts_22_discord_1ture:1397892606209429584> โอน Robux สำเร็จ')
      .setDescription([
        '> <:Ts_7_discord_id:1397694178846310520> : Roblox ID',
        `\`\`\`${purchase.robloxUserId}\`\`\``,
        '> <:Icon_Square_robux_1:1397902872146083861> : Robux',
        `\`\`\`${purchase.pkg.robux} R$\`\`\``,
        '> <:Ts_19_discord_coin:1397694253676630066> : ราคา',
        `\`\`\`${purchase.pkg.price} บาท\`\`\``,
        '> <:Ts_19_discord_coin:1397694253676630066> : ยอดคงเหลือ',
        `\`\`\`${baht(balance)} บาท\`\`\``,
      ].join('\n'))
      .setThumbnail(avatarUrl)
      .setImage(SUCCESS_IMAGE)],
    components: [],
  }).catch(() => {});

  await sendNotification(interaction.client, ctx, {
    success: true,
    username: interaction.user?.username || 'Unknown',
    robloxUserId: purchase.robloxUserId,
    robux: purchase.pkg.robux,
    price: purchase.pkg.price,
  });
}

// Notification to ROBUX_NOTIFY_CHANNEL with the buyer's Roblox avatar.
async function sendNotification(client, ctx, data) {
  const channelId = ctx.config.get('ROBUX_NOTIFY_CHANNEL');
  if (!channelId || !client) return;
  try {
    const channel = client.channels.cache.get(String(channelId))
      || (await client.channels.fetch(String(channelId)).catch(() => null));
    if (!channel?.isTextBased?.()) return;

    const embed = new EmbedBuilder();
    if (data.robloxUserId) {
      const avatar = await roblox.getUserAvatarUrl(data.robloxUserId);
      if (avatar.ok) embed.setThumbnail(avatar.avatarUrl);
    }

    if (data.success) {
      embed
        .setColor(COLOR_NORMAL)
        .setTitle('<:Ts_22_discord_1ture:1397892606209429584> ทำรายการสำเร็จ')
        .setDescription([
          '> <:Ts_9_discord_member:1397694189575344298> : Discord Username',
          `\`\`\`${data.username}\`\`\``,
          '> <:Ts_7_discord_id:1397694178846310520> : Roblox ID',
          `\`\`\`${data.robloxUserId}\`\`\``,
          '> <:Icon_Square_robux_1:1397902872146083861> : Robux',
          `\`\`\`${data.robux} R$\`\`\``,
          '> <:Ts_19_discord_coin:1397694253676630066> : ราคา',
          `\`\`\`${data.price} บาท\`\`\``,
          '> <:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ',
          `\`\`\`${tsReadable()}\`\`\``,
        ].join('\n'))
        .setImage('https://pixelsafari.neocities.org/dividers/more/cat8.gif');
    } else {
      embed
        .setColor(COLOR_ERROR)
        .setTitle('<:Ts_12_discord_bbane:1397694208969543720> เกิดข้อผิดพลาด')
        .setDescription([
          '> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด',
          `\`\`\`${data.error || 'เกิดข้อผิดพลาด'}\`\`\``,
          '> <:Ts_9_discord_member:1397694189575344298> : Discord Username',
          `\`\`\`${data.username || '-'}\`\`\``,
          '> <:Ts_7_discord_id:1397694178846310520> : Roblox ID',
          `\`\`\`${data.robloxUserId || '-'}\`\`\``,
          '> <:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ',
          `\`\`\`${tsReadable()}\`\`\``,
        ].join('\n'))
        .setImage(ERROR_IMAGE);
    }
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[central-bot] notify failed:', err.message);
  }
}

// ─── Flow steps ───────────────────────────────────────────────────────────────
function ensureEnabled(interaction, ctx) {
  if (!ctx.config.bool('ROBUX_ENABLED', true)) {
    interaction.reply({
      embeds: [errorEmbed({
        reason: 'ขณะนี้ระบบเติม Robux ปิดให้บริการชั่วคราว กรุณาติดต่อ Admin หากมีข้อสงสัย',
        avatarUrl: interaction.user.displayAvatarURL(),
      })],
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  }
  return true;
}

// Open the username modal for the chosen group.
function usernameModal(group) {
  const key = group?.key ? String(group.key) : '';
  return new ModalBuilder()
    .setCustomId(key ? `${ID.userModal}:${key}` : ID.userModal)
    .setTitle(`เช็คสิทธิ์รับ Robux${group?.name ? ` (${group.name})` : ''}`.slice(0, 45))
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('username')
        .setLabel('🎮 กรอก Username Roblox ของคุณ')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('เช่น builderman')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(20),
    ));
}

// Group select (from the shop panel) → username modal.
async function onGroupSelect(interaction, ctx) {
  if (!ensureEnabled(interaction, ctx)) return;
  const key = interaction.values?.[0];
  const group = roblox.getGroupConfigs().map[key];
  if (!group) {
    await interaction.reply({
      embeds: [errorEmbed({ reason: 'ไม่พบกลุ่มที่เลือก', avatarUrl: interaction.user.displayAvatarURL() })],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  await interaction.showModal(usernameModal(group));
}

// Buy button → single group goes straight to the modal; multiple groups prompt.
async function onBuyButton(interaction, ctx) {
  if (!ensureEnabled(interaction, ctx)) return;
  const groups = roblox.getGroupConfigs().list;
  if (groups.length === 0) {
    await interaction.reply({
      embeds: [errorEmbed({ reason: 'ยังไม่ได้ตั้งค่า Roblox Group สำหรับระบบ Robux', avatarUrl: interaction.user.displayAvatarURL() })],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (groups.length === 1) {
    await interaction.showModal(usernameModal(groups[0]));
    return;
  }
  await interaction.reply({ content: 'เลือกกลุ่มที่ต้องการจากเมนูบนแผงร้านเพื่อซื้อ Robux', ephemeral: true });
}

// Username modal → eligibility check → package select.
async function onUserModal(interaction, ctx) {
  const groupKey = interaction.customId.split(':')[3] || null;
  const group = groupKey ? roblox.getGroupConfigs().map[groupKey] : null;
  const username = interaction.fields.getTextInputValue('username').trim();
  const avatarUrl = interaction.user.displayAvatarURL();

  await interaction.reply({
    embeds: [loadingEmbed('กำลังตรวจสอบข้อมูล', avatarUrl)],
    flags: MessageFlags.Ephemeral,
  });

  const result = await roblox.checkRobloxEligibility(username, groupKey ? { groupKey } : null);
  if (!result.ok || !result.eligible) {
    await interaction.editReply({
      embeds: [errorEmbed({ reason: result.message || 'ไม่สามารถตรวจสอบสิทธิ์ได้', robloxUsername: username, avatarUrl })],
    });
    return;
  }

  const funds = await roblox.getGroupFunds(groupKey ? { groupKey } : null);
  const groupRobux = funds.ok ? funds.robux : 0;
  const balanceSatang = await ctx.services.wallet.getBalance(interaction.user.id);
  const rate = ctx.config.number('ROBUX_RATE', 3.5);

  // Packages the group can actually pay out; balance only affects the ✅/❌ hint.
  const packages = getPackages(ctx).slice(0, 25);
  const options = packages
    .map((pkg, index) => ({ pkg, index }))
    .filter(({ pkg }) => groupRobux >= pkg.robux)
    .map(({ pkg, index }) => ({
      label: `${pkg.robux} Robux (${pkg.price} บาท)`,
      value: `${index}:${result.userId}:${groupKey || 'default'}:${encodeURIComponent(result.username)}`,
      description: balanceSatang >= pkg.price * 100 ? '✅' : '❌ ยอดเงินไม่พอ',
    }));

  if (options.length === 0) {
    await interaction.editReply({
      embeds: [errorEmbed({
        reason: 'ขณะนี้ยอด Robux ในกลุ่มไม่เพียงพอสำหรับทุก Package กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
        robloxUsername: result.username,
        avatarUrl,
      })],
      components: [],
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('<:Ts_22_discord_1ture:1397892606209429584> สามารถซื้อ Robux ได้แล้ว')
    .setDescription(
      `> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n\`\`\`${result.message}\`\`\`\n`
      + `> <:Ts_9_discord_member:1397694189575344298> : Roblox Username\n\`\`\`${result.username}\`\`\`\n`
      + `> <:Ts_19_discord_coin:1397694253676630066> : ยอดคงเหลือ\n\`\`\`${baht(balanceSatang)} บาท\`\`\`\n`
      + `> <:Ts_19_discord_coin:1397694253676630066> : เรทปัจจุบัน\n\`\`\`1 บาท = ${rate} Robux\`\`\`\n`
      + `> <:Icon_Square_robux_1:1397902872146083861> : Robux ในกลุ่ม\n\`\`\`${groupRobux.toLocaleString()} R$\`\`\`\n`
      + `> <:Ts_7_discord_id:1397694178846310520> : กลุ่มที่เลือก\n\`\`\`${group?.name || '-'}\`\`\`\n`,
    )
    .setThumbnail(avatarUrl)
    .setImage(SUCCESS_IMAGE);

  await interaction.editReply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(ID.pkgSelect)
        .setPlaceholder('🎮 เลือก Robux Package')
        .addOptions(options),
    )],
  });
}

// Package select → confirmation step.
async function onPackageSelect(interaction, ctx) {
  const selected = interaction.values?.[0];
  if (!selected) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const [pkgIndexRaw, robloxUserId, groupKeyRaw, usernameRaw] = selected.split(':');
  const pkg = getPackages(ctx)[Number.parseInt(pkgIndexRaw, 10)];
  const groupKey = groupKeyRaw === 'default' ? null : groupKeyRaw;
  const robloxUsername = usernameRaw ? decodeURIComponent(usernameRaw) : null;
  const avatarUrl = interaction.user.displayAvatarURL();

  if (!pkg) {
    await interaction.editReply({ embeds: [errorEmbed({ reason: 'ไม่พบ package ที่เลือก', avatarUrl })] });
    return;
  }

  const priceSatang = pkg.price * 100;
  const balanceSatang = await ctx.services.wallet.getBalance(interaction.user.id);
  if (balanceSatang < priceSatang) {
    await interaction.editReply({
      embeds: [errorEmbed({
        reason: `ยอดเงินไม่เพียงพอ (ขาดอีก ${baht(priceSatang - balanceSatang)} บาท)`,
        robloxUsername,
        avatarUrl,
      })],
    });
    return;
  }

  prunePending();
  const purchaseId = `${interaction.user.id}_${Date.now()}`;
  pendingPurchases.set(purchaseId, {
    discordUserId: interaction.user.id,
    robloxUserId,
    robloxUsername,
    pkg,
    priceSatang,
    groupKey,
    timestamp: Date.now(),
  });

  const confirmEmbed = new EmbedBuilder()
    .setColor(COLOR_CONFIRM)
    .setTitle('<:Icon_Square_robux_1:1397902872146083861>  ยืนยันการซื้อ Robux')
    .setDescription(
      '> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n```ตรวจสอบข้อมูลก่อนยืนยัน```\n'
      + `> <:Ts_7_discord_id:1397694178846310520> : Roblox ID\n\`\`\`${robloxUserId || 'N/A'}\`\`\`\n`
      + '> <:Ts_12_discord_abane:1397694204863315998> : เงื่อนไขการใช้บริการ\n```เมื่อกดยืนยัน ระบบจะหักเงินและโอน Robux ทันที```',
    )
    .setThumbnail(avatarUrl)
    .addFields(
      { name: '<:Icon_Square_robux_1:1397902872146083861> : Package', value: `\`\`\`${pkg.robux}\`\`\``, inline: true },
      { name: '<:Ts_19_discord_coin:1397694253676630066> : ราคา', value: `\`\`\`${pkg.price} บาท\`\`\``, inline: true },
      { name: '<:Ts_19_discord_coin:1397694253676630066> : ยอดเงินหลังการซื้อ', value: `\`\`\`${baht(balanceSatang - priceSatang)} บาท\`\`\``, inline: false },
    );

  await interaction.editReply({
    embeds: [confirmEmbed],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${ID.confirm}:${purchaseId}`).setLabel('ยืนยัน').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(ID.cancel).setLabel('ยกเลิก').setStyle(ButtonStyle.Danger),
    )],
  });
}

// Confirm → re-validate funds/restriction → debit → queue the payout.
async function onConfirm(interaction, ctx) {
  const purchaseId = interaction.customId.split(':')[3] || '';
  const purchase = pendingPurchases.get(purchaseId);
  const avatarUrl = interaction.user.displayAvatarURL();

  if (!purchase || purchase.discordUserId !== interaction.user.id) {
    await interaction.update({
      embeds: [errorEmbed({ reason: 'รายการหมดอายุหรือไม่พบ', avatarUrl })],
      components: [],
    });
    return;
  }

  // Ack immediately — funds/restriction checks and the queue can be slow.
  await interaction.update({
    embeds: [loadingEmbed('กำลังดำเนินการ...', avatarUrl)],
    components: [],
  });

  const funds = await roblox.getGroupFunds(purchase.groupKey ? { groupKey: purchase.groupKey } : null);
  if (!funds.ok || Number(funds.robux || 0) < purchase.pkg.robux) {
    pendingPurchases.delete(purchaseId);
    await interaction.editReply({
      embeds: [errorEmbed({
        reason: funds.ok
          ? `Robux ในกลุ่มไม่พอ ต้องใช้ ${purchase.pkg.robux} R$ แต่มี ${Number(funds.robux || 0).toLocaleString()} R$`
          : `ไม่สามารถเช็คยอด Robux ในกลุ่มได้ (${funds.error?.message || 'Unknown error'})`,
        robloxUsername: purchase.robloxUsername,
        avatarUrl,
      })],
      components: [],
    });
    return;
  }

  const restriction = await roblox.getPayoutRestriction(purchase.groupKey ? { groupKey: purchase.groupKey } : null);
  if (!restriction.ok || !restriction.canPayout) {
    pendingPurchases.delete(purchaseId);
    await interaction.editReply({
      embeds: [errorEmbed({
        reason: `กลุ่มนี้ยังไม่สามารถโอน Robux ได้ (${restriction.error?.message || 'payout ถูกปิดโดย Roblox'})`,
        robloxUsername: purchase.robloxUsername,
        avatarUrl,
      })],
      components: [],
    });
    return;
  }

  // Debit first; the queue refunds on payout failure.
  let balanceAfter;
  try {
    balanceAfter = await ctx.services.wallet.debit(interaction.user.id, purchase.priceSatang, {
      type: 'ROBUX_REDEEM',
      note: `${purchase.pkg.robux} Robux → ${purchase.robloxUsername || purchase.robloxUserId}`,
    });
  } catch (err) {
    pendingPurchases.delete(purchaseId);
    const reason = err.code === 'INSUFFICIENT_FUNDS' ? 'ยอดเงินไม่พอ กรุณาเติมเงินก่อน' : 'ไม่สามารถหักเงินได้';
    await interaction.editReply({
      embeds: [errorEmbed({ reason, robloxUsername: purchase.robloxUsername, avatarUrl })],
      components: [],
    });
    return;
  }

  pendingPurchases.delete(purchaseId);
  addToQueue({ interaction, purchase }, ctx);

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLOR_SUCCESS)
      .setTitle('<:Ts_22_discord_1ture:1397892606209429584> กำลังดำเนินการ...')
      .setDescription(
        `> <:Ts_4_discord_trade:1397694172416180236> : รายละเอียด\n\`\`\`หักเงินเรียบร้อย! กำลังโอน Robux... (คิว #${payoutQueue.length})\`\`\`\n`
        + `> <:Icon_Square_robux_1:1397902872146083861> : Robux\n\`\`\`${purchase.pkg.robux} R$\`\`\`\n`
        + `> <:Ts_19_discord_coin:1397694253676630066> : ราคา\n\`\`\`${purchase.pkg.price} บาท\`\`\`\n`
        + `> <:Ts_19_discord_coin:1397694253676630066> : ยอดคงเหลือ\n\`\`\`${baht(balanceAfter)} บาท\`\`\`\n`,
      )
      .setThumbnail(avatarUrl)
      .setImage(SUCCESS_IMAGE)],
    components: [],
  });
}

async function onCancel(interaction) {
  await interaction.update({
    embeds: [errorEmbed({ reason: 'ยกเลิกการซื้อ Robux แล้ว', avatarUrl: interaction.user.displayAvatarURL() })],
    components: [],
  });
}

module.exports = {
  components: {
    [ID.userModal]: onUserModal,
    [ID.pkgSelect]: onPackageSelect,
    [ID.confirm]: onConfirm,
    [ID.cancel]: onCancel,
  },
  onGroupSelect,
  onBuyButton,
};
