# Backend And Services Reference

Read `.agents/scopes/backend.md` before `backend/` changes.

For the detailed service map, runtime/billing/voucher flows, key env vars, and
debugging entry points, read `docs/operations/backend-services.md`.

## Main Backend

- Path: `backend/`.
- Stack: Spring Boot 4.0.6, Java 21, Maven wrapper, Spring Data JPA, Spring Security, OAuth2 resource server, validation.
- Base package: `fujipp.project.backend`.
- Layers: `controller/`, `service/`, `repository/`, `model/`, `dto/`, `config/`, `billing/`, `runtime/`, `security/`.
- Auth is stateless Supabase JWT. Do not introduce sessions.
- JPA uses `ddl-auto=validate`; schema comes from Supabase migrations.

Keep controllers thin, expose DTOs not entities, place business rules in services, and isolate external calls in clients.

## Billing Service

- Path: `services/billing-service/`.
- Stack: Spring Boot 4, Java 21, JPA.
- Owns wallets, payments, catalog/pricing, runtime and feature subscriptions, feature config, admin audit, automation.
- Treat money/subscription updates as sensitive: preserve auditability, transactionality, and reversibility.

## Voucher Service

- Path: `services/voucher-service/`.
- Stack: Spring Boot 4, Java 21.
- Owns TrueMoney voucher redeem flow for top-ups.
- Do not weaken client validation or token checks.

## Bot Runtime Service

- Path: `services/bot-runtime-service/`.
- Stack: Node CommonJS, Express, pg, PM2.
- Reads bot/config from Supabase, decrypts secrets, composes env, runs `central-bot` per customer subject.
- Be careful with process lifecycle, health checks, env injection, and pooler URLs.

## Central Bot

- Path: `services/central-bot/`.
- Stack: Node CommonJS, Discord.js, pg, Express.
- One configurable Discord bot codebase. Feature modules live in `src/features/`.
- Current feature areas include Roblox shop/payout, wallet top-up/history, top spender rank, review credit, voice keeper.
- Config/templates are often seeded by Supabase migrations and rendered at runtime.

## Verification Caution

Do not run Maven, Node service starts, tests, or browser checks unless the user explicitly asks. Many commands touch real Supabase or live-style service config.
