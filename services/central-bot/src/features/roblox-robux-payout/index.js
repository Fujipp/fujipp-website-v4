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

module.exports = {
  code: 'roblox-robux-payout',
  name: 'Roblox Robux Payout',
  commands() {
    return [panel.panelCommand()];
  },
  handlers: {
    panel: panel.handlePanel,
  },
  components: panel.components,
};
