// src/features/app-premium-shop/index.js
// App Premium Shop — resell premium-app accounts from gafiwshop.xyz.
//
// The shop owner funds an account on the upstream site; members pay from their
// shop wallet (requires the wallet-topup feature), the bot buys via api_buy and
// DMs the account to the buyer. Orders are recorded in a Discord log channel by
// design — only the wallet debit/refund touches the database.
//
// Config (injected as env by the orchestrator, keys mirror billing.feature_variable_templates):
//   APP_PREMIUM_API_KEY, APP_PREMIUM_API_BASE, APP_PREMIUM_ENABLED,
//   APP_PREMIUM_USE_VIP_PRICE, APP_PREMIUM_MARGIN_DEFAULT, APP_PREMIUM_MARGINS,
//   APP_PREMIUM_CATEGORY_1..3, APP_PREMIUM_NOTIFY_CHANNEL, APP_PREMIUM_LOG_CHANNEL

const panel = require('./panel');

module.exports = {
  code: 'app-premium-shop',
  name: 'App Premium Shop',
  commands() {
    return [panel.panelCommand()];
  },
  handlers: {
    'app-panel': panel.handlePanel,
  },
  components: panel.components,
};
