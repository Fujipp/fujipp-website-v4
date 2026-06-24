// src/features/order-management/index.js
// Order logging — port of the legacy discord-bot-002-idaxdshop /order command.
// An admin records a completed sale; the bot posts an "Order success" embed into the
// log channel (ORDER_LOG_CHANNEL_ID) and keeps a running order count it stamps onto
// that channel's name (ORDER_CHANNEL_NAME_TEMPLATE, {count} = the order number).
//
// The counter is stored per-bot in shop.order_counters (our database) via
// lib/shop-store-db. First time a channel is seen we seed the count from its existing
// embed count, matching legacy.
//
// Config keys (injected as env per subject):
//   ORDER_LOG_CHANNEL_ID        (CHANNEL_ID) — channel embeds are posted into + renamed
//   ORDER_CHANNEL_NAME_TEMPLATE (STRING)     — channel name template, {count} = order no.

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getOrderStore } = require('../../lib/shop-store-db');

const DEFAULT_NAME_TEMPLATE = '⭐ㆍเครดิตส่งของㆍ{count}';

function isTextSendable(ch) {
  return !!ch && 'send' in ch && typeof ch.send === 'function';
}

// First-run seed: count existing embeds in the log channel (includes the just-posted
// one), so an onboarded shop's counter continues from its real history.
async function countEmbedsInChannel(ch) {
  let lastId;
  let total = 0;
  // Cap the scan so a huge channel can't hang the interaction — legacy walked the whole
  // history, but bounding to ~5k messages keeps the worst case sane.
  for (let page = 0; page < 50; page += 1) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const messages = await ch.messages.fetch(options).catch(() => null);
    if (!messages || messages.size === 0) break;
    for (const m of messages.values()) {
      if (m.embeds?.length > 0) total += 1;
    }
    lastId = messages.last()?.id;
    if (messages.size < 100) break;
  }
  return total;
}

// Rename the log channel to the template (best-effort; needs ManageChannels).
async function setChannelNameSafe(ch, template, count) {
  const newName = String(template || DEFAULT_NAME_TEMPLATE).replace('{count}', String(count));
  if (!('setName' in ch)) return;
  try {
    const me = await ch.guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) return;
    if (ch.name !== newName) await ch.setName(newName).catch(() => {});
  } catch {
    /* ignore */
  }
}

async function handleOrder(interaction, ctx) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guild) {
    await interaction.editReply('❌ ใช้คำสั่งนี้ได้เฉพาะในกิลด์ครับ');
    return;
  }

  const logChannelId = ctx.config.get('ORDER_LOG_CHANNEL_ID');
  if (!logChannelId) {
    await interaction.editReply('❌ ร้านยังไม่ได้ตั้งค่าห้องบันทึกออเดอร์ (ORDER_LOG_CHANNEL_ID)');
    return;
  }

  const user = interaction.options.getUser('user', true);
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.editReply('❌ ไม่พบสมาชิกในกิลด์นี้');
    return;
  }

  const name = interaction.options.getString('name', true).trim();
  const price = interaction.options.getNumber('price', true);
  const quantity = interaction.options.getInteger('quantity', true);
  const attachment = interaction.options.getAttachment('attachment');

  if (price <= 0 || quantity <= 0) {
    await interaction.editReply('❌ ราคาและจำนวนสินค้าต้องมากกว่า 0');
    return;
  }

  // Closing line into the channel the command was run in (best-effort).
  const descriptionText = `️ <a:988244584020729896:1441043889015361547> คุณ ${member.displayName} : ได้ชำระค่าสินค้า/บริการ เรียบร้อยแล้ว <a:truthcheck:1406176830385426532>`;
  if (isTextSendable(interaction.channel)) {
    await interaction.channel.send({ content: descriptionText }).catch(() => {});
  }

  // Order-success embed (price shown per the order, not multiplied).
  const embed = new EmbedBuilder()
    .setTitle('ꔫ ꒰ 𝖮𝗋𝖽𝖾𝗋 𝗌𝗎𝖼𝖼𝖾𝗌𝗌 ✧˚ꪆৎ ｡')
    .setColor(0xf8bbd0)
    .setTimestamp(new Date())
    .setDescription(
      `<:1008576027259310121:1407769734509756538> **ผู้ซื้อสินค้า :** ${member.displayName}\n`
      + `<:7443pinkheart:1402694488790667405> **__𝗆𝖾𝗇𝗎__ :**   ${name}\n`
      + `<:7443pinkheart:1402694488790667405> **__𝗉𝗋𝗂𝖼𝖾𝗌__ :**   \`${price.toLocaleString()} บาท\`\n`
      + `<:7443pinkheart:1402694488790667405> **__𝖺𝗆𝗈𝗎𝗇𝗍__ :**   \`${quantity} ชิ้น\`\n`
      + `**𑣲 𝖲𝖳𝖠𝖳𝖴𝖲 :**   <a:979990:1404022929536323605> **ดำเนินการจัดส่งเรียบร้อย**\n`,
    )
    .setFooter({ text: '🟢 หากสินค้ามีปัญหาโปรดติดต่อแอดมิน' });
  if (user.avatar) embed.setThumbnail(user.displayAvatarURL({ size: 256 }));
  if (attachment) embed.setImage(attachment.url);

  // Resolve the log channel (cache then fetch).
  let logChannel = interaction.client.channels.cache.get(String(logChannelId));
  if (!logChannel) {
    logChannel = await interaction.client.channels.fetch(String(logChannelId)).catch(() => null);
  }
  if (!logChannel || !isTextSendable(logChannel) || !('messages' in logChannel)) {
    await interaction.editReply('❌ ไม่พบห้องบันทึกออเดอร์ หรือบอทส่งข้อความในห้องนั้นไม่ได้');
    return;
  }

  try {
    await logChannel.send({ embeds: [embed] });
  } catch {
    await interaction.editReply('❌ ส่งไปห้องบันทึกออเดอร์ไม่สำเร็จ — ตรวจสอบสิทธิ์บอทในห้องนั้น');
    return;
  }

  // Update the counter + channel name. First time a channel is seen: seed from its
  // existing embed count (includes the embed just posted); afterwards just +1.
  const store = getOrderStore(ctx.config.subjectId);
  let count;
  try {
    const existing = await store.peek(logChannelId);
    const initial = existing === null ? await countEmbedsInChannel(logChannel) : 0;
    count = await store.bumpAndGet(logChannelId, initial);
    const template = ctx.config.get('ORDER_CHANNEL_NAME_TEMPLATE', DEFAULT_NAME_TEMPLATE);
    await setChannelNameSafe(logChannel, template, count);
  } catch (err) {
    // The order itself is already logged; the counter is a nice-to-have, so don't fail.
    console.error('[central-bot] order-management counter update failed:', err.message);
  }

  await interaction.editReply(
    `✅ บันทึกการสั่งซื้อของ **${member.displayName}** เรียบร้อยแล้ว${count != null ? ` (ออเดอร์ที่ ${count})` : ''}`,
  );
}

module.exports = {
  code: 'order-management',
  name: 'Order Management',

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('order')
        .setDescription('บันทึกการสั่งซื้อสินค้า')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((o) => o.setName('user').setDescription('ผู้ซื้อสินค้า').setRequired(true))
        .addStringOption((o) => o.setName('name').setDescription('ชื่อสินค้า').setRequired(true))
        .addNumberOption((o) => o.setName('price').setDescription('ราคาทั้งหมด').setRequired(true))
        .addIntegerOption((o) => o.setName('quantity').setDescription('จำนวนสินค้า').setRequired(true))
        .addAttachmentOption((o) => o.setName('attachment').setDescription('แนบรูปภาพ (ถ้ามี)').setRequired(false)),
    ];
  },

  handlers: {
    order: handleOrder,
  },
};
