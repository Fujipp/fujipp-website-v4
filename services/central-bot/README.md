# central-bot

One **configurable** Discord bot codebase. It is not one shared running bot —
the orchestrator runs **one process per customer bot (subject)**, injecting that
subject's Discord token, config, and enabled features via environment variables.
Each process logs in as a different Discord application, so customers see distinct
bots. See `docs/feature-bot-platform.md` for the full design.

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

| Code | Commands |
| --- | --- |
| `roblox-robux-payout` | `/robux-check`, `/robux-balance`, `/robux-payout` (admin) |

> The Roblox API client (`features/roblox-robux-payout/roblox.js`) is the proven
> implementation ported from the original kanom-roblox bot.
