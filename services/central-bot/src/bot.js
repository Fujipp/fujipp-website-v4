// src/bot.js
// Boots one Discord client for this subject, loads only the ENABLED features,
// registers their slash commands to the guild, and routes interactions to them.

const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const config = require('./config/env');
const { loadEnabled } = require('./features');
const { makeEmbedRenderer } = require('./lib/embeds');
const { makeAccessControl } = require('./lib/access-control');

const log = (...args) => console.log('[central-bot]', ...args);

function canonicalOption(option) {
  return {
    type: option.type,
    name: option.name,
    description: option.description || '',
    required: Boolean(option.required),
    autocomplete: Boolean(option.autocomplete),
    channel_types: [...(option.channel_types || [])].sort((a, b) => a - b),
    min_value: option.min_value ?? null,
    max_value: option.max_value ?? null,
    min_length: option.min_length ?? null,
    max_length: option.max_length ?? null,
    choices: (option.choices || []).map((choice) => ({ name: choice.name, value: choice.value })),
    options: (option.options || []).map(canonicalOption),
  };
}

function canonicalCommands(commands) {
  return [...commands]
    .map((command) => (typeof command.toJSON === 'function' ? command.toJSON() : command))
    .map((command) => ({
      type: command.type ?? 1,
      name: command.name,
      description: command.description || '',
      default_member_permissions: command.default_member_permissions ?? null,
      nsfw: Boolean(command.nsfw),
      options: (command.options || []).map(canonicalOption),
    }))
    .sort((a, b) => a.type - b.type || a.name.localeCompare(b.name));
}

async function syncCommands(manager, desired, { guildId = null, label }) {
  let existing;
  try {
    existing = guildId ? await manager.fetch({ guildId }) : await manager.fetch();
  } catch (err) {
    log(`${label} command comparison failed; applying definitions: ${err.message}`);
    if (guildId) await manager.set(desired, guildId);
    else await manager.set(desired);
    return 'updated-after-fetch-error';
  }

  const before = JSON.stringify(canonicalCommands(existing.values()));
  const after = JSON.stringify(canonicalCommands(desired));
  if (before === after) {
    log(`${label} commands unchanged (${desired.length}); skipped registration`);
    return 'unchanged';
  }

  if (guildId) await manager.set(desired, guildId);
  else await manager.set(desired);
  log(`${label} commands updated (${desired.length})`);
  return 'updated';
}

function makeLifecycle() {
  const cleanups = new Set();
  const timers = new Map();
  const running = new Set();
  const serial = new Map();
  let closed = false;

  const register = (cleanup) => {
    if (typeof cleanup !== 'function') return cleanup;
    if (closed) {
      Promise.resolve().then(cleanup).catch(() => {});
      return cleanup;
    }
    cleanups.add(cleanup);
    return cleanup;
  };

  const forgetTimer = (timer) => {
    const cleanup = timers.get(timer);
    if (!cleanup) return;
    cleanup();
  };

  const scope = (featureCode) => ({
    register,
    setTimeout(fn, delay) {
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        timers.delete(timer);
        cleanups.delete(cleanup);
      };
      timer = setTimeout(() => {
        cleanup();
        fn();
      }, delay);
      timer.unref?.();
      timers.set(timer, cleanup);
      register(cleanup);
      return timer;
    },
    setInterval(fn, delay) {
      const timer = setInterval(fn, delay);
      const cleanup = () => {
        clearInterval(timer);
        timers.delete(timer);
        cleanups.delete(cleanup);
      };
      timer.unref?.();
      timers.set(timer, cleanup);
      register(cleanup);
      return timer;
    },
    clearTimer: forgetTimer,
    async runExclusive(key, fn) {
      const operation = `${featureCode}:${key}`;
      if (closed || running.has(operation)) return false;
      running.add(operation);
      try {
        await fn();
        return true;
      } finally {
        running.delete(operation);
      }
    },
    runSerial(key, fn) {
      const operation = `${featureCode}:${key}`;
      if (closed) return Promise.resolve(false);
      const previous = serial.get(operation) ?? Promise.resolve();
      const next = previous.catch(() => {}).then(() => (closed ? false : fn()));
      serial.set(operation, next);
      return next.finally(() => {
        if (serial.get(operation) === next) serial.delete(operation);
      });
    },
  });

  const close = async () => {
    if (closed) return;
    closed = true;
    running.clear();
    serial.clear();
    const pending = [...cleanups].reverse().map(async (cleanup) => {
      try {
        await cleanup();
      } catch (err) {
        console.error('[central-bot] lifecycle cleanup failed:', err.message);
      }
    });
    cleanups.clear();
    timers.clear();
    await Promise.allSettled(pending);
  };

  return { scope, close };
}

async function start() {
  if (!config.token) {
    throw new Error('Missing DISCORD_TOKEN — cannot log in.');
  }

  const features = loadEnabled(config);
  log(`subject=${config.subjectId} enabled=[${features.map((f) => f.code).join(', ') || 'none'}]`);

  const featureHealth = new Map();
  const setFeatureHealth = (feature, status, { issues = [], error = null } = {}) => {
    featureHealth.set(feature.code, {
      name: feature.name,
      status,
      issues: [...new Set(issues.map(String))],
      error,
      updatedAt: new Date().toISOString(),
    });
  };

  for (const feature of features) {
    try {
      const required = (feature.requiredConfig || [])
        .filter((key) => !config.get(key))
        .map((key) => `missing config: ${key}`);
      const custom = typeof feature.validate === 'function' ? feature.validate(config) : [];
      const issues = [...required, ...(Array.isArray(custom) ? custom : [])];
      setFeatureHealth(feature, issues.length ? 'DEGRADED' : 'INITIALIZING', { issues });
    } catch (err) {
      setFeatureHealth(feature, 'FAILED', { error: 'configuration validation failed' });
      console.error(`[central-bot] ${feature.code} validation failed:`, err.message);
    }
  }

  // Slash commands only need Guilds — GuildMembers/MessageContent are PRIVILEGED
  // and make login fail with "disallowed intents" unless enabled in the Dev Portal.
  // A feature may request extra intents via intents(config) — it must only do so
  // when its config actually needs them (e.g. slip check needs MessageContent).
  const intents = new Set([GatewayIntentBits.Guilds]);
  const featureIntents = new Map();
  for (const feature of features) {
    if (typeof feature.intents === 'function') {
      try {
        const requested = feature.intents(config) || [];
        featureIntents.set(feature.code, requested);
        for (const intent of requested) intents.add(intent);
      } catch (err) {
        setFeatureHealth(feature, 'FAILED', { error: 'gateway intent setup failed' });
        console.error(`[central-bot] ${feature.code} intents() failed:`, err.message);
      }
    }
  }

  const lifecycle = makeLifecycle();
  const services = {};
  const featureContexts = new Map(features.map((feature) => [feature.code, {
    config,
    services,
    lifecycle: lifecycle.scope(feature.code),
    log: (...args) => log(`subject=${config.subjectId}`, `feature=${feature.code}`, ...args),
    setHealth: (status, details = {}) => setFeatureHealth(feature, status, details),
  }]));

  // Infra service available to every feature: configurable embed renderer.
  services.embeds = makeEmbedRenderer(config.subjectId);
  lifecycle.scope('core').register(services.embeds.clear);
  services.accessControl = makeAccessControl(config.subjectId);
  lifecycle.scope('core').register(services.accessControl.clear);
  const accessRuleCount = await services.accessControl.load();
  log(`subject=${config.subjectId} core access rules loaded=${accessRuleCount}`);

  // Let features register shared services first (e.g. wallet-topup → ctx.services.wallet).
  for (const feature of features) {
    if (typeof feature.provides === 'function') {
      try {
        feature.provides(featureContexts.get(feature.code));
      } catch (err) {
        setFeatureHealth(feature, 'FAILED', { error: 'shared service setup failed' });
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
    const featureCtx = featureContexts.get(feature.code);
    if (typeof feature.commands === 'function') {
      for (const cmd of feature.commands()) commandData.push(cmd);
    }
    for (const [name, fn] of Object.entries(feature.handlers || {})) {
      handlers.set(name, { fn, ctx: featureCtx, featureCode: feature.code });
    }
    for (const [prefix, fn] of Object.entries(feature.components || {})) {
      components.push({ prefix, fn, ctx: featureCtx, featureCode: feature.code });
    }
  }
  components.sort((a, b) => b.prefix.length - a.prefix.length);

  const routeComponent = (customId) => components.find((c) => customId.startsWith(c.prefix)) ?? null;

  // Build a fresh client for a given intent list and wire every listener onto it.
  // Kept in a function so we can rebuild with fewer intents and retry login (below).
  function wire(intentList) {
    const client = new Client({ intents: intentList, partials: [Partials.Channel] });
    client.featureHealth = featureHealth;
    client.commandSync = { global: 'pending', guild: config.guildId ? 'pending' : 'disabled' };
    const destroy = client.destroy.bind(client);
    client.destroy = async (closeLifecycle = true) => {
      if (closeLifecycle) await lifecycle.close();
      return destroy();
    };

    // Gateway event listeners (e.g. messageCreate for slip verification).
    for (const feature of features) {
      const featureCtx = featureContexts.get(feature.code);
      for (const [event, fn] of Object.entries(feature.events || {})) {
        client.on(event, (...args) => {
          if (feature.accessControlledEvents?.includes(event)
              && !services.accessControl.allowsMessage(args[0], feature.code, featureCtx)) return;
          Promise.resolve(fn(...args, featureCtx)).catch((err) => {
            console.error(`[central-bot] ${feature.code} ${event} error:`, err.message);
          });
        });
      }
    }

    client.once(Events.ClientReady, async (c) => {
      log(`logged in as ${c.user.tag}`);
      try {
        if (config.guildId) {
          // Guild-scoped shop bots must not also publish the same commands
          // globally; Discord displays both registrations as duplicate entries.
          c.commandSync.global = await syncCommands(c.application.commands, [], { label: 'global cleanup' });
          c.commandSync.guild = await syncCommands(c.application.commands, commandData, {
            guildId: config.guildId,
            label: `guild ${config.guildId}`,
          });
        } else {
          c.commandSync.global = await syncCommands(c.application.commands, commandData, { label: 'global' });
        }
      } catch (err) {
        c.commandSync.error = 'command synchronization failed';
        console.error('[central-bot] command registration failed:', err.message);
      }
      for (const feature of features) {
        const current = featureHealth.get(feature.code);
        if (current?.status === 'FAILED') continue;
        if (typeof feature.onReady === 'function') {
          try {
            await feature.onReady(c, featureContexts.get(feature.code));
            const after = featureHealth.get(feature.code);
            if (after?.status !== 'FAILED') {
              setFeatureHealth(feature, after?.issues.length ? 'DEGRADED' : 'READY', {
                issues: after?.issues || [],
              });
            }
          } catch (err) {
            setFeatureHealth(feature, 'FAILED', { error: 'feature initialization failed' });
            console.error(`[central-bot] ${feature.code} onReady failed:`, err.message);
          }
        } else {
          setFeatureHealth(feature, current?.issues.length ? 'DEGRADED' : 'READY', {
            issues: current?.issues || [],
          });
        }
      }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      // Slash commands → command handlers; buttons/selects/modals → component handlers.
      let route = null;
      let label = '';
      if (interaction.isChatInputCommand()) {
        route = handlers.get(interaction.commandName);
        label = `/${interaction.commandName}`;
      } else if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
        route = routeComponent(interaction.customId);
        label = interaction.customId;
      }
      if (!route) return;
      try {
        if (!services.accessControl.allows(interaction, route.featureCode, route.ctx)) {
          await interaction.reply({
            content: 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้ของบอท',
            ephemeral: true,
          });
          return;
        }
        await route.fn(interaction, route.ctx);
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
      // A failed privileged-intent login may be retried with fewer intents. Keep
      // the shared feature lifecycle open until the final client is destroyed.
      await client.destroy(false).catch(() => {});
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
      for (const feature of features) {
        const requestedByFeature = featureIntents.get(feature.code) || [];
        if (!requestedByFeature.some((intent) => PRIVILEGED_INTENTS.has(intent))) continue;
        const current = featureHealth.get(feature.code);
        setFeatureHealth(feature, 'DEGRADED', {
          issues: [...(current?.issues || []), 'privileged gateway intent unavailable'],
        });
      }
      console.warn(
        '[central-bot] login rejected for "disallowed intents" — a privileged intent is not '
        + 'enabled in this bot\'s Discord Developer Portal. Retrying WITHOUT privileged intents; '
        + 'features that need them (message/member logging, slip check) stay inactive until the '
        + 'portal toggle is enabled.',
      );
      try {
        return await loginWith(requested.filter((i) => !PRIVILEGED_INTENTS.has(i)));
      } catch (retryErr) {
        await lifecycle.close();
        throw retryErr;
      }
    }
    await lifecycle.close();
    throw err;
  }
}

module.exports = { start };
