# Changelog — Backend

**Current version: `0.1.6`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.1.6` | 2026-06-13 | admin: extract `AdminAccessService.requireAdmin` (reused by `VpsNodeAdminService`); new `AdminController` user directory — `GET /api/admin/users` (search) + `GET /api/admin/users/{id}` |
| `0.1.5.4` | 2026-06-10 | trim Discord bot tokens and client secrets before encrypting bot credentials |
| `0.1.5.3` | 2026-06-10 | runtime bot actions now return orchestrator error JSON instead of Spring's generic 400 body |
| `0.1.5.2` | 2026-06-10 | fix embed config merge SQL to avoid JDBC treating the JSONB `?` operator as bind parameters |
| `0.1.5.1` | 2026-06-10 | embed config API merges seeded component roles into per-bot overrides so existing bot configs inherit new buttons/dropdowns |
| `0.1.5` | 2026-06-09 | embed config API: `GET/PUT /api/bots/{id}/embeds[/{slot}]` (registry default + per-bot override via JdbcTemplate, ownership-checked) |
| `0.1.4` | 2026-06-09 | admin VPS management (`GET/POST/PATCH /api/admin/vps-nodes`, role-gated) + move a bot across hosts (`POST /api/admin/bots/{id}/move`: stop → capacity-checked reassign → start) |
| `0.1.3` | 2026-06-09 | runtime automation (gated off): [billing] daily renewal/expiry sweep (charge → extend / grace → PAST_DUE → SUSPENDED, notifications + run log) via `POST /api/billing/automation/run`; backend `@Scheduled` 03:00 Asia/Bangkok stops suspended bots |
| `0.1.2` | 2026-06-09 | proxy subscription lifecycle: auto-renew toggle + renew-now for runtime & feature (`PATCH/POST /api/subscriptions/{runtime,features}/{id}/...`) |
| `0.1.1` | 2026-06-09 | VPS slots: VpsNode entity/repo, PlacementService (locked capacity check), node-aware runtime routing, `GET /api/bots/capacity`, create-bot with a plan reserves a slot + charges runtime (rollback on failure) |
| `0.1.0` | 2026-06-08 | proxy feature and runtime subscription lists for Shop dashboard data |
| `0.0.9.1` | 2026-06-08 | store bot public key + client secret; make SecretCipher boot-safe (lazy key) |
| `0.0.9` | 2026-06-08 | proxy bot start/stop/restart/status to the orchestrator (`/api/bots/{id}/start` …) |
| `0.0.8` | 2026-06-08 | proxy bot config (`/api/bots/{id}/config` GET/PUT) to billing with ownership check |
| `0.0.7` | 2026-06-08 | add bot registry API (`/api/bots` list/create) with AES-GCM token encryption |
| `0.0.6` | 2026-06-08 | proxy shop catalog + orders to billing-service (`/api/catalog/*`, `/api/orders`) |
| `0.0.5.1` | 2026-06-05 | connect via Supabase transaction pooler (6543) + prepareThreshold=0; cap Hikari pool |
| `0.0.5` | 2026-06-04 | add credit top-up with SlipOK verification and PromptPay QR |
| `0.0.4` | 2026-06-04 | add featured projects management |
| `0.0.3` | 2026-06-04 | [billing] update payment confirmation, wallet, and pricing models |
| `0.0.2` | 2026-06-03 | [billing] add credit wallet and commerce service |
| `0.0.1` | 2026-06-02 | add project portfolio management API |
| `0.0.0.1` | 2026-06-02 | update env example and application properties |
