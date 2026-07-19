// Runtime Expiry Alert — a permanent system feature granted to every customer bot.
// It checks the bot's active Runtime and sends each selected milestone once via DM,
// a configured server channel, or both. Delivery receipts live in Postgres so a bot
// restart cannot repeat an alert that Discord already accepted.

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const db = require('../../lib/db');

const CHECK_MS = 60_000;
const LOGO_PATH = path.join(__dirname, 'fujipp-logo.png');
const LOGO_NAME = 'fujipp-logo.png';
const DELIVERY = new Set(['DM', 'CHANNEL', 'BOTH', 'DISABLED']);
const MILESTONES = [
  { key: '7D', env: 'RUNTIME_ALERT_7D', milliseconds: 7 * 24 * 60 * 60 * 1000, label: '7 วัน' },
  { key: '3D', env: 'RUNTIME_ALERT_3D', milliseconds: 3 * 24 * 60 * 60 * 1000, label: '3 วัน' },
  { key: '1D', env: 'RUNTIME_ALERT_1D', milliseconds: 24 * 60 * 60 * 1000, label: '1 วัน' },
  { key: '1H', env: 'RUNTIME_ALERT_1H', milliseconds: 60 * 60 * 1000, label: '1 ชั่วโมง' },
];

function enabled(value, fallback = true) {
  if (value == null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function configuredMilestones(ctx) {
  return MILESTONES.filter((item) => enabled(ctx.config.get(item.env)));
}

async function loadRuntime(subjectId) {
  const { rows } = await db.query(
    `SELECT id,
            current_period_end,
            ((current_period_end + 1)::timestamp AT TIME ZONE 'Asia/Bangkok') AS expires_at
       FROM billing.runtime_subscriptions
      WHERE external_subject_id = $1
        AND status IN ('ACTIVE', 'PAST_DUE')
      ORDER BY current_period_end DESC
      LIMIT 1`,
    [subjectId],
  );
  return rows[0] || null;
}

function dueMilestone(runtime, milestones) {
  const remaining = new Date(runtime.expires_at).getTime() - Date.now();
  if (remaining <= 0) return null;

  // Pick only the nearest selected threshold already crossed. This prevents a bot
  // that was offline from sending several stale alerts together when it returns.
  return [...milestones]
    .sort((a, b) => a.milliseconds - b.milliseconds)
    .find((item) => remaining <= item.milliseconds) || null;
}

async function wasDelivered(runtimeId, milestone, destination) {
  const { rowCount } = await db.query(
    `SELECT 1
       FROM billing.runtime_expiry_notifications
      WHERE runtime_subscription_id = $1
        AND milestone = $2
        AND destination = $3
      LIMIT 1`,
    [runtimeId, milestone, destination],
  );
  return rowCount > 0;
}

async function rememberDelivery(subjectId, runtimeId, milestone, destination) {
  await db.query(
    `INSERT INTO billing.runtime_expiry_notifications
       (external_subject_id, runtime_subscription_id, milestone, destination)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (runtime_subscription_id, milestone, destination) DO NOTHING`,
    [subjectId, runtimeId, milestone, destination],
  );
}

function formatThaiDate(value) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value));
}

function buildEmbed(client, runtime, milestone) {
  return new EmbedBuilder()
    .setColor(0xD99A2B)
    .setAuthor({ name: 'FUJIPP • Runtime Service', iconURL: `attachment://${LOGO_NAME}` })
    .setTitle('แจ้งเตือน Runtime ใกล้หมดอายุ')
    .setDescription('Runtime สำหรับบอทของคุณกำลังจะหมดอายุ กรุณาตรวจสอบและต่ออายุก่อนถึงกำหนดเพื่อให้บริการทำงานต่อเนื่อง')
    .addFields(
      { name: 'บอท', value: client.user?.username || 'Discord Bot', inline: true },
      { name: 'เหลือเวลา', value: milestone.label, inline: true },
      { name: 'หมดอายุ', value: formatThaiDate(runtime.expires_at), inline: false },
    )
    .setThumbnail(`attachment://${LOGO_NAME}`)
    .setFooter({ text: 'Fujipp Runtime Service • การแจ้งเตือนอัตโนมัติ' })
    .setTimestamp();
}

function payload(client, runtime, milestone) {
  return {
    embeds: [buildEmbed(client, runtime, milestone)],
    files: [new AttachmentBuilder(LOGO_PATH, { name: LOGO_NAME })],
    allowedMentions: { parse: [] },
  };
}

async function sendDm(client, ctx, runtime, milestone) {
  const userId = String(ctx.config.get('RUNTIME_ALERT_DM_USER_ID') || '').trim();
  if (!userId) {
    ctx.log('runtime-expiry-alert: DM selected but no recipient user id is configured');
    return;
  }
  if (await wasDelivered(runtime.id, milestone.key, 'DM')) return;

  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) {
    ctx.log(`runtime-expiry-alert: DM recipient ${userId} could not be resolved`);
    return;
  }
  await user.send(payload(client, runtime, milestone));
  await rememberDelivery(ctx.config.subjectId, runtime.id, milestone.key, 'DM');
}

async function sendChannel(client, ctx, runtime, milestone) {
  const channelId = String(ctx.config.get('RUNTIME_ALERT_CHANNEL_ID') || '').trim();
  if (!channelId) {
    ctx.log('runtime-expiry-alert: channel delivery selected but no channel is configured');
    return;
  }
  if (await wasDelivered(runtime.id, milestone.key, 'CHANNEL')) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased() || !channel.isSendable()) {
    ctx.log(`runtime-expiry-alert: channel ${channelId} is unavailable or not sendable`);
    return;
  }
  await channel.send(payload(client, runtime, milestone));
  await rememberDelivery(ctx.config.subjectId, runtime.id, milestone.key, 'CHANNEL');
}

async function check(client, ctx) {
  await ctx.lifecycle.runExclusive('check', async () => {
    try {
      const modeValue = String(ctx.config.get('RUNTIME_ALERT_DELIVERY') || 'BOTH').toUpperCase();
      const mode = DELIVERY.has(modeValue) ? modeValue : 'BOTH';
      if (mode === 'DISABLED') return;

      const runtime = await loadRuntime(ctx.config.subjectId);
      if (!runtime) return;
      const milestone = dueMilestone(runtime, configuredMilestones(ctx));
      if (!milestone) return;

      if (mode === 'DM' || mode === 'BOTH') {
        await sendDm(client, ctx, runtime, milestone).catch((err) => {
          ctx.log(`DM delivery failed: ${err.message}`);
        });
      }
      if (mode === 'CHANNEL' || mode === 'BOTH') {
        await sendChannel(client, ctx, runtime, milestone).catch((err) => {
          ctx.log(`channel delivery failed: ${err.message}`);
        });
      }
    } catch (err) {
      ctx.log(`check failed: ${err.message}`);
    }
  });
}

async function onReady(client, ctx) {
  await check(client, ctx);
  ctx.lifecycle.setInterval(() => check(client, ctx), CHECK_MS);
}

module.exports = {
  code: 'runtime-expiry-alert',
  name: 'Runtime Expiry Alert',
  onReady,
};
