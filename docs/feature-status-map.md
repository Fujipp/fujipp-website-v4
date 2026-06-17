# Feature Status Map

Last updated: 2026-06-18

This map is the project-level source of truth for "what exists, what is usable, and what should come next."
It was built from current routes, controllers, services, migrations, changelogs, and design docs. When older
design docs conflict with newer code/changelog entries, treat the newer code/changelog as more reliable.

## Status Legend

| Status | Meaning |
| --- | --- |
| Done | Implemented enough to treat as a stable project capability, pending normal maintenance. |
| Usable | Main loop exists and is wired, but still needs polish, production verification, or edge-case hardening. |
| Partial | Important pieces exist, but the feature is not yet safe to treat as complete. |
| Planned | Intended or designed, but not confirmed as implemented. |
| Risk | Works or may work, but has deployment, stale-doc, data, money, or customer-impact risk. |

## Product Areas

| Area | Status | Evidence | Next Move |
| --- | --- | --- | --- |
| Portfolio site | Usable | Public routes for home, about, contact, performance, privacy, project list/detail; project CRUD/admin routes and backend project APIs exist. | Revise UI/story so visitors immediately understand Fujipp's skill, trust, and strongest work. |
| Projects CMS | Usable | `ProjectController` exposes public projects plus admin create/update/delete/featured; frontend has project table, editor, timeline/blog/gallery components. | Audit editing UX and decide what content model is final before adding more project fields. |
| Auth/profile | Usable | Supabase auth client, PKCE callback cleanup, `/api/auth/me`, `/api/auth/profile`, role-gated admin routes. | Keep auth boring; only touch when a real login/profile/admin issue appears. |
| Customer shop dashboard | Usable | `/shop` loads bots, catalog, runtime, feature subscriptions, capacity; create bot and start/stop/restart are wired to backend APIs. | UI revise and real customer flow QA: empty states, errors, loading, first-bot onboarding. |
| Wallet/top-up web flow | Usable | `/shop/wallet` wallet balance, PromptPay QR, slip upload/verify; backend `/api/wallet` and billing wallet/topup endpoints exist. | Verify production SlipOK/PromptPay config and make failure states customer-friendly. |
| Package purchase | Usable | `/shop/package` loads live catalog/runtime/wallet/bots and posts `/api/orders` with idempotency key. | Make purchase copy clearer: feature is permanent per bot, runtime is recurring/renewable. |
| Bot config | Usable | `/shop/bots/:botId/config` loads feature templates/values/channels/roles, saves config, supports custom Roblox form and review-credit counter. | Refine feature-specific forms and make required setup order obvious. |
| Embed Designer | Usable | Shared embed editor/preview reused by shop/admin; backend embed APIs and seeded slot defaults exist. | Reduce complexity in UI and document which fields are safe for customers to edit. |
| Admin panel | Usable | Admin dashboard, users, wallet, subscriptions, pricing, bots, transfer, bot config/embeds, VPS node health/move APIs are present. | Treat as operator tool: polish dense tables, audit dangerous actions, keep change logs clear. |

## Backend And Services

| Area | Status | Evidence | Next Move |
| --- | --- | --- | --- |
| Main backend gateway | Usable | Spring Boot 4 API gateway for projects, auth/profile, wallet, catalog/orders, subscriptions, bots, embeds, admin, VPS. | Keep controllers thin and avoid expanding scope without matching frontend/database updates. |
| Billing service | Usable | Wallet, orders, catalog/pricing, subscriptions, feature config, admin audit, automation services/controllers exist. | Money changes need careful transactional review and explicit verification when requested. |
| Voucher service | Usable | Spring Boot TrueMoney redeem service with `/v1/redeem`; recent changelog says platform-client validation is enforced. | Keep service locked to platform-run bots; do not loosen auth/client checks. |
| Bot runtime service | Usable/Risk | Node orchestrator reads bot/config from Supabase, decrypts secrets, injects env, runs central-bot through PM2, exposes bot lifecycle. | Production smoke checklist is needed for each host: DB URL, shared keys, health, PM2, central-bot logs. |
| Central bot platform | Usable/Risk | Feature-module bot with Roblox shop, wallet top-up/history, top spender rank, review credit, voice keeper. | Treat Discord/customer bots as live operations: verify per feature before selling broadly. |
| Deployment/infra | Partial/Risk | Docker/prod compose, nginx, VPS bootstrap, deploy notes, secret inventory, and frontend asset guard exist. | Create a small deploy/runbook checklist before next production-facing push. |

## Discord Bot Features

| Feature | Status | Evidence | Next Move |
| --- | --- | --- | --- |
| Roblox Robux shop/payout | Usable/Risk | Panel buy flow, package dropdown, payout queue, refunds, stock cache, and configurable embeds are in central-bot/changelog. | Production cutover checklist: Roblox group config, stock polling, payout permissions, wallet dependency. |
| Wallet top-up | Usable/Risk | PromptPay QR + SlipOK, TrueMoney voucher, fee config, notify role/access role, success/fail embeds exist. | Real payment verification and customer-facing config simplification. |
| Wallet history | Usable | Central-bot feature and seeded config exist; `/history`, `/wallet-get`, `/wallet-set` noted in changelog. | Confirm it appears only for bots that own the feature. |
| Top spender rank | Usable | Leaderboard/rank/milestone feature, seeded templates, and top-up resync are in changelog/migrations. | Verify role sync with real Discord permissions. |
| Review credit | Usable | Feature module, DB counter state, API read/set/recount, STRING_LIST config, and price seed exist. | Polish config form language and test recount on a real review channel before customer use. |
| Voice keeper | Partial | Central-bot feature and database seed exist; migration notes say no price yet, so it may be visible but not purchasable until priced. | Add/confirm price in admin Pricing, then verify join/rejoin behavior on a real guild. |

## Known Risks And Stale Sources

- `docs/feature-bot-platform.md`, `docs/embed-designer.md`, and `docs/kanom-flow.md` contain useful history but some status lines are stale compared with newer changelogs.
- `README.md` still contains older frontend paths and commit guidance; `.agents/*` should be treated as source of truth.
- Several features are "implemented" but not proven here by running services; verification was not requested for this map.
- Payment, wallet, subscription, bot runtime, and Discord actions are customer-impacting. They need explicit verification before confident production claims.

## Recommended Sprint 1

Sprint goal: make the customer shop lifecycle understandable and safely demo-able end to end.

1. Revise shop UX copy and flow.
   Focus on `/shop`, `/shop/package`, `/shop/wallet`, and `/shop/bots/:botId/config`. Explain the sequence: create bot, buy runtime, buy feature, configure, start.

2. Create a production smoke checklist.
   Cover backend, billing, voucher, runtime, central-bot, Supabase pooler URL, shared secret keys, PM2 status, Discord token validity, and payment config.

3. Clean stale docs that mislead agents.
   Update or mark older design docs as historical so AI agents stop treating old "not implemented" notes as current truth.

4. Confirm feature sellability.
   Check which features have prices and active catalog rows. Price/activate `voice-keeper` if it should be sold now.

5. Run one real demo flow only when requested.
   Suggested flow: create test bot -> top up wallet -> buy runtime + one feature -> configure -> start -> verify Discord behavior -> stop.

## Recommended AI Agent Behavior

- Start with this map, `.agents/README.md`, and `.agents/skills/fujipp-platform/SKILL.md`.
- Load only the matching reference file for the current scope.
- Prefer fixing one customer-visible loop at a time over broad rewrites.
- Update this file whenever a feature changes from Partial to Usable or Usable to Done.
