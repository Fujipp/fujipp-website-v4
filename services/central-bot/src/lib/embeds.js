// src/lib/embeds.js
// Configurable embed renderer (config layer 3). Loads a slot's template — the bot's
// own override (bots.bot_embeds) or the seeded default (bots.embed_slots) — substitutes
// {{vars}}, and builds a discord.js EmbedBuilder. Component behavior stays in the
// feature; this only renders the visual embed. Custom emoji markup (<:name:id>) is
// kept as-is so Discord renders it natively.

const { EmbedBuilder } = require('discord.js');
const { pool } = require('./db');

const CACHE_TTL_MS = 30_000;
const cache = new Map(); // key `${subjectId}:${slotKey}` -> { json, at }

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

  let json = {};
  try {
    const override = await pool.query(
      `SELECT embed_json FROM bots.bot_embeds WHERE subject_id = $1 AND slot_key = $2`,
      [subjectId, slotKey],
    );
    if (override.rows[0]) {
      json = override.rows[0].embed_json;
    } else {
      const def = await pool.query(
        `SELECT default_json FROM bots.embed_slots WHERE slot_key = $1 LIMIT 1`,
        [slotKey],
      );
      json = def.rows[0] ? def.rows[0].default_json : {};
    }
  } catch (err) {
    console.error(`[central-bot] embed load failed for ${slotKey}:`, err.message);
    json = {};
  }
  cache.set(key, { json, at: Date.now() });
  return json;
}

function buildEmbed(json, slotKey) {
  const e = new EmbedBuilder();
  if (typeof json.color === 'number') e.setColor(json.color);

  const title = clip(str(json.title), LIMIT.title);
  const description = clip(str(json.description), LIMIT.description);
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  // An embed must carry at least one visible element.
  if (!title && !description && !Array.isArray(json.fields)) e.setDescription(slotKey);

  const image = httpUrl(json.image && json.image.url);
  if (image) e.setImage(image);
  const thumb = httpUrl(json.thumbnail && json.thumbnail.url);
  if (thumb) e.setThumbnail(thumb);

  if (json.footer && str(json.footer.text)) {
    e.setFooter({ text: clip(str(json.footer.text), LIMIT.footer), iconURL: httpUrl(json.footer.icon_url) || undefined });
  }
  if (json.author && str(json.author.name)) {
    e.setAuthor({ name: clip(str(json.author.name), LIMIT.author), iconURL: httpUrl(json.author.icon_url) || undefined });
  }
  if (Array.isArray(json.fields)) {
    const fields = json.fields
      .filter((f) => f && str(f.name) && str(f.value))
      .slice(0, 25)
      .map((f) => ({ name: clip(str(f.name), LIMIT.fieldName), value: clip(str(f.value), LIMIT.fieldValue), inline: !!f.inline }));
    if (fields.length) e.addFields(fields);
  }
  return e;
}

function makeEmbedRenderer(subjectId) {
  // Render a slot to a discord.js EmbedBuilder. `vars` fills the {{placeholders}}.
  async function renderEmbed(slotKey, vars = {}) {
    const template = await loadTemplate(subjectId, slotKey);
    return buildEmbed(substitute(template, vars), slotKey);
  }
  // Drop cached templates (call after a config edit to pick it up immediately).
  function invalidate(slotKey) {
    if (slotKey) cache.delete(`${subjectId}:${slotKey}`);
  }
  return { renderEmbed, invalidate };
}

module.exports = { makeEmbedRenderer };
