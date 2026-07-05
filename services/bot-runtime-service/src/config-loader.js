// src/config-loader.js
// Turns a subject (bot) into the env the central-bot expects, by reading:
//   bots.bot_instances              — identity + encrypted Discord token
//   billing.runtime_subscriptions   — must be ACTIVE to run
//   billing.feature_subscriptions   — which features are enabled (BOT + ACCOUNT scope)
//   billing.feature_config_values   — per-feature config (secrets are decrypted)

const db = require('./db');
const { decrypt } = require('./crypto');
const { resolveDatabaseUrl } = require('./pg-url');

const LIVE = ['ACTIVE', 'PAST_DUE']; // still entitled (PAST_DUE is within grace)
const CONFIG_CACHE_TTL_MS = Number.isFinite(Number(process.env.RUNTIME_CONFIG_CACHE_TTL_MS))
  ? Number(process.env.RUNTIME_CONFIG_CACHE_TTL_MS)
  : 30_000;
const configCache = new Map();
const inFlightLoads = new Map();

// Deterministic per-bot health port so processes never collide (with each other
// or the main backend on 8080). Range 20000–39999.
function portForSubject(subjectId) {
  let h = 0;
  for (let i = 0; i < subjectId.length; i += 1) h = (h * 31 + subjectId.charCodeAt(i)) >>> 0;
  return 20000 + (h % 20000);
}

async function loadRuntimeConfig(subjectId) {
  const { rows } = await db.query(
    `WITH bot AS (
       SELECT id, user_id, name, discord_application_id, discord_guild_id,
              discord_token_cipher, discord_public_key, discord_client_secret_cipher, status
         FROM bots.bot_instances
        WHERE id = $1
     ),
     runtime AS (
       SELECT COALESCE(bool_or(status = 'ACTIVE'), FALSE) AS active
         FROM billing.runtime_subscriptions
        WHERE external_subject_id = $1::text
     ),
     features AS (
       SELECT COALESCE(array_agg(DISTINCT fc.code ORDER BY fc.code), ARRAY[]::text[]) AS codes
         FROM bot b
         JOIN billing.feature_subscriptions fs
           ON ( (fs.scope = 'BOT' AND fs.external_subject_id = $1::text)
             OR (fs.scope = 'ACCOUNT' AND fs.user_id = b.user_id) )
         JOIN billing.feature_catalog fc ON fc.id = fs.feature_id
        WHERE fc.is_active = TRUE
          AND fs.status = ANY($2::text[])
     ),
     configs AS (
       SELECT COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'config_key', config_key,
                  'config_value', config_value,
                  'is_secret', is_secret
                )
                ORDER BY config_key
              ),
              '[]'::jsonb
            ) AS values
         FROM billing.feature_config_values
        WHERE external_subject_id = $1::text
     )
     SELECT b.*, runtime.active AS runtime_active, features.codes, configs.values AS config_values
       FROM bot b
       CROSS JOIN runtime
       CROSS JOIN features
       CROSS JOIN configs`,
    [subjectId, LIVE],
  );
  return rows[0] || null;
}

async function loadBot(subjectId) {
  const row = await loadRuntimeConfig(subjectId);
  if (!row) return null;
  const { runtime_active, codes, config_values, ...bot } = row;
  return bot;
}

/**
 * @returns {Promise<{env: object, codes: string[]}>}
 * @throws  on missing bot / inactive runtime / missing token
 */
async function buildEnv(subjectId, options = {}) {
  if (!options.forceFresh) {
    const cached = getCached(subjectId);
    if (cached) return cloneConfig(cached);

    const pending = inFlightLoads.get(subjectId);
    if (pending) return cloneConfig(await pending);
  }

  const load = buildFreshEnv(subjectId);
  const tracked = !options.forceFresh;
  if (tracked) {
    inFlightLoads.set(subjectId, load);
  }
  try {
    const result = await load;
    rememberConfig(subjectId, result);
    return cloneConfig(result);
  } finally {
    if (tracked) {
      inFlightLoads.delete(subjectId);
    }
  }
}

async function buildFreshEnv(subjectId) {
  const config = await loadRuntimeConfig(subjectId);
  if (!config) throw new Error(`bot not found: ${subjectId}`);
  if (!config.runtime_active) {
    throw new Error('runtime is not active for this bot');
  }
  if (!config.discord_token_cipher) throw new Error('bot has no Discord token configured');

  const codes = config.codes || [];
  if (codes.length === 0) throw new Error('no active features for this bot');

  const env = {
    BOT_SUBJECT_ID: config.id,
    PORT: String(portForSubject(config.id)),
    DISCORD_TOKEN: decrypt(config.discord_token_cipher).trim(),
    DISCORD_APPLICATION_ID: config.discord_application_id || '',
    DISCORD_GUILD_ID: config.discord_guild_id || '',
    DISCORD_PUBLIC_KEY: config.discord_public_key || '',
    DISCORD_CLIENT_SECRET: config.discord_client_secret_cipher ? decrypt(config.discord_client_secret_cipher).trim() : '',
    ENABLED_FEATURES: codes.join(','),
    // Shop wallet (layer B) lives in the same Postgres; pass the resolved connection through.
    DATABASE_URL: process.env.SHOP_DATABASE_URL || resolveDatabaseUrl(),
    DB_SSL_NO_VERIFY: process.env.DB_SSL_NO_VERIFY || 'true',
  };

  for (const row of config.config_values || []) {
    env[row.config_key] = row.is_secret ? decrypt(row.config_value) : (row.config_value ?? '');
  }

  // Platform-managed voucher endpoint: each VPS node points bots at a voucher-service it
  // can reach (loopback on the main host; a private URL on other nodes). The shop's
  // TRUEMONEY_BASE config is only an override — when it's blank we fall back to this
  // node's VOUCHER_BASE_URL so a bot keeps working no matter which VPS it lands on.
  // If VOUCHER_BASE_URL is unset, behaviour is unchanged (the shop value stands).
  if (!env.TRUEMONEY_BASE && process.env.VOUCHER_BASE_URL) {
    env.TRUEMONEY_BASE = process.env.VOUCHER_BASE_URL;
  }

  return { env, codes };
}

function getCached(subjectId) {
  if (CONFIG_CACHE_TTL_MS <= 0) return null;
  const cached = configCache.get(subjectId);
  if (!cached) return null;
  if (Date.now() >= cached.expiresAt) {
    configCache.delete(subjectId);
    return null;
  }
  return cached.value;
}

function rememberConfig(subjectId, value) {
  if (CONFIG_CACHE_TTL_MS <= 0) return;
  configCache.set(subjectId, {
    expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
    value: cloneConfig(value),
  });
}

function invalidateConfig(subjectId) {
  configCache.delete(subjectId);
  inFlightLoads.delete(subjectId);
}

function cloneConfig(config) {
  return {
    env: { ...config.env },
    codes: [...config.codes],
  };
}

module.exports = { buildEnv, loadBot, invalidateConfig };
