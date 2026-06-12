# Changelog — Other (infra · CI · docs · tooling)

**Current version: `0.0.15.16`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.0.15.16` | 2026-06-13 | central-bot: retire the robux-check / robux-balance / robux-payout / robux-redeem slash commands — the feature now exposes only /panel; all member flows run through the shop panel components (commands.set overwrites the registered set, so the old commands disappear from Discord on the next bot restart) |
| `0.0.15.15` | 2026-06-13 | central-bot: remove the ซื้อสินค้า button from the shop panel — buying goes through the group select; buttons are now เติมเงิน / เช็คยอดคงเหลือ (+ optional link). Stale panels keep working until their auto-refresh rebuilds the components |
| `0.0.15.14` | 2026-06-13 | central-bot: last hardcoded Robux embeds now render from Embed Designer slots — buy-queue (`buy_queued`), notify channel (`notify_success`/`notify_error`), /robux-check (`check_result`, green/red by result unless template sets a color), /robux-balance (`group_balance`), /robux-payout (`payout_admin_success`), /robux-redeem (reuses seeded `redeem_success`) — every embed the feature sends is editable now |
| `0.0.15.13` | 2026-06-13 | central-bot: Robux package dropdown reads the `buy_eligible` slot's `pkg_select` component role (placeholder / per-option emoji / `option_label` template `{{robux}}`/`{{price}}` / ok/insufficient descriptions) instead of hardcoded text — frontend designer fields pending |
| `0.0.15.12` | 2026-06-13 | central-bot: Robux payout review fixes — claim pending purchase before validation so a double-click on confirm can't double-debit; select value carries robux+price (not index) so config edits mid-flow can't swap the package; /robux-redeem reuses redeem.js core + eligibility check before debit; panel refresh timers keyed per channel (re-posting /panel stops the old poller); payout queue falls back to DM when the interaction token (15 min) has expired |
| `0.0.15.11` | 2026-06-12 | central-bot: PromptPay countdown back to the precise "X นาที YY วินาที" text, but now ticking every 1s (was a live Discord timestamp / 15s edits); `topup_qr` `{{countdown}}` restored to the code-block style |
| `0.0.15.10` | 2026-06-12 | central-bot: top-up method picker is now two buttons (PromptPay / TrueMoney) instead of a select menu, so a member can pick, finish, and pick again without the dropdown sticking on the last choice; labels/emoji read optional `btn_promptpay`/`btn_truemoney` component roles |
| `0.0.15.9` | 2026-06-12 | central-bot: PromptPay top-up countdown is now a live Discord relative timestamp (`<t:…:R>`, ticks down realtime client-side) instead of a 15s message-edit loop; `topup_qr` default moves `{{countdown}}` out of the code block so the timestamp renders |
| `0.0.15.8` | 2026-06-12 | central-bot: Roblox buy-flow eligibility + loading embeds are now configurable Embed Designer slots (`buy_eligible`, `buy_loading`); Robux packages can be customized per-shop via the new `ROBUX_PACKAGES` JSON config (overrides the rate tables when set) |
| `0.0.15.7` | 2026-06-12 | central-bot: Roblox buy-flow confirm + payout-success embeds are now configurable Embed Designer slots (`buy_confirm` vars `{{roblox_id}}/{{robux}}/{{price}}/{{balance_after}}/{{avatar}}`; `buy_success` vars `{{roblox_id}}/{{robux}}/{{price}}/{{balance}}/{{avatar}}`) instead of hardcoded |
| `0.0.15.6` | 2026-06-12 | central-bot: Roblox buy-flow error embed is now a configurable Embed Designer slot (`buy_error`, vars `{{reason}}/{{username}}/{{datetime}}/{{avatar}}`) instead of hardcoded — first step of making the buy embeds editable |
| `0.0.15.5` | 2026-06-11 | dev tooling: `docs/secrets-inventory.md` (full env/secret map), root `Makefile` (`make dev` / `dev-full` + per-service targets), and `scripts/check-secrets.sh` (verify shared secrets match across `.env` files via fingerprints, no values printed) |
| `0.0.15.4` | 2026-06-11 | deploy-backend: optional `SHOP_DATABASE_URL` secret appended as `DATABASE_URL` after the env blob, so the runtime + bots can use the Supabase transaction pooler without editing `BACKEND_ENV_FILE` |
| `0.0.15.3` | 2026-06-10 | bot-runtime: document Supabase transaction pooler (port 6543, `?pgbouncer=true`) as the prod DATABASE_URL recommendation in `.env.example`, so the shared shop-wallet DB stays under the connection ceiling as bot count grows |
| `0.0.15.1` | 2026-06-10 | bot-runtime: include PM2 status and central-bot error-log tail when `/readyz` never opens, so start failures show the real boot error instead of only ECONNREFUSED |
| `0.0.15` | 2026-06-10 | central-bot: new wallet-history (/history, /wallet-get, /wallet-set with ADJUST ledger) and top-spender-rank (/top leaderboard + rank/milestone roles) features |
| `0.0.14` | 2026-06-10 | central-bot: /panel auto-refreshes live group stock + optional countdown (PAYMENT_COUNTDOWN_TARGET = ISO date or seconds-from-post, PAYMENT_REFRESH_INTERVAL ms) |
| `0.0.13` | 2026-06-10 | central-bot: full Robux buy flow (eligibility check → package select by rate w/ Kanom price tables → confirm → payout queue with cooldown + refund on failure + Roblox-avatar notifications) replacing the free-amount buy modal |
| `0.0.12` | 2026-06-10 | central-bot: PromptPay QR top-up (promptpay.io, countdown → timeout) + SlipOK slip verification in SLIP_CHECK_CHANNEL crediting the shop wallet; bot.js supports per-feature gateway intents + events |
| `0.0.11.6` | 2026-06-10 | central-bot: fix Robux redeem cost — ROBUX_RATE is Robux-per-baht, so cost = ceil(robux / rate * 100) (was robux × rate) |
| `0.0.11.5` | 2026-06-10 | bot-runtime trims decrypted Discord credentials before injecting central-bot env |
| `0.0.11.4` | 2026-06-10 | central-bot/runtime: expose boot failure reasons through `/readyz` so Start returns the real Discord/login error |
| `0.0.11.3` | 2026-06-10 | bot-runtime: wait for central-bot `/readyz` before marking a bot RUNNING, and clean up failed PM2 starts |
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
