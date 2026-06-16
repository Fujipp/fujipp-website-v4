# voucher-service

TrueMoney gift-voucher redeem (top-up) service. Java Spring Boot, mirrors
`services/billing-service`. Replaces the old NestJS/SQLite `true-wallet-voucher`.

- **Storage**: Supabase Postgres, `voucher` schema (see
  `supabase/migrations/*_create_voucher_service.sql`). `redeem` holds the top-up
  history (phone + amount + outcome); `phone_summary` is a per-number view.
- **Networking**: internal only. In prod it's published on `127.0.0.1:3611` (container
  port `8082`) so the legacy PM2 bots reach it over host loopback — base URL unchanged.

## API

`POST /v1/redeem`
- Headers: `x-api-key: <VOUCHER_SERVICE_TOKEN>` (required), `X-Client-Id` — the bot's
  subject id (central-bot sends `ctx.config.subjectId`). Required when the platform check
  is on (the default; see *Restricting to your network* below).
- Body: `{ "phone": "08XXXXXXXX", "gift_url": "https://gift.truemoney.com/campaign/?v=...",
  "idempotencyKey": "optional" }`
- Returns the redeem record: `status`, `amount` (baht), `currency`, `issuer`,
  `failCode`/`failReason`, etc. A retried request with the same `idempotencyKey` returns
  the first record.

`GET /actuator/health` — open (used by the container healthcheck).

## Auth & rotation

A single shared token (`VOUCHER_SERVICE_TOKEN`) — no per-client keys, no MASTER_KEY.
To rotate: change the `VOUCHER_SERVICE_TOKEN` GitHub secret + the bots' token value,
then redeploy.

## Restricting to your network

Redeem is locked to **bots we run on the platform**. With `VOUCHER_CLIENT_CHECK_ENABLED=true`
(the default), a redeem is accepted only if `X-Client-Id` is a real subject id in
`bots.bot_instances` — so every shop that buys the top-up feature works automatically as
new shops appear, with no list to maintain. An unknown or missing id is rejected with
`403 {"error":"client not allowed"}`, so a leaked token alone can't be used by an outside
caller. (The service reads `bots.bot_instances` over the shared Supabase datasource.)

- central-bot sends each shop's **subject id** as `X-Client-Id`.
- To revoke a shop, remove/disable its bot in the platform — the redeem stops working.
- `VOUCHER_ALLOWED_CLIENT_IDS` is an optional, additive always-allow list for non-bot
  internal callers; usually left empty.

Set `VOUCHER_CLIENT_CHECK_ENABLED=false` only for local/dev runs that have no bot rows
(then any caller with a valid token is accepted, id defaults to `kanom-001`).

## Config (`.env`, see `.env.example`)

`DB_URL` / `DB_USERNAME` / `DB_PASSWORD` (same Supabase project),
`VOUCHER_SERVER_PORT` (8082), `VOUCHER_SERVICE_TOKEN`, `TW_USER_AGENT`, `TW_TIMEOUT_MS`,
and `VOUCHER_ADAPTER` (`truewallet` | `mock`).

## Run locally

```bash
# build (connects to no DB at build time)
mvn -DskipTests package
# run against a DB with the voucher schema applied
VOUCHER_ADAPTER=mock VOUCHER_SERVICE_TOKEN=dev mvn spring-boot:run
```
