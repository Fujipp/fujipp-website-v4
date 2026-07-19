// src/features/app-premium-shop/buy.js
// Premium-app buy flow: category select → confirm/cancel → DM pre-check → debit
// wallet → gafiwshop api_buy → DM the purchased account to the buyer + post a
// public "delivered" embed (no credentials) to APP_PREMIUM_NOTIFY_CHANNEL + a full
// order record (with credentials) to APP_PREMIUM_LOG_CHANNEL. A private database
// job also records state so a restart cannot silently lose a debit or refund twice.

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const gafiw = require('./gafiw');
const { salePriceBaht, costBaht } = require('./pricing');
const {
  createJob, setJobStatus, claimDebitedJob, listRecoverableJobs,
} = require('../../lib/financial-jobs');

const ID = {
  confirm: 'app:buy:ok', // + ":<purchaseId>"
  cancel: 'app:buy:no',
};

const baht = (satang) => (satang / 100).toFixed(2);
const tsReadable = (date = new Date()) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);

async function errorEmbed(ctx, reason, avatarUrl) {
  return ctx.services.embeds.renderEmbed('app_error', {
    reason: reason || 'เกิดข้อผิดพลาด',
    datetime: tsReadable(),
    avatar: avatarUrl || '',
  });
}

// ─── Pending purchases (confirm step, in-memory with TTL) ────────────────────
const PENDING_TTL_MS = 5 * 60 * 1000;
const pendingPurchases = new Map(); // purchaseId -> purchase

function forgetPending(purchaseId, ctx) {
  const purchase = pendingPurchases.get(purchaseId);
  if (!purchase) return null;
  pendingPurchases.delete(purchaseId);
  ctx.lifecycle.clearTimer(purchase.expiryTimer);
  delete purchase.expiryTimer;
  return purchase;
}

async function ensureReady(interaction, ctx) {
  if (!ctx.config.bool('APP_PREMIUM_ENABLED', true)) {
    await interaction.reply({
      embeds: [await errorEmbed(ctx, 'ขณะนี้ระบบขายแอพพรีเมียมปิดให้บริการชั่วคราว', interaction.user.displayAvatarURL())],
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  }
  if (!ctx.services.wallet) {
    await interaction.reply({
      embeds: [await errorEmbed(ctx, 'ร้านนี้ยังไม่ได้เปิดระบบกระเป๋าเงิน (Shop Wallet & Top-up)', interaction.user.displayAvatarURL())],
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  }
  return true;
}

// Category dropdown → confirm step. Option value carries the type_id; everything
// else (price, stock) is re-read live so a stale panel can't sell at an old price.
async function onCategorySelect(interaction, ctx) {
  if (!(await ensureReady(interaction, ctx))) return;
  const typeId = interaction.values?.[0];
  const avatarUrl = interaction.user.displayAvatarURL();
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const res = await gafiw.getProducts(ctx, { fresh: true });
  const product = res.ok ? res.products.find((p) => p.typeId === typeId) : null;
  if (!product) {
    await interaction.editReply({ embeds: [await errorEmbed(ctx, res.ok ? 'ไม่พบสินค้านี้แล้ว กรุณากดอัพเดท Stock แล้วเลือกใหม่' : res.message, avatarUrl)] });
    return;
  }
  if (product.stock <= 0) {
    await interaction.editReply({ embeds: [await errorEmbed(ctx, `❌ ${product.name} สินค้าหมดชั่วคราว กรุณาเลือกรายการอื่น`, avatarUrl)] });
    return;
  }

  const priceSatang = Math.round(salePriceBaht(ctx, product) * 100);
  const balanceSatang = await ctx.services.wallet.getBalance(interaction.user.id);
  if (balanceSatang < priceSatang) {
    await interaction.editReply({
      embeds: [await errorEmbed(ctx, `ยอดเงินไม่เพียงพอ ราคา ${baht(priceSatang)} บาท แต่มี ${baht(balanceSatang)} บาท (ขาดอีก ${baht(priceSatang - balanceSatang)} บาท) กรุณากดเติมเงินก่อน`, avatarUrl)],
    });
    return;
  }

  const purchaseId = `${interaction.user.id}_${Date.now()}`;
  const expiryTimer = ctx.lifecycle.setTimeout(() => pendingPurchases.delete(purchaseId), PENDING_TTL_MS);
  pendingPurchases.set(purchaseId, {
    discordUserId: interaction.user.id,
    typeId: product.typeId,
    name: product.name,
    typeMenu: product.typeMenu,
    priceSatang,
    expiryTimer,
  });

  const embed = await ctx.services.embeds.renderEmbed('app_confirm', {
    name: product.name,
    category: product.typeMenu || '-',
    price: baht(priceSatang),
    stock: product.stock.toLocaleString(),
    balance: baht(balanceSatang),
    balance_after: baht(balanceSatang - priceSatang),
    image: product.image || '',
    avatar: avatarUrl || '',
  });
  await interaction.editReply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${ID.confirm}:${purchaseId}`).setLabel('ยืนยันการสั่งซื้อ').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`${ID.cancel}:${purchaseId}`).setLabel('ยกเลิก').setStyle(ButtonStyle.Danger),
    )],
  });
}

// Confirm → DM pre-check → re-validate live price/stock → debit → api_buy →
// deliver. The DM check runs BEFORE any money moves so a closed-DM buyer aborts
// cleanly instead of triggering the refund path with an already-bought account.
async function onConfirm(interaction, ctx) {
  const purchaseId = interaction.customId.split(':')[3] || '';
  const purchase = pendingPurchases.get(purchaseId);
  const avatarUrl = interaction.user.displayAvatarURL();

  if (!purchase || purchase.discordUserId !== interaction.user.id) {
    await interaction.update({
      embeds: [await errorEmbed(ctx, 'รายการหมดอายุหรือไม่พบ กรุณาเริ่มทำรายการใหม่', avatarUrl)],
      components: [],
    });
    return;
  }
  // Claim before any await — a rapid double-click must never buy twice.
  forgetPending(purchaseId, ctx);
  await interaction.update({ content: '⏳ กำลังทำรายการ...', embeds: [], components: [] });

  // DM pre-check.
  let dmChannel;
  try {
    dmChannel = await interaction.user.createDM();
    await dmChannel.send(`⏳ กำลังทำรายการซื้อ **${purchase.name}** กรุณารอสักครู่...`);
  } catch (_e) {
    await interaction.editReply({
      content: '',
      embeds: [await errorEmbed(ctx, 'ส่งข้อความส่วนตัวหาคุณไม่ได้ กรุณาเปิดรับ DM จากสมาชิกในเซิร์ฟเวอร์นี้ก่อน แล้วทำรายการใหม่ (ยังไม่ถูกหักเงิน)', avatarUrl)],
    });
    return;
  }

  // Live re-check: stock still there, price not moved above what was confirmed.
  const res = await gafiw.getProducts(ctx, { fresh: true });
  const product = res.ok ? res.products.find((p) => p.typeId === purchase.typeId) : null;
  if (!product || product.stock <= 0) {
    await interaction.editReply({
      content: '',
      embeds: [await errorEmbed(ctx, !res.ok ? res.message : 'สินค้าหมดพอดี ยังไม่ถูกหักเงิน กรุณาลองใหม่ภายหลัง', avatarUrl)],
    });
    return;
  }
  const liveSatang = Math.round(salePriceBaht(ctx, product) * 100);
  if (liveSatang > purchase.priceSatang) {
    await interaction.editReply({
      content: '',
      embeds: [await errorEmbed(ctx, `ราคาสินค้ามีการเปลี่ยนแปลง (${baht(liveSatang)} บาท) ยังไม่ถูกหักเงิน กรุณาเริ่มทำรายการใหม่`, avatarUrl)],
    });
    return;
  }

  const jobId = await createJob(
    ctx.config.subjectId, 'APP_PREMIUM', interaction.user.id, purchase.priceSatang, purchase,
  );

  // Debit first; any known failure after this point refunds exactly once.
  let balanceAfter;
  try {
    balanceAfter = await ctx.services.wallet.debit(interaction.user.id, purchase.priceSatang, {
      type: 'APP_PREMIUM',
      reference: `financial-job:${jobId}`,
      note: purchase.name,
    });
  } catch (err) {
    await setJobStatus(ctx.config.subjectId, jobId, 'FAILED', { error: err.message }).catch(() => {});
    const reason = err.code === 'INSUFFICIENT_FUNDS' ? 'ยอดเงินไม่พอ กรุณาเติมเงินก่อน' : 'ไม่สามารถหักเงินได้ กรุณาลองใหม่';
    await interaction.editReply({ content: '', embeds: [await errorEmbed(ctx, reason, avatarUrl)] });
    return;
  }

  await setJobStatus(ctx.config.subjectId, jobId, 'DEBITED');
  // PROCESSING means an external purchase may have happened. On restart these
  // jobs require review instead of risking a duplicate purchase or false refund.
  if (!(await claimDebitedJob(ctx.config.subjectId, jobId))) {
    await interaction.editReply({ content: '', embeds: [await errorEmbed(ctx, 'รายการนี้กำลังถูกประมวลผลอยู่แล้ว กรุณาติดต่อแอดมิน', avatarUrl)] });
    return;
  }
  const result = await gafiw.buyProduct(ctx, purchase.typeId);
  if (!result.ok) {
    let refundedBalance = null;
    try {
      const refund = await ctx.services.wallet.creditOnce(
        interaction.user.id, purchase.priceSatang, `financial-job:${jobId}`,
        { note: `app premium buy failed: ${purchase.name}` },
      );
      refundedBalance = refund.balance;
      await setJobStatus(ctx.config.subjectId, jobId, 'REFUNDED', { error: result.message });
    } catch (err) {
      console.error('[central-bot] app-premium refund failed:', err.message);
    }
    const reason = `สั่งซื้อจากร้านต้นทางไม่สำเร็จ: ${result.message}\n`
      + (refundedBalance != null
        ? `ระบบคืนเงิน ${baht(purchase.priceSatang)} บาทแล้ว (คงเหลือ ${baht(refundedBalance)} บาท)`
        : 'คืนเงินอัตโนมัติไม่สำเร็จ — ติดต่อแอดมินด่วน');
    await interaction.editReply({ content: '', embeds: [await errorEmbed(ctx, reason, avatarUrl)] });
    await sendLog(interaction.client, ctx, {
      success: false, purchase, buyer: interaction.user, error: result.message, raw: result.raw,
    });
    return;
  }

  const orderId = gafiw.pickOrderId(result.order);
  const accountBlock = formatAccountBlock(result.order);
  const datetime = tsReadable();
  await setJobStatus(ctx.config.subjectId, jobId, 'SUCCEEDED', { result: result.order })
    .catch((err) => ctx.log(`Could not persist successful app-premium order: ${err.message}`));

  // 1) DM the purchased account to the buyer.
  let dmOk = true;
  try {
    const dmEmbed = await ctx.services.embeds.renderEmbed('app_dm', {
      name: purchase.name,
      category: purchase.typeMenu || '-',
      price: baht(purchase.priceSatang),
      order_id: orderId,
      account: accountBlock,
      datetime,
      avatar: avatarUrl || '',
    });
    await dmChannel.send({ embeds: [dmEmbed] });
  } catch (err) {
    dmOk = false;
    console.error('[central-bot] app-premium DM failed:', err.message);
  }

  await interaction.editReply({
    content: '',
    embeds: [await ctx.services.embeds.renderEmbed('app_success', {
      name: purchase.name,
      price: baht(purchase.priceSatang),
      balance: baht(balanceAfter),
      order_id: orderId,
      datetime,
      avatar: avatarUrl || '',
    })],
  });

  // 2) Public "delivered" embed (no credentials).
  await sendNotify(interaction.client, ctx, { purchase, buyer: interaction.user, orderId, datetime });
  // 3) Full order record (with credentials) to the log channel — the order store.
  await sendLog(interaction.client, ctx, {
    success: true, purchase, buyer: interaction.user, orderId, accountBlock, dmOk, product,
  });
}

async function onReady(client, ctx) {
  const jobs = await listRecoverableJobs(ctx.config.subjectId, 'APP_PREMIUM');
  for (const row of jobs) {
    if (row.status === 'PROCESSING') {
      await setJobStatus(ctx.config.subjectId, row.id, 'REVIEW_REQUIRED', {
        error: 'Bot restarted while upstream purchase outcome was unknown',
      });
      continue;
    }
    try {
      const refund = await ctx.services.wallet.creditOnce(
        row.member_discord_id, Number(row.amount_satang), `financial-job:${row.id}`,
        { note: 'app premium recovery before upstream purchase' },
      );
      await setJobStatus(ctx.config.subjectId, row.id, 'REFUNDED', {
        error: 'Bot restarted before upstream purchase began',
      });
      const user = await client.users.fetch(String(row.member_discord_id)).catch(() => null);
      await user?.send(`ระบบคืนเงินรายการแอพพรีเมียมที่ค้างอยู่ ${baht(row.amount_satang)} บาทแล้ว (คงเหลือ ${baht(refund.balance)} บาท)`).catch(() => {});
    } catch (err) {
      console.error('[central-bot] app-premium recovery refund failed:', err.message);
    }
  }
}

async function onCancel(interaction, ctx) {
  const purchaseId = interaction.customId.split(':')[3] || '';
  const purchase = pendingPurchases.get(purchaseId);
  if (purchase?.discordUserId === interaction.user.id) forgetPending(purchaseId, ctx);
  await interaction.update({
    embeds: [await errorEmbed(ctx, 'ยกเลิกการสั่งซื้อแล้ว', interaction.user.displayAvatarURL())],
    components: [],
  });
}

// Render the upstream order object as readable `key : value` lines inside a code
// block. The api_buy payload shape is not formally documented, so show every
// primitive field rather than guessing which ones hold the credentials.
function formatAccountBlock(order) {
  if (!order || typeof order !== 'object') return '```(ไม่มีข้อมูลจากร้านต้นทาง)```';
  const skip = new Set(['ok', 'success', 'status', 'message', 'msg', 'count']);
  const lines = [];
  for (const [key, value] of Object.entries(order)) {
    if (skip.has(key.toLowerCase())) continue;
    if (value == null || typeof value === 'object') continue;
    lines.push(`${key} : ${String(value)}`);
  }
  const body = (lines.join('\n') || '(ไม่มีข้อมูลจากร้านต้นทาง)').slice(0, 950);
  return `\`\`\`${body}\`\`\``;
}

async function fetchTextChannel(client, channelId) {
  if (!channelId || !client) return null;
  const channel = client.channels.cache.get(String(channelId))
    || (await client.channels.fetch(String(channelId)).catch(() => null));
  return channel?.isTextBased?.() ? channel : null;
}

// Public delivery announcement (APP_PREMIUM_NOTIFY_CHANNEL, slot app_notify).
async function sendNotify(client, ctx, { purchase, buyer, orderId, datetime }) {
  try {
    const channel = await fetchTextChannel(client, ctx.config.get('APP_PREMIUM_NOTIFY_CHANNEL'));
    if (!channel) return;
    const embed = await ctx.services.embeds.renderEmbed('app_notify', {
      member: buyer.id,
      username: buyer.username,
      name: purchase.name,
      category: purchase.typeMenu || '-',
      price: baht(purchase.priceSatang),
      order_id: orderId,
      datetime,
      avatar: buyer.displayAvatarURL?.() || '',
    });
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[central-bot] app-premium notify failed:', err.message);
  }
}

// Admin log (APP_PREMIUM_LOG_CHANNEL). Fixed layout — this is the order record,
// including credentials and cost/profit, so it is not Embed-Designer editable.
async function sendLog(client, ctx, data) {
  try {
    const channel = await fetchTextChannel(client, ctx.config.get('APP_PREMIUM_LOG_CHANNEL'));
    if (!channel) return;
    const { purchase, buyer } = data;
    const fields = [
      { name: 'ผู้ซื้อ', value: `<@${buyer.id}> (\`${buyer.id}\`)`, inline: true },
      { name: 'สินค้า', value: `${purchase.name}\n(${purchase.typeMenu || '-'} / \`${purchase.typeId}\`)`, inline: true },
      { name: 'ราคาขาย', value: `${baht(purchase.priceSatang)} บาท`, inline: true },
    ];
    if (data.success) {
      const costSatang = data.product ? Math.round(costBaht(ctx, data.product) * 100) : null;
      if (costSatang != null) {
        fields.push(
          { name: 'ต้นทุน', value: `${baht(costSatang)} บาท`, inline: true },
          { name: 'กำไร', value: `${baht(purchase.priceSatang - costSatang)} บาท`, inline: true },
        );
      }
      fields.push(
        { name: 'เลขออเดอร์', value: String(data.orderId || '-'), inline: true },
        { name: 'ข้อมูลบัญชี', value: String(data.accountBlock || '-').slice(0, 1024), inline: false },
      );
      if (!data.dmOk) {
        fields.push({ name: '⚠️ ส่ง DM ไม่สำเร็จ', value: 'ลูกค้ายังไม่ได้รับข้อมูลบัญชี — ส่งให้ลูกค้าเองด้วยข้อมูลด้านบน', inline: false });
      }
    } else {
      fields.push({ name: 'สาเหตุ', value: String(data.error || '-').slice(0, 1024), inline: false });
    }
    await channel.send({
      embeds: [{
        color: data.success ? 0x57F287 : 0xED4245,
        title: data.success ? '🧾 ออเดอร์แอพพรีเมียมสำเร็จ' : '❌ ออเดอร์แอพพรีเมียมล้มเหลว (คืนเงินแล้ว)',
        fields,
        footer: { text: `app-premium-shop • ${tsReadable()}` },
      }],
    });
  } catch (err) {
    console.error('[central-bot] app-premium log failed:', err.message);
  }
}

module.exports = {
  onReady,
  onCategorySelect,
  components: {
    [ID.confirm]: onConfirm,
    [ID.cancel]: onCancel,
  },
};
