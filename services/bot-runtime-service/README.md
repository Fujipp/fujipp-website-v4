# bot-runtime-service (orchestrator)

Runs customer bots. Given a subject id it reads that bot + its billing entitlements
from Supabase, decrypts the secrets, composes the env the `central-bot` expects,
and launches **one process per subject** via PM2. Internal service — gated by a
shared `X-Service-Token`, never exposed publicly. See
`docs/product/feature-status-map.md` for current status and
`docs/product/feature-bot-platform.md` for historical design context.

## Flow

```
backend ──(X-Service-Token)──> POST /bots/:subjectId/start
   │
   ├─ config-loader: read bots.bot_instances + billing.{runtime,feature}_subscriptions
   │                 + feature_config_values, decrypt secrets (AES-256-GCM)
   ├─ build env: DISCORD_TOKEN, ENABLED_FEATURES, per-feature config keys
   └─ runner.start(): pm2 start central-bot  →  name bot-<subjectId>
```

A start is refused unless the bot exists, runtime is `ACTIVE`, it has a token, and
at least one feature is live — so an unpaid/expired bot never comes online.

## API

| Method | Path | Effect |
| --- | --- | --- |
| POST | `/bots/:id/start` | compose env + start the process |
| POST | `/bots/:id/stop` | stop + remove the process |
| POST | `/bots/:id/restart` | rebuild env + restart |
| GET  | `/bots/:id/status` | PM2 process state |
| GET  | `/healthz` | liveness (no auth) |

## Swapping the runner

`src/runner/` hides PM2 behind `{ start, stop, restart, status }`. To move to a
container model, add `docker-runner.js` with the same four methods and switch
`src/runner/index.js`. Nothing else changes.

## Local dev

```bash
cp .env.example .env   # DATABASE_URL, BOT_SECRET_KEY, SERVICE_TOKEN, CENTRAL_BOT_ENTRY
npm install
npm run dev
```

Run builds or deeper verification only when explicitly requested.
