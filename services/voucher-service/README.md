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
- Headers: `x-api-key: <VOUCHER_SERVICE_TOKEN>` (required), `X-Client-Id`
  (the caller's id — a central-bot shop sends its subject id, the legacy PM2 bot sends
  `kanom-001`). Optional only when the allowlist is off; when it's on the id is required
  (see *Restricting to your network* below).
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

Set `VOUCHER_ALLOWED_CLIENT_IDS` (comma-separated) to lock the service to your own
clients. When set, a redeem is accepted only if `X-Client-Id` is in the list — a missing
or unknown id is rejected with `403 {"error":"client not allowed"}`, so a leaked token
alone can't be used by an outside shop. Each id can be revoked independently by removing
it from the list and redeploying.

- central-bot shops send their **subject id** as `X-Client-Id`.
- the legacy PM2 bot sends `kanom-001`.

Example: `VOUCHER_ALLOWED_CLIENT_IDS=kanom-001,<your-shop-subject-id>`. Leave the var
empty to disable the allowlist (any caller with a valid token is accepted).

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
