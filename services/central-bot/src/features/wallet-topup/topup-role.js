// src/features/wallet-topup/topup-role.js
// Grant the configured "top-up role" (TOPUP_ROLE_ID) to a member who just topped up.
// Anyone who tops up gets it — a simple paying-member badge, separate from the Top
// Spender rank/milestone roles. Fetches the single member by id, so no privileged
// GuildMembers intent is needed. Best-effort: never throws into the top-up flow.

async function grantTopupRole(ctx, guild, memberId) {
  const roleId = ctx.config.get('TOPUP_ROLE_ID');
  if (!roleId || !guild || !memberId) return;
  try {
    const member = guild.members.cache.get(String(memberId))
      || (await guild.members.fetch(String(memberId)).catch(() => null));
    if (member && !member.roles.cache.has(String(roleId))) {
      await member.roles.add(String(roleId));
    }
  } catch (err) {
    console.error('[central-bot] grantTopupRole failed:', err.message);
  }
}

module.exports = { grantTopupRole };
