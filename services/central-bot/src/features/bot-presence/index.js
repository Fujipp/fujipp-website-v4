// src/features/bot-presence/index.js
// Bot Presence — sets THIS bot's own Discord presence: the online/idle/dnd/invisible
// status plus an activity line ("กำลังดู …") whose text rotates through a configured
// list. One text = static; many = loop, changing every PRESENCE_ROTATE_SECONDS.
//
// Setting the bot's OWN presence needs no gateway intent (GuildPresences is only for
// RECEIVING other users' presence), so this feature requests none and can't take the
// bot offline by demanding a privileged scope.
//
// Config keys (mirror billing.feature_variable_templates 1:1):
//   PRESENCE_STATUS         (ENUM)        — online | idle | dnd | invisible
//   PRESENCE_ACTIVITY_TYPE  (ENUM)        — WATCHING | PLAYING | LISTENING | COMPETING
//   PRESENCE_TEXTS          (STRING_LIST) — activity texts, shown in order then looped
//   PRESENCE_ROTATE_SECONDS (NUMBER)      — seconds per text when more than one

const { ActivityType } = require('discord.js');

// Discord rate-limits presence updates (~5 per 20s); never rotate faster than this.
const MIN_ROTATE_SECONDS = 15;
const DEFAULT_ROTATE_SECONDS = 30;

const STATUSES = new Set(['online', 'idle', 'dnd', 'invisible']);

const ACTIVITY_TYPES = {
  WATCHING: ActivityType.Watching,
  PLAYING: ActivityType.Playing,
  LISTENING: ActivityType.Listening,
  COMPETING: ActivityType.Competing,
};

// STRING_LIST is stored as a JSON string array; tolerate a legacy single string too.
function readTexts(config) {
  const raw = config.json('PRESENCE_TEXTS', null);
  const list = Array.isArray(raw) ? raw : (raw == null ? [] : [raw]);
  return list.map((t) => String(t).trim()).filter(Boolean);
}

async function onReady(client, ctx) {
  const status = STATUSES.has(ctx.config.get('PRESENCE_STATUS')) ? ctx.config.get('PRESENCE_STATUS') : 'online';
  const type = ACTIVITY_TYPES[String(ctx.config.get('PRESENCE_ACTIVITY_TYPE', 'WATCHING')).toUpperCase()]
    ?? ActivityType.Watching;
  const texts = readTexts(ctx.config);
  const rotateSeconds = Math.max(
    MIN_ROTATE_SECONDS,
    ctx.config.number('PRESENCE_ROTATE_SECONDS', DEFAULT_ROTATE_SECONDS) || DEFAULT_ROTATE_SECONDS,
  );

  const apply = (text) => {
    try {
      client.user.setPresence({
        status,
        activities: text ? [{ name: text, type }] : [],
      });
    } catch (err) {
      ctx.log?.(`bot-presence: setPresence failed: ${err.message}`);
    }
  };

  // No texts → just set the status colour, no activity line.
  if (texts.length === 0) {
    apply(null);
    ctx.log?.(`bot-presence: status=${status}, no activity text`);
    return;
  }

  let index = 0;
  apply(texts[index]);
  ctx.log?.(`bot-presence: status=${status} type=${type} texts=${texts.length} every ${rotateSeconds}s`);

  // One text is static — nothing to rotate.
  if (texts.length === 1) return;

  setInterval(() => {
    index = (index + 1) % texts.length;
    apply(texts[index]);
  }, rotateSeconds * 1000).unref?.();
}

module.exports = {
  code: 'bot-presence',
  name: 'Bot Presence',
  onReady,
};
