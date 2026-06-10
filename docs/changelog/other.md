# Changelog — Other (infra · CI · docs · tooling)

**Current version: `0.0.11.2`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.0.11.2` | 2026-06-10 | central-bot: embed renderer merges seeded component roles into per-bot overrides while preserving edited embed body fields |
| `0.0.11.1` | 2026-06-10 | docs: clarify Kanom test-bot handoff and fixed component-role model for Embed Designer continuation |
| `0.0.11` | 2026-06-10 | central-bot: panel/top-up components read configurable label/emoji/style/placeholder/url appearance from embed JSON roles |
| `0.0.10` | 2026-06-10 | central-bot: panel injects per-group Robux stock fields + select option stock descriptions (matches Kanom layout); posts to channel |
| `0.0.9.9` | 2026-06-10 | central-bot: admin gate uses server Administrator permission (or AUTHORIZED_USER_IDS) for /panel, /wallet-add, /robux-payout |
| `0.0.9.8` | 2026-06-10 | central-bot: TrueMoney voucher top-up (F3) — เติมเงิน→method→modal→voucher-service /v1/redeem→credit→topup_success/failed |
| `0.0.9.7` | 2026-06-10 | central-bot: panel buy flow (F4) — group select → modal (username + Robux) → shared redeem (debit→payout→refund) → redeem_success |
| `0.0.9.6` | 2026-06-10 | central-bot: component interaction routing (buttons/selects/modals) + `/panel` shop panel (group select + topup/buy/balance/link); balance wired, payment/payout stubbed (F1) |
| `0.0.9.5` | 2026-06-09 | central-bot: configurable embed renderer (loads slot template, substitutes {{vars}}); wallet `/wallet` + `/wallet-add` render from config |
| `0.0.9.4` | 2026-06-09 | add Embed Designer plan (configurable bot embeds: slots, JSON templates, live preview, custom-emoji render) |
| `0.0.9.3` | 2026-06-09 | add Kanom onboarding/migration plan (NEON → shop ETL, multi-group config, cutover) |
| `0.0.9.2` | 2026-06-08 | document legacy TrueMoney voucher deployment variables and local service endpoint |
| `0.0.9.1` | 2026-06-08 | billing SecretCipher boot-safe; orchestrator passes bot public key + client secret to bot env |
| `0.0.9` | 2026-06-08 | central-bot wallet-topup feature (shop wallet store) + Roblox `/robux-redeem` debits it |
| `0.0.8.1` | 2026-06-08 | billing: expose `priceId` in FeaturePriceResponse so the shop can purchase a SKU |
| `0.0.8` | 2026-06-08 | billing: per-bot feature config endpoints (`/api/billing/bots/{id}/config` GET/PUT, AES-GCM secrets) |
| `0.0.7.6` | 2026-06-08 | billing OrderService: permanent feature purchase is now per-bot (scope=BOT) |
| `0.0.7.5` | 2026-06-07 | remove the retired Node true-wallet-voucher service (replaced by voucher-service) |
| `0.0.7.4` | 2026-06-07 | fix voucher Accept header (parseMediaTypes) — invalid mime crashed boot |
| `0.0.7.3` | 2026-06-07 | fix .env newline so VOUCHER_SERVICE_TOKEN reaches the container (voucher boot failure) |
| `0.0.7.2` | 2026-06-07 | smoke-test the voucher service (health + auth) on deploy before repointing the bot |
| `0.0.7.1` | 2026-06-07 | point the PM2 bot at the voucher service via VOUCHER_SERVICE_TOKEN on deploy |
| `0.0.7` | 2026-06-07 | rewrite voucher service in Java/Supabase (mirrors billing); drop SQLite/MASTER_KEY/bootstrap from deploy |
| `0.0.6.1` | 2026-06-07 | add on-demand truemoney key rotation (workflow_dispatch input; revokes the old key) |
| `0.0.6` | 2026-06-07 | stop bootstrap from printing the full API key when writing it to a file (CI log leak) |
| `0.0.5.9` | 2026-06-07 | inject MASTER_KEY directly into the bootstrap container + guard against an empty key |
| `0.0.5.8` | 2026-06-07 | inject truemoney MASTER_KEY from its own secret into the rendered .env |
| `0.0.5.7` | 2026-06-07 | raise truemoney mem_limit to 512m (argon2 + ts-node bootstrap OOM at 256m) |
| `0.0.5.6` | 2026-06-07 | point truemoney DATABASE_URL at /app/data (absolute) and migrate before bootstrap |
| `0.0.5.5` | 2026-06-07 | install OpenSSL in the truemoney image so the Prisma query engine loads |
| `0.0.5.4` | 2026-06-07 | ship truemoney src + scripts + tsconfig in prod image so the ts-node bootstrap can run |
| `0.0.5.3` | 2026-06-07 | set truemoney NODE_ENV after npm ci so prod image keeps prisma CLI + ts-node (migrate/bootstrap work) |
| `0.0.5.2` | 2026-06-07 | export image vars in deploy so docker compose interpolation resolves them |
| `0.0.5.1` | 2026-06-07 | backend deploy rolls only the changed service(s) (paths-filter + targeted compose up) |
| `0.0.5` | 2026-06-07 | wire TrueMoney voucher service into backend CI/CD and production compose |
| `0.0.4.1` | 2026-06-07 | add bootstrap migration command for TrueMoney voucher service |
| `0.0.4` | 2026-06-07 | add TrueMoney voucher redeem service scaffold |
| `0.0.3` | 2026-06-05 | scaffold bot-runtime-service orchestrator (PM2 runner, AES-GCM secret decrypt) |
| `0.0.2` | 2026-06-05 | scaffold central-bot service (feature-module system + Roblox feature) |
| `0.0.1.6` | 2026-06-05 | add Feature Bot platform design doc (sell/config/run flow) |
| `0.0.1.5` | 2026-06-05 | add backend & database agent rules and per-area changelog |
| `0.0.1.4` | 2026-06-04 | deploy frontend over FTP (shared host has no SSH) |
| `0.0.1.3` | 2026-06-04 | drop --frozen-lockfile for frontend (bun.lock drifts from package.json) |
| `0.0.1.2` | 2026-06-04 | add main-only deploy pipelines for frontend and backend |
| `0.0.1.1` | 2026-06-04 | add VPS bootstrap script and deployment guide |
| `0.0.1` | 2026-06-04 | containerize backend and billing for the shared VPS |
| `0.0.0.9` | 2026-06-04 | add SlipOK API guide |
| `0.0.0.8` | 2026-06-03 | add Supabase CLI dependency |
| `0.0.0.7` | 2026-06-03 | add repository workflow guidance |
| `0.0.0.6` | 2026-06-02 | update README |
| `0.0.0.5` | 2026-05-26 | refine push workflow grouping |
| `0.0.0.4` | 2026-05-26 | sync work and push |
| `0.0.0.3` | 2026-05-23 | push current project-setup changes |
| `0.0.0.2` | 2026-05-23 | add repository setup guide |
| `0.0.0.1` | 2026-05-23 | Initial commit |
