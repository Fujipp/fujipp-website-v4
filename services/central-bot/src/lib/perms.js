// src/lib/perms.js
// Admin gate for owner-only actions (/panel, /wallet-add, /robux-payout). A user is
// an admin if they hold the server's Administrator permission, OR their id is listed
// in AUTHORIZED_USER_IDS (config). Permission checks need no privileged intent —
// interaction.memberPermissions is present on guild interactions.

const { PermissionFlagsBits } = require('discord.js');

function isAdmin(interaction, ctx) {
  if (ctx.config.isAuthorized(interaction.user.id)) return true;
  return Boolean(interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.Administrator));
}

module.exports = { isAdmin };
