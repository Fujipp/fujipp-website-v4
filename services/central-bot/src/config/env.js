// src/config/env.js
// Reads the env contract the orchestrator injects per subject (see .env.example).
// Feature modules pull their own config through `config.get(...)`; the keys match
// the seeded billing.feature_variable_templates 1:1.

function list(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const enabledFeatures = new Set(list(process.env.ENABLED_FEATURES));
const authorizedUserIds = new Set(list(process.env.AUTHORIZED_USER_IDS));

const config = {
  subjectId: process.env.BOT_SUBJECT_ID || null,
  token: process.env.DISCORD_TOKEN || '',
  applicationId: process.env.DISCORD_APPLICATION_ID || '',
  guildId: process.env.DISCORD_GUILD_ID || '',

  enabledFeatures,
  isFeatureEnabled: (code) => enabledFeatures.has(code),

  authorizedUserIds,
  isAuthorized: (userId) => authorizedUserIds.has(String(userId)),

  // Raw config value accessor (feature config lives in process.env by contract).
  get: (key, fallback = null) => {
    const v = process.env[key];
    return v === undefined || v === '' ? fallback : v;
  },
  bool: (key, fallback = false) => {
    const v = process.env[key];
    if (v === undefined || v === '') return fallback;
    return /^(1|true|yes|on)$/i.test(v.trim());
  },
  number: (key, fallback = null) => {
    const v = process.env[key];
    if (v === undefined || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  },
};

module.exports = config;
