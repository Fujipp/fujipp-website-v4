# Changelog — Backend

**Current version: `0.5.12`**  ·  see [release workflow](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.5.15` | 2026-07-24 | Restored the selectable Wallet & Top-up presentation so QR, validation, processing, failure, and success messages use each bot's designed Components V2 templates when that display mode is selected, while retaining emergency delivery fallbacks. |
| `0.5.14` | 2026-07-24 | Completed the Wallet & Top-up modal-submit isolation from configurable messages by rendering invalid-amount feedback as a template-free reply and adding an emergency PromptPay QR response when a configured reply cannot be sent. |
| `0.5.13` | 2026-07-24 | Isolated the complete Wallet & Top-up payment lifecycle from Components V2 rendering so processing, SlipOK verification, failure, success, and wallet-credit results use stable configurable Embeds; also guaranteed that an empty configured embed receives visible fallback content. |
| `0.5.12` | 2026-07-24 | Restored the payment-critical PromptPay QR/countdown path to stable Embeds, added send-time fallback for the Top-up Panel, and retained emergency payment controls and modals when configurable Wallet or Roblox top-up surfaces fail. |
| `0.5.11` | 2026-07-23 | Added shared Discord member, server, channel, and bot context to dynamic Wallet and Top-up messages, aligned Embed and Components V2 rendering, and added an authenticated reset-to-latest-template API for owners and administrators. |
| `0.5.10` | 2026-07-21 | Made Wallet and Top-up Components V2 fully configurable per bot, including ordered content, sections, separators, media, container appearance, behavior-safe required actions, Top-up Panel balance controls, a live Wallet Balance response, and validated custom link-button rows. |
| `0.5.9` | 2026-07-20 | Added per-bot Role and User access rules while hardening Discord feature lifecycle, recovery, external-call handling, and operational health checks. |
| `0.5.8` | 2026-07-16 | Expanded audited billing administration, exposed customer Runtime notifications through the authenticated API, and shortened failed-renewal grace to one day. |
| `0.4.9` | 2026-07-09 | Connected billing, vouchers, feature configuration, bot messaging, monitoring, and operational controls into the platform API. |
| `0.3.0` | 2026-06-18 | Added reliable Discord bot lifecycle management with encrypted credentials, deployment coordination, and customer-facing status. |
| `0.2.9` | 2026-06-18 | Established wallet top-ups, SlipOK verification, purchases, Runtime allocation, refunds, and protected billing workflows. |
| `0.1.9` | 2026-06-13 | Added authenticated profiles, project APIs, admin access, validation, caching, and the first production-ready service boundaries. |
| `0.0.9` | 2026-06-08 | Started the Spring Boot backend with Supabase authentication, profile synchronization, persistence, and deployment foundations. |
