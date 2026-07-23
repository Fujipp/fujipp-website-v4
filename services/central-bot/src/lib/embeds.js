// src/lib/embeds.js
// Configurable embed renderer (config layer 3). Loads a slot's seeded default
// (bots.embed_slots), merges any bot override (bots.bot_embeds), substitutes {{vars}},
// and builds a discord.js EmbedBuilder. Component behavior stays in the feature; this
// only renders the visual embed. Custom emoji markup (<:name:id>) is kept as-is so
// Discord renders it natively.

const { EmbedBuilder } = require('discord.js');
const { pool } = require('./db');

const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 200;
const cache = new Map(); // key -> { json, at } | { loading }

function storeCache(key, value) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
}

// Discord hard limits — truncate so a long config value never throws.
const LIMIT = { title: 256, description: 4096, fieldName: 256, fieldValue: 1024, footer: 2048, author: 256 };

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}
function clip(s, n) {
  return s.length > n ? s.slice(0, n) : s;
}
function httpUrl(v) {
  const s = str(v);
  return /^https?:\/\//i.test(s) ? s : null;
}
function plainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

// A bot override still owns the embed body. Component roles merge one level deep so
// old overrides inherit newly seeded button/dropdown defaults from the Kanom slot
// template without forcing default title/image/fields back into an edited embed.
function mergeTemplate(defaultJson, overrideJson) {
  const base = plainObject(defaultJson) ? defaultJson : {};
  const hasOverride = plainObject(overrideJson);
  const override = hasOverride ? overrideJson : {};
  const merged = { ...(hasOverride ? override : base) };
  if (plainObject(base.components) || plainObject(override.components)) {
    merged.components = {
      ...(plainObject(base.components) ? base.components : {}),
      ...(plainObject(override.components) ? override.components : {}),
    };
  }
  if (plainObject(base.componentsV2) || plainObject(override.componentsV2)) {
    const baseV2 = plainObject(base.componentsV2) ? base.componentsV2 : {};
    const overrideV2 = plainObject(override.componentsV2) ? override.componentsV2 : {};
    merged.componentsV2 = {
      ...baseV2,
      ...overrideV2,
      texts: {
        ...(plainObject(baseV2.texts) ? baseV2.texts : {}),
        ...(plainObject(overrideV2.texts) ? overrideV2.texts : {}),
      },
    };
  }
  return merged;
}

// Replace {{key}} everywhere in the template; unknown keys collapse to '' so no
// raw placeholder ever shows. Deep-copies — never mutates the cached template.
function substitute(value, vars) {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, vars));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = substitute(v, vars);
    return out;
  }
  return value;
}

async function loadTemplate(subjectId, slotKey) {
  const key = `${subjectId}:${slotKey}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.json;
  if (hit?.loading) return hit.loading;

  const loading = (async () => {
    let json = {};
    try {
      const result = await pool.query(
        `SELECT s.default_json, b.embed_json
           FROM bots.embed_slots s
           LEFT JOIN bots.bot_embeds b
                  ON b.slot_key = s.slot_key AND b.subject_id = $1
          WHERE s.slot_key = $2
          LIMIT 1`,
        [subjectId, slotKey],
      );
      const row = result.rows[0];
      json = row ? mergeTemplate(row.default_json, row.embed_json) : {};
    } catch (err) {
      console.error(`[central-bot] embed load failed for ${slotKey}:`, err.message);
    }
    storeCache(key, { json, at: Date.now() });
    return json;
  })();
  storeCache(key, { loading });
  return loading;
}

function buildEmbed(json, slotKey) {
  const e = new EmbedBuilder();
  if (typeof json.color === 'number') e.setColor(json.color);

  const title = clip(str(json.title), LIMIT.title);
  const description = clip(str(json.description), LIMIT.description);
  const fields = Array.isArray(json.fields)
    ? json.fields
      .filter((f) => f && str(f.name) && str(f.value))
      .slice(0, 25)
      .map((f) => ({ name: clip(str(f.name), LIMIT.fieldName), value: clip(str(f.value), LIMIT.fieldValue), inline: !!f.inline }))
    : [];
  if (title) e.setTitle(title);
  // A url only renders as a clickable title, so apply it only when a title exists.
  if (title) {
    const titleUrl = httpUrl(json.url);
    if (titleUrl) e.setURL(titleUrl);
  }
  if (description) e.setDescription(description);
  // An embed must carry at least one visible element. An empty fields array is
  // not visible and Discord rejects an otherwise empty embed.
  if (!title && !description && fields.length === 0) e.setDescription(slotKey);

  const image = httpUrl(json.image && json.image.url);
  if (image) e.setImage(image);
  const thumb = httpUrl(json.thumbnail && json.thumbnail.url);
  if (thumb) e.setThumbnail(thumb);

  if (json.footer && str(json.footer.text)) {
    e.setFooter({ text: clip(str(json.footer.text), LIMIT.footer), iconURL: httpUrl(json.footer.icon_url) || undefined });
  }
  if (json.author && str(json.author.name)) {
    e.setAuthor({
      name: clip(str(json.author.name), LIMIT.author),
      iconURL: httpUrl(json.author.icon_url) || undefined,
      url: httpUrl(json.author.url) || undefined,
    });
  }
  // Footer timestamp (ISO string). Ignore an unparseable value rather than throwing.
  if (str(json.timestamp)) {
    const ts = new Date(str(json.timestamp));
    if (!Number.isNaN(ts.getTime())) e.setTimestamp(ts);
  }
  if (fields.length) e.addFields(fields);
  return e;
}

function makeEmbedRenderer(subjectId) {
  // Render a slot to a discord.js EmbedBuilder. `vars` fills the {{placeholders}}.
  async function renderEmbed(slotKey, vars = {}) {
    const template = await loadTemplate(subjectId, slotKey);
    return buildEmbed(substitute(template, vars), slotKey);
  }
  // Raw merged config for a slot (override or default) — lets a feature read the
  // configurable component appearance (config.components) for that slot.
  async function getConfig(slotKey) {
    return loadTemplate(subjectId, slotKey);
  }
  // Resolved JSON config for Components V2 and other non-Embed message surfaces.
  // It shares the exact same variable substitution rules as embeds.
  async function renderConfig(slotKey, vars = {}) {
    return substitute(await loadTemplate(subjectId, slotKey), vars);
  }
  // Drop cached templates (call after a config edit to pick it up immediately).
  function invalidate(slotKey) {
    if (slotKey) cache.delete(`${subjectId}:${slotKey}`);
  }
  function clear() {
    const prefix = `${subjectId}:`;
    for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
  }
  return { renderEmbed, getConfig, renderConfig, invalidate, clear };
}

module.exports = { makeEmbedRenderer };
