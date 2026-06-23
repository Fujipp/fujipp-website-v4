// src/bot.js
// Boots one Discord client for this subject, loads only the ENABLED features,
// registers their slash commands to the guild, and routes interactions to them.

const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const config = require('./config/env');
const { loadEnabled } = require('./features');
const { makeEmbedRenderer } = require('./lib/embeds');

const log = (...args) => console.log('[central-bot]', ...args);

async function start() {
  if (!config.token) {
    throw new Error('Missing DISCORD_TOKEN — cannot log in.');
  }

  const features = loadEnabled(config);
  log(`subject=${config.subjectId} enabled=[${features.map((f) => f.code).join(', ') || 'none'}]`);

  // Slash commands only need Guilds — GuildMembers/MessageContent are PRIVILEGED
  // and make login fail with "disallowed intents" unless enabled in the Dev Portal.
  // A feature may request extra intents via intents(config) — it must only do so
  // when its config actually needs them (e.g. slip check needs MessageContent).
  const intents = new Set([GatewayIntentBits.Guilds]);
  for (const feature of features) {
    if (typeof feature.intents === 'function') {
      for (const intent of feature.intents(config) || []) intents.add(intent);
    }
  }

  const ctx = { config, log, services: {} };

  // Infra service available to every feature: configurable embed renderer.
  ctx.services.embeds = makeEmbedRenderer(config.subjectId);

  // Let features register shared services first (e.g. wallet-topup → ctx.services.wallet).
  for (const feature of features) {
    if (typeof feature.provides === 'function') {
      try {
        feature.provides(ctx);
      } catch (err) {
        console.error(`[central-bot] ${feature.code} provides() failed:`, err.message);
      }
    }
  }

  // command name → handler, built from every enabled feature
  const handlers = new Map();
  // Component (button / select / modal) routing: each entry maps a custom_id prefix
  // to a handler; an interaction is routed to the longest matching prefix.
  const components = [];
  const commandData = [];
  for (const feature of features) {
    if (typeof feature.commands === 'function') {
      for (const cmd of feature.commands()) commandData.push(cmd);
    }
    for (const [name, fn] of Object.entries(feature.handlers || {})) {
      handlers.set(name, fn);
    }
    for (const [prefix, fn] of Object.entries(feature.components || {})) {
      components.push({ prefix, fn });
    }
  }
  components.sort((a, b) => b.prefix.length - a.prefix.length);

  const routeComponent = (customId) => components.find((c) => customId.startsWith(c.prefix))?.fn ?? null;

  // Build a fresh client for a given intent list and wire every listener onto it.
  // Kept in a function so we can rebuild with fewer intents and retry login (below).
  function wire(intentList) {
    const client = new Client({ intents: intentList, partials: [Partials.Channel] });

    // Gateway event listeners (e.g. messageCreate for slip verification).
    for (const feature of features) {
      for (const [event, fn] of Object.entries(feature.events || {})) {
        client.on(event, (...args) => {
          Promise.resolve(fn(...args, ctx)).catch((err) => {
            console.error(`[central-bot] ${feature.code} ${event} error:`, err.message);
          });
        });
      }
    }

    client.once(Events.ClientReady, async (c) => {
      log(`logged in as ${c.user.tag}`);
      try {
        // Register globally (public — usable in any server, ~1h to propagate).
        await c.application.commands.set(commandData);
        // Also register to the bot's own server for instant availability while testing.
        if (config.guildId) {
          await c.application.commands.set(commandData, config.guildId);
        }
        log(`registered ${commandData.length} command(s) global${config.guildId ? ' + guild' : ''}`);
      } catch (err) {
        console.error('[central-bot] command registration failed:', err.message);
      }
      for (const feature of features) {
        if (typeof feature.onReady === 'function') {
          try {
            await feature.onReady(c, ctx);
          } catch (err) {
            console.error(`[central-bot] ${feature.code} onReady failed:`, err.message);
          }
        }
      }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      // Slash commands → command handlers; buttons/selects/modals → component handlers.
      let handler = null;
      let label = '';
      if (interaction.isChatInputCommand()) {
        handler = handlers.get(interaction.commandName);
        label = `/${interaction.commandName}`;
      } else if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
        handler = routeComponent(interaction.customId);
        label = interaction.customId;
      }
      if (!handler) return;
      try {
        await handler(interaction, ctx);
      } catch (err) {
        console.error(`[central-bot] handler ${label} error:`, err.message);
        const msg = { content: 'เกิดข้อผิดพลาดในการประมวลผล', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          interaction.editReply(msg).catch(() => {});
        } else {
          interaction.reply(msg).catch(() => {});
        }
      }
    });

    return client;
  }

  async function loginWith(intentList) {
    const client = wire(intentList);
    try {
      await client.login(config.token);
      return client;
    } catch (err) {
      await client.destroy().catch(() => {});
      throw err;
    }
  }

  // Privileged intents must be enabled in the bot's Discord Developer Portal or login
  // fails with "disallowed intents". A feature only requests one when its config needs
  // it, but the admin may not have toggled it on. Rather than crash the whole bot (which
  // takes EVERY feature offline), retry login without the privileged intents so the bot
  // stays up in a degraded mode — features needing them (message/member logging, slip
  // check, etc.) simply won't receive their events until the portal toggle is enabled.
  const PRIVILEGED_INTENTS = new Set([
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ]);
  const requested = [...intents];
  try {
    return await loginWith(requested);
  } catch (err) {
    const hadPrivileged = requested.some((i) => PRIVILEGED_INTENTS.has(i));
    if (hadPrivileged && /disallowed intents/i.test(String(err?.message || ''))) {
      console.warn(
        '[central-bot] login rejected for "disallowed intents" — a privileged intent is not '
        + 'enabled in this bot\'s Discord Developer Portal. Retrying WITHOUT privileged intents; '
        + 'features that need them (message/member logging, slip check) stay inactive until the '
        + 'portal toggle is enabled.',
      );
      return await loginWith(requested.filter((i) => !PRIVILEGED_INTENTS.has(i)));
    }
    throw err;
  }
}

module.exports = { start };
