# true-wallet-voucher

Internal TrueMoney voucher redeem service for customer bots. The service exposes
`POST /v1/redeem` and should run on the VPS loopback interface so bot processes
can call it without exposing the key-management endpoints publicly.

## Runtime

```bash
cp .env.example .env
npm install
npm run db:setup -- --client kanom-001 --name "Kanom 001"
npm run build
npm run start:prod
```

`MASTER_KEY` must be 32 random bytes as base64 or hex. Example:

```bash
openssl rand -base64 32
```

`db:setup` applies Prisma migrations, creates/updates the client row, and prints
the first full API key when the client has no active key yet. Re-running it is
safe; add `--force-key` only when you intentionally want to issue another key.
Use `--key-file ./data/kanom-001.full-key` when a deploy script needs to reuse
the generated key without scraping logs.

## API

`X-Api-Key` must be the full key returned by `keys:create`:

```http
POST /v1/redeem
X-Api-Key: ak_live_xxx.secret
Content-Type: application/json

{
  "phone": "0812345678",
  "gift_url": "https://gift.truemoney.com/campaign/?v=..."
}
```

## VPS Notes

Recommended PM2 command:

```bash
pm2 start dist/main.js --name truemoney-voucher --cwd /path/to/services/true-wallet-voucher --update-env
```

Use `TRUEMONEY_BASE=http://127.0.0.1:3611` in the bot config.
