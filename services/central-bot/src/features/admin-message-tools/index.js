// src/features/admin-message-tools/index.js
// Admin messaging tools — port of the legacy discord-bot-002-idaxdshop /dm + /message.
//   /dm user                     → modal → send the member a DM
//   /message send channel [file] → modal → post a message (optional file) to a channel
//   /message sendfile channel file [caption] → post a file straight away
//   /message edit messageid      → modal → edit a message the bot sent (current channel)
//
// Modals are routed through the platform's component map (custom_id prefixes), not the
// ad-hoc client listeners the legacy bot used. Gating is purely Discord member
// permissions (Administrator for /dm, Manage Messages for /message) — no DB, no config.

const {
  SlashCommandBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle,
  PermissionFlagsBits, ChannelType,
} = require('discord.js');

const trunc = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const MSG_CHANNEL_TYPES = [
  ChannelType.GuildText, ChannelType.GuildAnnouncement,
  ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread,
];

// Pending /message send state (channel + attachments) keyed by the trigger interaction
// id, bridged from the slash command to its modal submit. Cleared on submit; entries
// self-expire so an abandoned modal can't leak memory.
const pendingSends = new Map();
function forgetSend(token, ctx) {
  const pending = pendingSends.get(token);
  if (!pending) return null;
  pendingSends.delete(token);
  ctx.lifecycle.clearTimer(pending.expiryTimer);
  return pending.data;
}

function rememberSend(token, data, ctx) {
  const expiryTimer = ctx.lifecycle.setTimeout(() => pendingSends.delete(token), 10 * 60 * 1000);
  pendingSends.set(token, { data, expiryTimer });
}

function isTextSendable(ch) {
  return !!ch && 'send' in ch && typeof ch.send === 'function';
}

// ─── /dm ─────────────────────────────────────────────────────────────────────
async function handleDm(interaction) {
  const target = interaction.options.getUser('user', true);
  if (target.bot) {
    await interaction.reply({ ephemeral: true, content: '⚠️ เลือกเป็นบอท ไม่สามารถส่ง DM ได้' }).catch(() => {});
    return;
  }
  const modal = new ModalBuilder()
    .setCustomId(`dm_send:${target.id}`)
    .setTitle(trunc(`DM → ${target.username}`, 45))
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('dm_content').setLabel('พิมพ์ข้อความที่จะส่ง')
        .setStyle(TextInputStyle.Paragraph).setRequired(true)
        .setPlaceholder(trunc(`ถึง ${target.tag} — สูงสุด 2000 ตัวอักษร`, 100)),
    ));
  await interaction.showModal(modal);
}

async function onDmSubmit(interaction) {
  const targetId = interaction.customId.slice('dm_send:'.length);
  await interaction.deferReply({ ephemeral: true });
  const content = (interaction.fields.getTextInputValue('dm_content') || '').slice(0, 2000);
  if (!content) { await interaction.editReply('❌ ต้องกรอกข้อความก่อนส่ง'); return; }
  const user = await interaction.client.users.fetch(targetId).catch(() => null);
  if (!user) { await interaction.editReply('❌ ไม่พบผู้ใช้ปลายทาง'); return; }
  try {
    await user.send({ content });
  } catch {
    await interaction.editReply('⚠️ ส่ง DM ไม่ได้ — ผู้รับอาจปิด DM หรือบอทถูกบล็อก');
    return;
  }
  await interaction.editReply(`✅ ส่ง DM ถึง <@${user.id}> (${user.tag}) เรียบร้อย`);
}

// ─── /message ────────────────────────────────────────────────────────────────
async function handleMessage(interaction, ctx) {
  if (!interaction.guild) { await interaction.reply({ ephemeral: true, content: '❌ ใช้คำสั่งนี้ได้เฉพาะในกิลด์ครับ' }); return; }
  const sub = interaction.options.getSubcommand(true);

  if (sub === 'send') {
    const channel = interaction.options.getChannel('channel', true);
    const file = interaction.options.getAttachment('file', false);
    const token = interaction.id;
    rememberSend(token, { channelId: channel.id, files: file ? [{ url: file.url, name: file.name }] : [] }, ctx);
    await interaction.showModal(new ModalBuilder()
      .setCustomId(`message_send:${token}`).setTitle('พิมพ์ข้อความที่จะส่ง')
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('message_content').setLabel('ข้อความที่จะส่ง (≤ 2000 ตัวอักษร)')
          .setStyle(TextInputStyle.Paragraph).setRequired(true),
      )));
    return;
  }

  if (sub === 'sendfile') {
    const channel = interaction.options.getChannel('channel', true);
    const file = interaction.options.getAttachment('file', true);
    const caption = interaction.options.getString('caption') ?? undefined;
    if (!isTextSendable(channel)) { await interaction.reply({ ephemeral: true, content: '❌ ห้องนี้ไม่รองรับการส่งไฟล์โดยตรง' }); return; }
    try {
      const sent = await channel.send({ content: caption, files: [{ attachment: file.url, name: file.name }] });
      await interaction.reply({ ephemeral: true, content: `✅ ส่งไฟล์เรียบร้อย: ${sent.url}` });
    } catch {
      await interaction.reply({ ephemeral: true, content: '❌ ส่งไฟล์ไม่สำเร็จ (อาจติดสิทธิ์หรือขนาดไฟล์เกิน)' });
    }
    return;
  }

  if (sub === 'edit') {
    const messageId = interaction.options.getString('messageid', true);
    const ch = interaction.channel;
    if (!ch || !ch.isTextBased()) { await interaction.reply({ ephemeral: true, content: '❌ คำสั่งนี้ใช้ได้เฉพาะในห้องข้อความครับ' }); return; }
    const msg = await ch.messages.fetch(messageId).catch(() => null);
    if (!msg) { await interaction.reply({ ephemeral: true, content: '❌ ไม่พบข้อความนั้นในห้องนี้' }); return; }
    if (msg.author?.id !== interaction.client.user?.id) {
      await interaction.reply({ ephemeral: true, content: '❌ แก้ได้เฉพาะข้อความที่บอทเป็นคนส่งเท่านั้น' });
      return;
    }
    await interaction.showModal(new ModalBuilder()
      .setCustomId(`message_edit:${messageId}`).setTitle('แก้ไขข้อความ')
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('new_content').setLabel('ข้อความใหม่ (≤ 2000 ตัวอักษร)')
          .setStyle(TextInputStyle.Paragraph).setRequired(true).setValue((msg.content ?? '').slice(0, 2000)),
      )));
  }
}

async function onMessageSendSubmit(interaction, ctx) {
  const token = interaction.customId.slice('message_send:'.length);
  await interaction.deferReply({ ephemeral: true });
  const pending = forgetSend(token, ctx);
  if (!pending) { await interaction.editReply('❌ คำขอหมดอายุ กรุณาเริ่มใหม่'); return; }
  const content = (interaction.fields.getTextInputValue('message_content') || '').slice(0, 2000);
  const channel = await interaction.client.channels.fetch(pending.channelId).catch(() => null);
  if (!isTextSendable(channel)) { await interaction.editReply('❌ ส่งไม่ได้ — ไม่พบห้องหรือบอทไม่มีสิทธิ์'); return; }
  try {
    const sent = await channel.send({
      content,
      files: pending.files.map((f) => ({ attachment: f.url, name: f.name })),
    });
    await interaction.editReply(`✅ ส่งข้อความเรียบร้อย: ${sent.url}`);
  } catch {
    await interaction.editReply('❌ ส่งข้อความไม่สำเร็จ (อาจติดสิทธิ์)');
  }
}

async function onMessageEditSubmit(interaction) {
  const messageId = interaction.customId.slice('message_edit:'.length);
  await interaction.deferReply({ ephemeral: true });
  const ch = interaction.channel;
  const msg = ch && ch.isTextBased() ? await ch.messages.fetch(messageId).catch(() => null) : null;
  if (!msg) { await interaction.editReply('❌ ไม่พบข้อความนั้นแล้ว'); return; }
  if (msg.author?.id !== interaction.client.user?.id) { await interaction.editReply('❌ แก้ได้เฉพาะข้อความที่บอทส่ง'); return; }
  const content = (interaction.fields.getTextInputValue('new_content') || '').slice(0, 2000);
  try {
    await msg.edit({ content });
    await interaction.editReply('✅ แก้ไขข้อความเรียบร้อย');
  } catch {
    await interaction.editReply('❌ แก้ไขไม่สำเร็จ');
  }
}

module.exports = {
  code: 'admin-message-tools',
  name: 'Admin Message Tools',

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('dm')
        .setDescription('ส่ง DM ถึงผู้ใช้ผ่าน Modal')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((o) => o.setName('user').setDescription('ผู้ใช้ที่จะ DM').setRequired(true)),
      new SlashCommandBuilder()
        .setName('message')
        .setDescription('ส่งหรือแก้ไขข้อความผ่าน Modal / แนบไฟล์')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand((sub) => sub.setName('send').setDescription('ส่งข้อความ (ผ่าน Modal) ไปยังห้องที่กำหนด, แนบไฟล์ได้')
          .addChannelOption((o) => o.setName('channel').setDescription('ห้องที่จะส่งข้อความ').addChannelTypes(...MSG_CHANNEL_TYPES).setRequired(true))
          .addAttachmentOption((o) => o.setName('file').setDescription('ไฟล์แนบ (ไม่บังคับ)').setRequired(false)))
        .addSubcommand((sub) => sub.setName('sendfile').setDescription('ส่งไฟล์อย่างเดียวไปยังห้องที่กำหนด (มี caption ได้)')
          .addChannelOption((o) => o.setName('channel').setDescription('ห้องที่จะส่งไฟล์').addChannelTypes(...MSG_CHANNEL_TYPES).setRequired(true))
          .addAttachmentOption((o) => o.setName('file').setDescription('ไฟล์แนบ (จำเป็น)').setRequired(true))
          .addStringOption((o) => o.setName('caption').setDescription('ข้อความประกอบไฟล์ (ไม่บังคับ)').setRequired(false)))
        .addSubcommand((sub) => sub.setName('edit').setDescription('แก้ไขข้อความที่บอทส่ง (ในห้องปัจจุบัน)')
          .addStringOption((o) => o.setName('messageid').setDescription('Message ID ของข้อความที่จะแก้ (ต้องเป็นข้อความของบอท)').setRequired(true))),
    ];
  },

  handlers: { dm: handleDm, message: handleMessage },

  components: {
    'dm_send:': onDmSubmit,
    'message_send:': onMessageSendSubmit,
    'message_edit:': onMessageEditSubmit,
  },
};
