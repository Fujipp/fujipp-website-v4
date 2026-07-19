const { PermissionFlagsBits } = require('discord.js');
const { query } = require('./db');
const { isAdmin } = require('./perms');

function interactionRoleIds(interaction) {
  const roles = interaction.member?.roles;
  if (Array.isArray(roles)) return new Set(roles.map(String));
  if (roles?.cache) return new Set([...roles.cache.keys()].map(String));
  return new Set();
}

function makeAccessControl(subjectId) {
  let rules = [];

  async function load() {
    const { rows } = await query(
      `SELECT feature_code, target_type, target_discord_id, effect
         FROM bots.bot_access_rules
        WHERE bot_id = $1::uuid AND is_enabled = TRUE
        ORDER BY feature_code, effect DESC, target_type, target_discord_id`,
      [subjectId],
    );
    rules = rows;
    return rules.length;
  }

  function allowsPrincipal(userId, roleIds, administrator, featureCode, ctx) {
    if (ctx.config.isAuthorized(userId) || administrator) return true;
    const applicable = rules.filter((rule) =>
      rule.feature_code === '*' || rule.feature_code === featureCode);
    if (applicable.length === 0) return true;

    const matches = (rule) => rule.target_type === 'USER'
      ? rule.target_discord_id === String(userId)
      : roleIds.has(rule.target_discord_id);

    if (applicable.some((rule) => rule.effect === 'DENY' && matches(rule))) return false;
    const allowRules = applicable.filter((rule) => rule.effect === 'ALLOW');
    return allowRules.length === 0 || allowRules.some(matches);
  }

  function allows(interaction, featureCode, ctx) {
    // Platform-authorized users and Discord server administrators always retain
    // recovery access, even if an owner accidentally creates a broad deny rule.
    if (isAdmin(interaction, ctx)) return true;
    return allowsPrincipal(
      interaction.user.id, interactionRoleIds(interaction), false, featureCode, ctx,
    );
  }

  function allowsMessage(message, featureCode, ctx) {
    if (!message?.author?.id) return false;
    const roleIds = message.member?.roles?.cache
      ? new Set([...message.member.roles.cache.keys()].map(String))
      : new Set();
    const administrator = Boolean(
      message.member?.permissions?.has(PermissionFlagsBits.Administrator),
    );
    return allowsPrincipal(message.author.id, roleIds, administrator, featureCode, ctx);
  }

  function clear() {
    rules = [];
  }

  return { load, allows, allowsMessage, clear };
}

module.exports = { makeAccessControl };
