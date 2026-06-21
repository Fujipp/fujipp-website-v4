# Changelog — Backend

**Current version: `0.4.4`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
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
