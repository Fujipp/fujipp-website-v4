// src/features/server-log/format.js
// Per-event embed builders. Each returns the event-specific part of the embed
// ({ color, title, description, fields }); index.js merges it onto the configurable
// `log_base` frame (author/footer + fallback color) before posting via the webhook.
//
// Inputs are the raw discord.js gateway args. Some may be partials (e.g. an
// uncached deleted message has no content) — every builder degrades gracefully.

// Accent palette (decimal — Discord embed color is an int).
const COLOR = {
  GREEN: 5763719,   // create / join / unban
  RED: 15548997,    // delete / leave / ban / kick
  AMBER: 16022395,  // edit / update
  BLURPLE: 5793266, // voice / neutral moderation
};

const FIELD_MAX = 1024;

function clip(s, n = FIELD_MAX) {
  const str = String(s ?? '');
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

// "Name (`id`)" — id always shown so a log is actionable even without the mention.
function userLine(user) {
  if (!user) return 'ไม่ทราบ';
  const tag = user.tag || user.username || 'ผู้ใช้';
  return `${tag} (\`${user.id}\`)`;
}

function channelLine(channel) {
  if (!channel) return 'ไม่ทราบ';
  return `<#${channel.id}> (\`${channel.id}\`)`;
}

// ─── Messages ────────────────────────────────────────────────────────────────
function messageDelete(message) {
  const fields = [
    { name: 'ผู้เขียน', value: userLine(message.author), inline: true },
    { name: 'ห้อง', value: channelLine(message.channel), inline: true },
  ];
  if (message.content) fields.push({ name: 'เนื้อหา', value: clip(message.content) });
  return { color: COLOR.RED, title: '🗑️ ลบข้อความ', fields };
}

function messageUpdate(oldMessage, newMessage) {
  return {
    color: COLOR.AMBER,
    title: '✏️ แก้ไขข้อความ',
    fields: [
      { name: 'ผู้เขียน', value: userLine(newMessage.author), inline: true },
      { name: 'ห้อง', value: channelLine(newMessage.channel), inline: true },
      { name: 'ก่อนแก้ไข', value: clip(oldMessage.content || '—') },
      { name: 'หลังแก้ไข', value: clip(newMessage.content || '—') },
    ],
  };
}

function messageDeleteBulk(messages, channel) {
  return {
    color: COLOR.RED,
    title: '🧹 ลบข้อความหลายรายการ',
    fields: [
      { name: 'จำนวน', value: String(messages.size), inline: true },
      { name: 'ห้อง', value: channelLine(channel), inline: true },
    ],
  };
}

// ─── Members ─────────────────────────────────────────────────────────────────
function memberAdd(member) {
  const created = member.user?.createdTimestamp;
  return {
    color: COLOR.GREEN,
    title: '📥 สมาชิกเข้าร่วม',
    description: `<@${member.id}>`,
    fields: [
      { name: 'สมาชิก', value: userLine(member.user), inline: true },
      ...(created ? [{ name: 'สร้างบัญชีเมื่อ', value: `<t:${Math.floor(created / 1000)}:R>`, inline: true }] : []),
    ],
  };
}

function memberRemove(member) {
  return {
    color: COLOR.RED,
    title: '📤 สมาชิกออก',
    fields: [{ name: 'สมาชิก', value: userLine(member.user), inline: true }],
  };
}

// guildMemberUpdate fires for many things — we only log nickname & role changes.
function memberUpdate(oldMember, newMember) {
  if (oldMember.nickname !== newMember.nickname) {
    return {
      color: COLOR.AMBER,
      title: '🏷️ เปลี่ยนชื่อเล่น',
      fields: [
        { name: 'สมาชิก', value: userLine(newMember.user), inline: true },
        { name: 'ก่อน', value: oldMember.nickname || '—', inline: true },
        { name: 'หลัง', value: newMember.nickname || '—', inline: true },
      ],
    };
  }

  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;
  const added = newRoles.filter((r) => !oldRoles.has(r.id));
  const removed = oldRoles.filter((r) => !newRoles.has(r.id));
  if (added.size === 0 && removed.size === 0) return null; // not a change we log

  const fields = [{ name: 'สมาชิก', value: userLine(newMember.user) }];
  if (added.size) fields.push({ name: 'เพิ่มยศ', value: clip(added.map((r) => `<@&${r.id}>`).join(' ')) });
  if (removed.size) fields.push({ name: 'ถอดยศ', value: clip(removed.map((r) => `<@&${r.id}>`).join(' ')) });
  return { color: COLOR.AMBER, title: '🎭 เปลี่ยนยศสมาชิก', fields };
}

// ─── Moderation ──────────────────────────────────────────────────────────────
function banAdd(ban) {
  return {
    color: COLOR.RED,
    title: '🔨 แบนสมาชิก',
    fields: [
      { name: 'สมาชิก', value: userLine(ban.user), inline: true },
      ...(ban.reason ? [{ name: 'เหตุผล', value: clip(ban.reason) }] : []),
    ],
  };
}

function banRemove(ban) {
  return {
    color: COLOR.GREEN,
    title: '♻️ ปลดแบนสมาชิก',
    fields: [{ name: 'สมาชิก', value: userLine(ban.user), inline: true }],
  };
}

function timeout(oldMember, newMember) {
  const oldUntil = oldMember.communicationDisabledUntilTimestamp || 0;
  const newUntil = newMember.communicationDisabledUntilTimestamp || 0;
  if (oldUntil === newUntil) return null;
  if (newUntil && newUntil > Date.now()) {
    return {
      color: COLOR.BLURPLE,
      title: '⏳ Timeout สมาชิก',
      fields: [
        { name: 'สมาชิก', value: userLine(newMember.user), inline: true },
        { name: 'จนถึง', value: `<t:${Math.floor(newUntil / 1000)}:F>`, inline: true },
      ],
    };
  }
  return {
    color: COLOR.GREEN,
    title: '⏳ ยกเลิก Timeout',
    fields: [{ name: 'สมาชิก', value: userLine(newMember.user), inline: true }],
  };
}

// ─── Channels ────────────────────────────────────────────────────────────────
function channelCreate(channel) {
  return {
    color: COLOR.GREEN,
    title: '➕ สร้างห้อง',
    fields: [{ name: 'ห้อง', value: `${channel.name} (\`${channel.id}\`)` }],
  };
}

function channelDelete(channel) {
  return {
    color: COLOR.RED,
    title: '➖ ลบห้อง',
    fields: [{ name: 'ห้อง', value: `${channel.name} (\`${channel.id}\`)` }],
  };
}

function channelUpdate(oldChannel, newChannel) {
  if (oldChannel.name === newChannel.name) return null; // only name changes are logged
  return {
    color: COLOR.AMBER,
    title: '✏️ แก้ไขห้อง',
    fields: [
      { name: 'ก่อน', value: oldChannel.name, inline: true },
      { name: 'หลัง', value: `${newChannel.name} (\`${newChannel.id}\`)`, inline: true },
    ],
  };
}

// ─── Voice ───────────────────────────────────────────────────────────────────
function voiceUpdate(oldState, newState) {
  const user = newState.member?.user || oldState.member?.user;
  const from = oldState.channelId;
  const to = newState.channelId;
  if (from === to) return null; // mute/deaf/stream toggles — not logged

  if (!from && to) {
    return { color: COLOR.GREEN, title: '🔊 เข้าห้องเสียง',
      fields: [{ name: 'สมาชิก', value: userLine(user), inline: true }, { name: 'ห้อง', value: `<#${to}>`, inline: true }] };
  }
  if (from && !to) {
    return { color: COLOR.RED, title: '🔇 ออกจากห้องเสียง',
      fields: [{ name: 'สมาชิก', value: userLine(user), inline: true }, { name: 'ห้อง', value: `<#${from}>`, inline: true }] };
  }
  return { color: COLOR.BLURPLE, title: '🔀 ย้ายห้องเสียง',
    fields: [{ name: 'สมาชิก', value: userLine(user), inline: true }, { name: 'จาก', value: `<#${from}>`, inline: true }, { name: 'ไป', value: `<#${to}>`, inline: true }] };
}

module.exports = {
  COLOR,
  messageDelete,
  messageUpdate,
  messageDeleteBulk,
  memberAdd,
  memberRemove,
  memberUpdate,
  banAdd,
  banRemove,
  timeout,
  channelCreate,
  channelDelete,
  channelUpdate,
  voiceUpdate,
};
