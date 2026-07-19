// src/features/roblox-robux-payout/index.js
// Roblox Robux Payout feature.
//
// Config (injected as env by the orchestrator, keys mirror billing.feature_variable_templates):
//   ROBLOX_GROUP_ID{,_1,_2,_3}, ROBLOX_SECURITY_COOKIE{,_1,_2,_3},
//   ROBLOX_TOTP_SECRET{,_1,_2,_3}, ROBLOX_GROUP_NAME{,_1,_2,_3},
//   ROBUX_RATE (Robux per 1 baht), ROBUX_ENABLED, ROBUX_PAYOUT_COOLDOWN,
//   ROBUX_NOTIFY_CHANNEL, ROBLOX_GROUPS (legacy JSON)
//
// The only slash command is /panel — every member flow (eligibility check →
// package select → confirm → payout queue) runs through the shop panel
// components in panel.js / buy.js. The old robux-check / robux-balance /
// robux-payout / robux-redeem commands were retired 2026-06-13.
// The Roblox API client (roblox.js) is the proven implementation ported from
// the original kanom-roblox bot; it reads the ROBLOX_* env keys directly.

const panel = require('./panel');
const roblox = require('./roblox');
const buy = require('./buy');

module.exports = {
  code: 'roblox-robux-payout',
  name: 'Roblox Robux Payout',
  validate() {
    const groups = roblox.getGroupConfigs().list;
    if (groups.length === 0) return ['missing config: ROBLOX_GROUP_ID or ROBLOX_GROUPS'];
    const issues = [];
    groups.forEach((group, index) => {
      if (!group.groupId) issues.push(`group ${index + 1}: missing groupId`);
      if (!group.cookie) issues.push(`group ${index + 1}: missing Roblox cookie`);
    });
    return issues;
  },
  commands() {
    return [panel.panelCommand()];
  },
  handlers: {
    panel: panel.handlePanel,
  },
  provides(ctx) {
    ctx.lifecycle.register(roblox.clearCaches);
  },
  // Re-attach the panel and recover debited payouts that had not reached Roblox.
  async onReady(client, ctx) {
    await panel.onReady(client, ctx);
    await buy.onReady(client, ctx);
  },
  components: panel.components,
};
