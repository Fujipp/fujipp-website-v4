# Repository Map

## Source Of Truth

- Global AI rules: `.agents/README.md`.
- Frontend rules: `.agents/frontend.md`, `frontend/AGENTS.md`.
- Backend rules: `.agents/backend.md`.
- Database rules: `.agents/database.md`.
- Changelog rules: `docs/changelog/README.md`.

If `README.md` conflicts with `.agents/*`, prefer `.agents/*`; parts of `README.md` are older.

## Top-Level Areas

- `frontend/`: Vue 3, TypeScript, Vite, Tailwind CSS v4, Bun, Supabase client, Pinia, i18n.
- `backend/`: Spring Boot 4.0.6, Java 21, JPA/Hibernate validate, JWT auth, API gateway to billing/runtime.
- `services/billing-service/`: Spring Boot 4 billing, wallet, catalog, subscriptions, audit, feature config.
- `services/voucher-service/`: Spring Boot 4 TrueMoney voucher redeem service.
- `services/bot-runtime-service/`: Node/Express orchestrator; decrypts config and runs customer bot processes through PM2.
- `services/central-bot/`: Node/Discord.js configurable bot codebase; feature modules run per customer bot.
- `supabase/migrations/`: PostgreSQL schema source of truth.
- `docker/`, `infrastructure/`: deployment, compose, nginx, VPS bootstrap.
- `docs/`: product, migration, embed designer, onboarding, secrets inventory, changelogs.

## Efficient Discovery

- List files: `rg --files -g '!**/node_modules/**' -g '!**/target/**' -g '!**/dist/**'`.
- Frontend feature tree: `find frontend/src/features -maxdepth 3 -type d`.
- Backend packages: `find backend/src/main/java/fujipp/project/backend -maxdepth 3 -type d`.
- Services: `find services -maxdepth 3 -type d -not -path '*/node_modules/*' -not -path '*/target/*'`.
- Migrations: `ls supabase/migrations | tail`.

## Common Task Routing

- UI/layout/component: frontend rules + `references/frontend.md`.
- API endpoint or auth: backend rules + `references/backend-services.md`.
- Billing/wallet/subscription/catalog: backend services reference, then inspect `services/billing-service/`.
- Bot runtime/start/stop/placement: inspect `backend/runtime`, `backend/service/*Bot*`, `services/bot-runtime-service/`.
- Discord bot behavior: inspect `services/central-bot/src/features/<feature>/` and related migrations/config templates.
- Schema/RLS/indexing: database rules + `references/database.md` + Supabase skills.
