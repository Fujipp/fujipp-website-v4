# Changelog — Backend

**Current version: `0.5.2`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.5.2` | 2026-07-12 | Added a /topup-monthly command to the wallet top-up feature: members can check their own 1-month top-up total, and admins can view any member's total or the whole shop's monthly total. |
| `0.5.1` | 2026-07-10 | Admins can now update each Shop feature’s name, description, and icon selection. |
| `0.5.0` | 2026-07-10 | Runtime is now bought by duration before selecting a bot; overdue or non-renewed Runtime releases its VPS seat back to available inventory after the configured grace period. |
| `0.4.9` | 2026-07-09 | Added the App Premium Shop feature to central-bot: /app-panel with 3 live category dropdowns from the gafiwshop reseller API, wallet-paid buying with per-product baht margins, account delivery by DM, a public delivered announcement, a full-order admin log channel (the order store — no order table), and automatic refund when the upstream buy fails |
| `0.4.8.13` | 2026-07-08 | Added a backend/services architecture map covering the Spring gateway, billing-service, voucher-service, runtime orchestrator, central-bot, critical purchase/start/top-up flows, key env vars, pooler notes, and debugging entry points |
| `0.4.8.12` | 2026-07-07 | TrueMoney voucher top-up now skips the unbound preflight verify and lets the mobile-bound redeem flow decide validity, avoiding false "voucher invalid/used" failures before the phone-specific redeem attempt |
| `0.4.8.11` | 2026-07-06 | Feature purchases (RENT_MONTHLY / RENT_PERMANENT) no longer require a bot: billing-service allows a null externalSubjectId so items land in the user's unassigned stack (duplicate/runtime-active gates now apply only when buying directly onto a bot; the stack may hold duplicates) |
| `0.4.8.10` | 2026-07-06 | Feature subscriptions can now be assigned/moved/unassigned between a user's bots: billing-service POST /features/{id}/assign (BOT-scope only, ownership-checked, no duplicate feature per bot) proxied by the gateway as POST /api/subscriptions/features/{id}/assign, which best-effort restarts the affected online bots so ENABLED_FEATURES refreshes |
| `0.4.8.9` | 2026-07-05 | Public health now includes a cached server resource snapshot for the lightweight Performance dashboard |
| `0.4.8.8` | 2026-07-05 | Fixed runtime config cache query casts so text subject ids and UUID bot ids compare correctly during resume-on-boot |
| `0.4.8.7` | 2026-07-05 | Reduced bot-runtime config loading from multiple Supabase round trips to one combined query with a short invalidatable cache |
| `0.4.8.6` | 2026-07-05 | Reduced default Supabase pooler usage by shrinking service pools, releasing idle connections, and making health monitoring database writes/probes opt-in |
| `0.4.8.5` | 2026-07-05 | Tuned billing-service database pooling so the new VPS can run with a smaller, steadier connection footprint |
| `0.4.8.4` | 2026-06-27 | Admin dashboard "VPS slots" now counts seats actually held by an active runtime, matching the VPS view, instead of under-counting placed bots |
| `0.4.8.3` | 2026-06-25 | Admin bot directory response now includes the bot's Discord avatar URL |
| `0.4.8.2` | 2026-06-24 | Bot card Online/Offline tag now reflects whether the bot process is actually running, not just whether its runtime is paid |
| `0.4.8.1` | 2026-06-24 | Fixed a server error when assigning a bot to a runtime seat that was currently unassigned |
| `0.4.8` | 2026-06-22 | Admins can see active runtimes that hold no server seat and assign them to a free one |
| `0.4.7` | 2026-06-22 | Assigning or moving runtime now brings the affected bots online/offline automatically |
| `0.4.6` | 2026-06-22 | Admins can review every hosting seat with its owner and relocate a runtime to another seat |
| `0.4.5` | 2026-06-22 | Admins can set VPS capacity and reserved seats, and put individual seats into maintenance |
| `0.4.4` | 2026-06-22 | Bots now show a live Online / Offline / Expired badge based on their real runtime |
| `0.4.3` | 2026-06-22 | Added the server-seat runtime flow: buy hosting for a chosen VPS seat and move it between bots |
| `0.4.2` | 2026-06-22 | Added permanent bot slots: members get three free bots and can buy more to create additional bots |
| `0.4.1` | 2026-06-21 | Connected the public website status to real uptime checks for the Performance page |
| `0.4.0` | 2026-06-21 | Added platform health monitoring for public status views and deeper admin diagnostics |
| `0.3.0` | 2026-06-18 | Added admin controls for starting, stopping, restarting, and granting bot services |
| `0.2.9` | 2026-06-18 | Allowed admins to grant runtime and feature access without charging a wallet |
| `0.2.8.1` | 2026-06-18 | Clarified production database connection guidance for the backend |
| `0.2.8` | 2026-06-16 | Added health checks before accepting external bot host servers |
| `0.2.7` | 2026-06-15 | Added review-credit counter management, including manual count updates and recounts |
| `0.2.6` | 2026-06-15 | Applied bot feature setting changes immediately by restarting online bots after save |
| `0.2.5.3` | 2026-06-15 | Limited Embed Designer options to features owned by each bot |
| `0.2.5.2` | 2026-06-15 | Let admins update the current runtime plan shown to customers |
| `0.2.5.1` | 2026-06-15 | Showed each runtime subscription's renewal term in the admin panel |
| `0.2.5` | 2026-06-15 | Added admin tools for creating new feature prices from the web dashboard |
| `0.2.4.2` | 2026-06-14 | Improved Robux balance checks so failed checks show errors instead of false zero stock |
| `0.2.4.1` | 2026-06-13 | Stabilized admin audit logging so admin actions no longer fail when logging has issues |
| `0.2.4` | 2026-06-13 | Added admin bot transfer between owners while preserving bot settings and subscriptions |
| `0.2.3` | 2026-06-13 | Let admins edit embeds for any managed bot |
| `0.2.2.1` | 2026-06-13 | Fixed billing audit storage compatibility for reliable backend builds |
| `0.2.2` | 2026-06-13 | Added admin dashboard metrics for users, bots, capacity, revenue, and recent activity |
| `0.2.1` | 2026-06-13 | Added admin bot management with owner visibility and bot configuration editing |
| `0.2.0` | 2026-06-13 | Added admin user editing with profile, role, and audit tracking support |
| `0.1.9` | 2026-06-13 | Added admin wallet adjustments with ledger history and audit tracking |
| `0.1.8` | 2026-06-13 | Added admin subscription overrides for renewal price, status, dates, and auto-renew |
| `0.1.7` | 2026-06-13 | Added admin pricing management for runtime plans and feature prices |
| `0.1.6` | 2026-06-13 | Added admin access checks and a searchable user directory |
| `0.1.5.4` | 2026-06-10 | Trimmed bot credential input before secure storage |
| `0.1.5.3` | 2026-06-10 | Improved runtime action errors so bot startup issues are easier to understand |
| `0.1.5.2` | 2026-06-10 | Fixed embed configuration saving for advanced JSON fields |
| `0.1.5.1` | 2026-06-10 | Kept existing bot embed settings while inheriting newly added component controls |
| `0.1.5` | 2026-06-09 | Added bot embed configuration APIs with owner-safe access |
| `0.1.4` | 2026-06-09 | Added VPS host management and bot migration between available hosts |
| `0.1.3` | 2026-06-09 | Prepared automated subscription renewal, expiry handling, and suspended-bot stopping |
| `0.1.2` | 2026-06-09 | Added subscription controls for auto-renew and manual renewal |
| `0.1.1` | 2026-06-09 | Added bot host capacity tracking and slot reservation during bot creation |
| `0.1.0` | 2026-06-08 | Connected shop dashboard subscriptions to backend data |
| `0.0.9.1` | 2026-06-08 | Improved secure bot credential storage and startup safety |
| `0.0.9` | 2026-06-08 | Added backend controls for bot start, stop, restart, and status |
| `0.0.8` | 2026-06-08 | Added secure bot configuration loading and saving |
| `0.0.7` | 2026-06-08 | Added bot registration with encrypted Discord credentials |
| `0.0.6` | 2026-06-08 | Connected shop catalog and order actions through the backend |
| `0.0.5.1` | 2026-06-05 | Tuned backend database pooling for production Supabase usage |
| `0.0.5` | 2026-06-04 | Added wallet top-up with PromptPay QR and SlipOK verification |
| `0.0.4` | 2026-06-04 | Added backend management for featured portfolio projects |
| `0.0.3` | 2026-06-04 | Updated billing models for payments, wallets, and pricing |
| `0.0.2` | 2026-06-03 | Added the credit wallet and commerce service foundation |
| `0.0.1` | 2026-06-02 | Added the project portfolio management API |
| `0.0.0.1` | 2026-06-02 | Updated backend environment and application configuration examples |
