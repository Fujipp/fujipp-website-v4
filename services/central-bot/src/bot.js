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
    console.error('[central-bot] Missing DISCORD_TOKEN — cannot log in.');
    return;
  }

  const features = loadEnabled(config);
  log(`subject=${config.subjectId} enabled=[${features.map((f) => f.code).join(', ') || 'none'}]`);

  // Slash commands only need Guilds — GuildMembers/MessageContent are PRIVILEGED
  // and make login fail with "disallowed intents" unless enabled in the Dev Portal.
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel],
  });

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

  await client.login(config.token);
  return client;
}

module.exports = { start };
