// src/config-loader.js
// Turns a subject (bot) into the env the central-bot expects, by reading:
//   bots.bot_instances              — identity + encrypted Discord token
//   billing.runtime_subscriptions   — must be ACTIVE to run
//   billing.feature_subscriptions   — which features are enabled (BOT + ACCOUNT scope)
//   billing.feature_config_values   — per-feature config (secrets are decrypted)

const db = require('./db');
const { decrypt } = require('./crypto');

const LIVE = ['ACTIVE', 'PAST_DUE']; // still entitled (PAST_DUE is within grace)

// Deterministic per-bot health port so processes never collide (with each other
// or the main backend on 8080). Range 20000–39999.
function portForSubject(subjectId) {
  let h = 0;
  for (let i = 0; i < subjectId.length; i += 1) h = (h * 31 + subjectId.charCodeAt(i)) >>> 0;
  return 20000 + (h % 20000);
}

async function loadBot(subjectId) {
  const { rows } = await db.query(
    `SELECT id, user_id, name, discord_application_id, discord_guild_id,
            discord_token_cipher, discord_public_key, discord_client_secret_cipher, status
       FROM bots.bot_instances WHERE id = $1`,
    [subjectId],
  );
  return rows[0] || null;
}

async function isRuntimeActive(subjectId) {
  const { rows } = await db.query(
    `SELECT status FROM billing.runtime_subscriptions WHERE external_subject_id = $1`,
    [subjectId],
  );
  return rows[0]?.status === 'ACTIVE';
}

async function enabledFeatureCodes(subjectId, userId) {
  const { rows } = await db.query(
    `SELECT DISTINCT fc.code
       FROM billing.feature_subscriptions fs
       JOIN billing.feature_catalog fc ON fc.id = fs.feature_id
      WHERE fc.is_active = TRUE
        AND fs.status = ANY($3)
        AND ( (fs.scope = 'BOT'     AND fs.external_subject_id = $1)
           OR (fs.scope = 'ACCOUNT' AND fs.user_id = $2) )`,
    [subjectId, userId, LIVE],
  );
  return rows.map((r) => r.code);
}

async function configValues(subjectId) {
  const { rows } = await db.query(
    `SELECT config_key, config_value, is_secret
       FROM billing.feature_config_values WHERE external_subject_id = $1`,
    [subjectId],
  );
  return rows;
}

/**
 * @returns {Promise<{env: object, codes: string[]}>}
 * @throws  on missing bot / inactive runtime / missing token
 */
async function buildEnv(subjectId) {
  const bot = await loadBot(subjectId);
  if (!bot) throw new Error(`bot not found: ${subjectId}`);
  if (!(await isRuntimeActive(subjectId))) {
    throw new Error('runtime is not active for this bot');
  }
  if (!bot.discord_token_cipher) throw new Error('bot has no Discord token configured');

  const codes = await enabledFeatureCodes(subjectId, bot.user_id);
  if (codes.length === 0) throw new Error('no active features for this bot');

  const env = {
    BOT_SUBJECT_ID: bot.id,
    PORT: String(portForSubject(bot.id)),
    DISCORD_TOKEN: decrypt(bot.discord_token_cipher),
    DISCORD_APPLICATION_ID: bot.discord_application_id || '',
    DISCORD_GUILD_ID: bot.discord_guild_id || '',
    DISCORD_PUBLIC_KEY: bot.discord_public_key || '',
    DISCORD_CLIENT_SECRET: bot.discord_client_secret_cipher ? decrypt(bot.discord_client_secret_cipher) : '',
    ENABLED_FEATURES: codes.join(','),
    // Shop wallet (layer B) lives in the same Postgres; pass the connection through.
    DATABASE_URL: process.env.SHOP_DATABASE_URL || process.env.DATABASE_URL || '',
    DB_SSL_NO_VERIFY: process.env.DB_SSL_NO_VERIFY || 'true',
  };

  for (const row of await configValues(subjectId)) {
    env[row.config_key] = row.is_secret ? decrypt(row.config_value) : (row.config_value ?? '');
  }

  return { env, codes };
}

module.exports = { buildEnv, loadBot };
