# central-bot

One **configurable** Discord bot codebase. It is not one shared running bot —
the orchestrator runs **one process per customer bot (subject)**, injecting that
subject's Discord token, config, and enabled features via environment variables.
Each process logs in as a different Discord application, so customers see distinct
bots. See `../../docs/product/feature-status-map.md` for current status and
`../../docs/product/feature-bot-platform.md` for historical design context. See
`../../docs/operations/backend-services.md` for the backend/service architecture.

## How it works

```
orchestrator  ──(env: token + config + ENABLED_FEATURES)──>  node src/server.js
                                                                    │
                                              server.js (health) ───┤
                                                                    ▼
                                                   bot.js loads ENABLED features only
                                                   → registers their slash commands
                                                   → routes interactions to them
```

- `src/server.js` — process entrypoint; health endpoints + boots the bot.
- `src/bot.js` — Discord client; loads enabled features, registers commands, routes interactions.
- `src/config/env.js` — reads the env contract (see `.env.example`).
- `src/features/index.js` — feature registry + the feature-module contract.
- `src/features/<code>/` — one folder per feature. Only features listed in
  `ENABLED_FEATURES` are loaded, so an unpurchased feature never runs.

The feature config keys mirror `billing.feature_variable_templates` 1:1, so what
the customer fills in the shop form becomes this bot's env at runtime.

## Adding a feature

1. Create `src/features/<code>/index.js` implementing the contract in `src/features/index.js`.
2. Register it in `src/features/index.js`.
3. Seed its catalog row + config schema (`feature_variable_templates`) in a migration.

## Local dev

```bash
cp .env.example .env   # fill in a test token + ROBLOX_* config
npm install
npm run dev
```

## Features

This list is intentionally high-level; the live registry in `src/features/index.js`
is the source of truth.

| Code | Notes |
| --- | --- |
| `roblox-robux-payout` | Roblox shop/payout flow |
| `wallet-topup` | PromptPay/SlipOK and TrueMoney top-up flow |
| `wallet-history` | Wallet history and operator balance tools |
| `top-spender-rank` | Top-up leaderboard and reward roles |
| `review-credit` | Review counting and reward flow |
| `voice-keeper` | 24/7 voice presence |
| `shop-status` | Shop status announcements and channel naming |
| `server-log` | Server activity logging |
| `order-management` | Order logging and counters |
| `bot-presence` | Bot activity/presence loop |

> The Roblox API client (`features/roblox-robux-payout/roblox.js`) is the proven
> implementation ported from the original kanom-roblox bot.
