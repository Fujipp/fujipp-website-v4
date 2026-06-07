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
- Headers: `x-api-key: <VOUCHER_SERVICE_TOKEN>` (required), `X-Client-Id: kanom-001`
  (optional, for attribution; defaults to `kanom-001`).
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
