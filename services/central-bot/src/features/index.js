// src/features/index.js
// Feature registry. To add a feature: implement a module (see the contract below)
// and add it here. The bot only loads features whose code is in ENABLED_FEATURES,
// so an unpurchased feature never registers commands or listeners.
//
// Feature module contract:
//   {
//     code:     string,                      // matches billing.feature_catalog.code
//     name:     string,
//     commands(): SlashCommandBuilder[]      // optional — slash commands to register
//     handlers: { [commandName]: (interaction, ctx) => Promise<void> }  // optional
//     onReady(client, ctx): Promise<void>    // optional — listeners / scheduled work
//   }
// ctx = { config, log }

const robloxRobuxPayout = require('./roblox-robux-payout');
const walletTopup = require('./wallet-topup');
const walletHistory = require('./wallet-history');
const topSpenderRank = require('./top-spender-rank');

// wallet-topup first so its ctx.services.wallet exists before features that use it.
const ALL = [walletTopup, robloxRobuxPayout, walletHistory, topSpenderRank];

function loadEnabled(config) {
  return ALL.filter((f) => config.isFeatureEnabled(f.code));
}

module.exports = { ALL, loadEnabled };
