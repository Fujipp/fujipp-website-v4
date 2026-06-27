// src/features/runtime-monitor/index.js
// Runtime Monitor — an ADMIN-ONLY command (`/runtime`) that posts a single live
// status panel into the channel it was run in: a VPS/slot usage summary plus a
// compact list of every bot instance on the platform (owner + status). The panel
// is PUBLIC and edits itself in place every minute so the operator gets a live
// view without re-running the command.
//
// Gated to the operator via the platform's standard admin check (lib/perms.isAdmin):
// a user with the server's Administrator permission OR an id in AUTHORIZED_USER_IDS.
// This matches the other owner-only commands (/panel, /wallet-add, /robux-payout).
// The bot lives in the operator's own server, so Administrator there == the operator.
//
// LIVE LOOP (in-memory, single panel): running /runtime starts one self-updating
// message and an interval that re-edits it every 60s. Running /runtime again starts
// a fresh panel in the current channel; the previous message simply stops updating
// (freezes). State is in memory only, so a bot restart ends the loop — re-run
// /runtime to start a new live panel. One runtime process serves one subject, so a
// single module-level timer is enough (same single-node assumption as price-board).
//
// VPS/slot usage: a seat (bots.vps_slots) is "in use" when an ACTIVE
// billing.runtime_subscriptions row points at it (vps_slot_id). This mirrors the
// web admin's occupancy source (VpsNodeAdminService.occupiedCount /
// billing RuntimeSlotService.occupiedSlotIds), so the numbers match the VPS cabinet.
//
// Bot status shown is bots.bot_instances.status (a snapshot updated on
// start/stop/restart), not live pm2 state — a crashed bot may still read RUNNING
// here. The web admin panel has true-live pm2 status.
//
// Config keys: none. Loads only when the 'runtime-monitor' feature is enabled.

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../lib/db');
const { isAdmin } = require('../../lib/perms');

const REFRESH_MS = 60_000; // edit the live panel every minute

// bots.bot_instances.status → colour + status dot.
const STATUS = {
  RUNNING:   { color: 0x2e9e73, dot: '🟢' },
  STOPPED:   { color: 0x6b7280, dot: '⚪' },
  CRASHED:   { color: 0xd64545, dot: '🔴' },
  SUSPENDED: { color: 0xd64545, dot: '🔴' },
  READY:     { color: 0x4b9fd6, dot: '🔵' },
  CREATED:   { color: 0x9aa0a6, dot: '⚫' },
};
const NEUTRAL = 0x9aa0a6;

function ownerLabel(row) {
  return row.display_name || row.username || row.email || row.user_id.slice(0, 8);
}

// Gather everything the panel needs in two queries (bots + VPS usage).
async function loadData() {
  const bots = await db.query(
    `SELECT b.name, b.status, b.user_id,
            p.display_name, p.username, p.email
       FROM bots.bot_instances b
       JOIN public.profiles p ON p.id = b.user_id
      ORDER BY b.created_at`,
  );

  // Per node: capacity, reservation, and seats held by an ACTIVE runtime.
  const vps = await db.query(
    `SELECT n.label, n.name, n.status, n.max_slots, n.reserved_slots,
            COUNT(r.vps_slot_id) AS used
       FROM bots.vps_nodes n
       LEFT JOIN bots.vps_slots s ON s.node_id = n.id
       LEFT JOIN billing.runtime_subscriptions r
              ON r.vps_slot_id = s.id AND r.status = 'ACTIVE'
      GROUP BY n.id, n.label, n.name, n.status, n.max_slots, n.reserved_slots
      ORDER BY n.name`,
  );

  return { bots: bots.rows, nodes: vps.rows };
}

function buildEmbed({ bots, nodes }) {
  // ── VPS / slot summary ──────────────────────────────────────────────────────
  let totalUsed = 0;
  let totalMax = 0;
  const vpsLines = nodes.map((n) => {
    const max = Number(n.max_slots) || 0;
    const reserved = Number(n.reserved_slots) || 0;
    const used = Number(n.used) || 0;
    const free = Math.max(0, max - reserved - used);
    totalUsed += used;
    totalMax += max;
    const name = n.label || n.name;
    return `🖥️ **${name}** — ใช้ ${used}/${max} (จอง ${reserved}, ว่าง ${free}) · \`${n.status}\``;
  });
  if (vpsLines.length === 0) vpsLines.push('— ยังไม่มี VPS ในระบบ');

  // ── bot list ────────────────────────────────────────────────────────────────
  const botLines = bots.map((b) => {
    const meta = STATUS[b.status] || STATUS.CREATED;
    return `${meta.dot} **${b.name}** — ${ownerLabel(b)} · \`${b.status}\``;
  });

  const allRunning = bots.length > 0 && bots.every((b) => b.status === 'RUNNING');

  const embed = new EmbedBuilder()
    .setColor(allRunning ? STATUS.RUNNING.color : NEUTRAL)
    .setTitle('🛰️ Runtime Monitor')
    .addFields({
      name: `VPS / Slot — รวมที่ใช้ ${totalUsed}/${totalMax}`,
      value: vpsLines.join('\n'),
    })
    .addFields({
      name: `บอททั้งหมด (${bots.length})`,
      value: botLines.length ? botLines.join('\n') : 'ยังไม่มีบอทในระบบ',
    })
    .setFooter({ text: 'อัปเดตทุก 1 นาที' })
    .setTimestamp(new Date());

  return embed;
}

// ── live panel state (in-memory, single panel) ────────────────────────────────
let live = { timer: null, channelId: null, messageId: null };

function stopLive() {
  if (live.timer) clearInterval(live.timer);
  live = { timer: null, channelId: null, messageId: null };
}

// Re-edit the live message. Stops cleanly if the message was deleted.
async function tick(client) {
  if (!live.messageId) return;
  let message;
  try {
    const channel = await client.channels.fetch(String(live.channelId));
    message = await channel.messages.fetch(String(live.messageId));
  } catch (err) {
    // Unknown Message/Channel (10003/10008) → it's gone; stop quietly.
    if (err && (err.code === 10008 || err.code === 10003)) {
      stopLive();
      return;
    }
    console.error('[central-bot] runtime-monitor: fetch failed:', err.message);
    return;
  }
  try {
    const data = await loadData();
    await message.edit({ embeds: [buildEmbed(data)] });
  } catch (err) {
    if (err && err.code === 10008) { stopLive(); return; }
    console.error('[central-bot] runtime-monitor: refresh failed:', err.message);
  }
}

async function handleRuntime(interaction, ctx) {
  // Operator-only: server Administrator or an id in AUTHORIZED_USER_IDS.
  if (!isAdmin(interaction, ctx)) {
    await interaction.reply({ content: 'คำสั่งนี้ใช้ได้เฉพาะผู้ดูแลเท่านั้น', flags: MessageFlags.Ephemeral }).catch(() => {});
    return;
  }

  await interaction.deferReply(); // public

  const data = await loadData();

  // Post the panel publicly; nothing in owner names may ping anyone.
  await interaction.editReply({
    embeds: [buildEmbed(data)],
    allowedMentions: { parse: [] },
  });
  const message = await interaction.fetchReply();

  // Start a fresh live loop on this message; any previous panel freezes.
  stopLive();
  live = { timer: null, channelId: message.channelId, messageId: message.id };
  live.timer = setInterval(() => tick(interaction.client), REFRESH_MS);
}

module.exports = {
  code: 'runtime-monitor',
  name: 'Runtime Monitor',

  commands() {
    return [
      new SlashCommandBuilder()
        .setName('runtime')
        .setDescription('โพสต์แผงสถานะ runtime แบบสด (VPS/slot + ทุกบอท) ในห้องนี้ (เฉพาะผู้ดูแล)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    ];
  },

  handlers: {
    runtime: handleRuntime,
  },
};
