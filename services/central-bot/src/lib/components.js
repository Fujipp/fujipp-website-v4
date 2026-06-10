// src/lib/components.js
// Apply configurable appearance (label / emoji / style) to fixed components. The
// custom_id and behavior stay in code; only how it looks comes from the embed config
// (config.components[role]). Emoji accept <:name:id> / <a:name:id> markup or unicode.

const { ButtonStyle } = require('discord.js');

const STYLES = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
};

function buttonStyle(name, fallback) {
  return STYLES[String(name || '').toLowerCase()] || fallback;
}

function parseEmoji(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const m = s.match(/^<(a)?:(\w+):(\d+)>$/);
  if (m) return { name: m[2], id: m[3], animated: Boolean(m[1]) };
  return s; // unicode emoji
}

// Set label + emoji on a ButtonBuilder from config (cfg), falling back to a default label.
function applyButton(btn, cfg, defaultLabel) {
  const label = (cfg && cfg.label) || defaultLabel;
  if (label) btn.setLabel(String(label).slice(0, 80));
  const emoji = parseEmoji(cfg && cfg.emoji);
  if (emoji) {
    try { btn.setEmoji(emoji); } catch (_e) { /* invalid emoji — skip */ }
  }
  return btn;
}

module.exports = { buttonStyle, parseEmoji, applyButton };
