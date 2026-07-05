# Changelog — Other (infra · CI · docs · tooling)

**Current version: `0.0.35.9`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.0.35.9` | 2026-07-06 | Backend Platform automation now builds and deploys changed services automatically while keeping manual rollback available |
| `0.0.35.8` | 2026-07-05 | Updated Backend Platform compose/env defaults to keep Supabase pooler usage low on the new VPS |
| `0.0.35.7` | 2026-07-05 | Renamed the new server automation to Backend Platform terminology with dedicated production environment secrets |
| `0.0.35.6` | 2026-07-05 | Added a manual new-VPS deployment workflow that pins GHCR image tags and rolls selected services without touching the old VPS |
| `0.0.35.5` | 2026-07-05 | Added a manual branch image build workflow for the new VPS without touching the existing production server |
| `0.0.35.4` | 2026-07-05 | Prepared a clean new-VPS runtime plan with fixed memory budgets, safe defaults, and isolated deployment notes |
| `0.0.35.3` | 2026-06-27 | /runtime now posts a public, self-updating panel (refreshes every minute) in the channel it was run in, showing VPS/slot usage plus every bot's status in one embed, instead of a private per-bot list |
| `0.0.35.2` | 2026-06-27 | Shop Status now confirms the status change instantly instead of stalling while the channel name is updated |
| `0.0.35.1` | 2026-06-27 | Top spender reward roles now update only when a member's rank actually changes, so a top-up no longer momentarily strips and re-adds everyone's roles |
| `0.0.35` | 2026-06-25 | Added the Shop Status feature: /status open, close, or busy announces the store's status (as an embed, plain text, or both) and renames a chosen channel to match |
| `0.0.34.1` | 2026-06-25 | /runtime now uses the standard admin gate (server Administrator or AUTHORIZED_USER_IDS), matching /panel & /wallet-add, so the operator can actually run it |
| `0.0.34` | 2026-06-25 | Added the runtime-monitor central-bot feature: an operator-only /runtime command listing every platform bot with owner, avatar, and status |
| `0.0.33` | 2026-06-24 | Frontend deploy now verifies every JS chunk serves correctly and re-uploads any the FTP transfer dropped, instead of checking only the entry chunk |
| `0.0.32` | 2026-06-24 | บันทึกยอดเติม grants tiered upgrade roles by accumulated amount, optionally stacking them and optionally counting purchase frequency |
| `0.0.31` | 2026-06-24 | The manual top-up tracker now carries its own "use your own database" toggle; order data always uses our database |
| `0.0.30` | 2026-06-24 | Added the Admin Message Tools bot feature: /dm a member and /message send, send a file, or edit a bot message via modals |
| `0.0.29` | 2026-06-24 | Added the Member Spending Card bot feature: /topup manually records a member's spend, posts an editable membership card, and refreshes Top 1/Top 5 roles |
| `0.0.28` | 2026-06-24 | Added the Order Management bot feature (/order logs a sale and keeps an order count on the channel name), with a per-bot option to store its data in the shop's own database |
| `0.0.27.2` | 2026-06-24 | Map the ENUM options column as plain text in billing-service (Jackson 3 vs Hibernate's Jackson-2 JSON mapper), fixing the config 500 |
| `0.0.27.1` | 2026-06-24 | Fixed the billing-service build: serve ENUM options as a raw JSON string (no Jackson on its compile classpath) |
| `0.0.27` | 2026-06-24 | Added the Bot Presence add-on (central-bot status + looping activity text) and ENUM options pass-through in billing-service |
| `0.0.26.2` | 2026-06-23 | Clicking a Price Board category now replies publicly with a tag line that mentions the member, instead of a private message |
| `0.0.26.1` | 2026-06-23 | Price Board auto-repost now lands on the clock (e.g. 14:00, 16:00 Bangkok time) instead of every N hours from when the bot started |
| `0.0.26` | 2026-06-23 | Added the Price Board bot feature: posts a Roblox price board with category buttons that open per-category price embeds, with optional scheduled re-posting |
| `0.0.25.2` | 2026-06-23 | A bot whose privileged intents aren't enabled now stays online with those features paused, instead of failing to start entirely |
| `0.0.25.1` | 2026-06-23 | Documented that database migrations apply automatically on release, so contributors don't run a manual step |
| `0.0.25` | 2026-06-23 | The Roblox shop panel resumes its live updates after a bot restart, and a new top-up panel command lets members top up without the Roblox feature |
| `0.0.24` | 2026-06-23 | Bots that were running now restart automatically after a platform update, instead of staying offline until started by hand |
| `0.0.23.1` | 2026-06-23 | Made the website deploy reliable: uploads are now verified so a dropped file fails and retries instead of leaving the site unable to load |
| `0.0.23` | 2026-06-23 | Bot embeds now render author and title links plus a footer timestamp set in the Embed Designer |
| `0.0.22` | 2026-06-23 | Server Log now lets each activity category log into its own channel, falling back to the default channel |
| `0.0.21` | 2026-06-22 | Added the Server Log bot feature: webhook-based audit logging of server activity with per-category toggles |
| `0.0.20.5` | 2026-06-22 | Added public changelog writing rules and refreshed release notes for clearer website presentation |
| `0.0.20.4` | 2026-06-18 | Added a project status map covering current features, risks, and next priorities |
| `0.0.20.3` | 2026-06-18 | Added a project-specific AI assistant guide for faster, safer repository work |
| `0.0.20.2` | 2026-06-18 | Strengthened project rules for product direction, handoff quality, and backend/database work |
| `0.0.20.1` | 2026-06-17 | Clarified project management, push grouping, and frontend architecture instructions |
| `0.0.20` | 2026-06-17 | Added the voice-keeper bot feature for 24/7 Discord voice presence |
| `0.0.19` | 2026-06-16 | Improved voucher service routing so managed bots can reach the correct top-up service |
| `0.0.18` | 2026-06-16 | Protected voucher redemption so only platform-managed bots can use it by default |
| `0.0.17.1` | 2026-06-16 | Documented the flow for adding another bot-host server |
| `0.0.17` | 2026-06-16 | Added optional voucher access controls for shop-specific redemption security |
| `0.0.16.5` | 2026-06-16 | Let PromptPay top-ups temporarily grant slip-channel access and remove it later |
| `0.0.16.4` | 2026-06-15 | Applied TrueMoney fees correctly and exposed fee details in top-up messages |
| `0.0.16.3` | 2026-06-15 | Improved review-credit replies when Discord channel permissions are limited |
| `0.0.16.2` | 2026-06-15 | Made review-credit counters initialize from existing review messages |
| `0.0.16.1` | 2026-06-15 | Fixed frontend deployment so new builds publish the latest app bundle |
| `0.0.16` | 2026-06-15 | Added the review-credit bot feature for counting reviews, reactions, roles, and admin recounts |
| `0.0.15.23` | 2026-06-14 | Temporarily protected the hosted frontend while static asset serving was corrected |
| `0.0.15.22` | 2026-06-14 | Ensured restored legacy frontend assets are included during deployment |
| `0.0.15.21` | 2026-06-14 | Preserved older frontend assets so visitors with cached pages can continue loading the app |
| `0.0.15.20` | 2026-06-13 | Clarified when completed work can be committed and merged without another approval step |
| `0.0.15.19` | 2026-06-13 | Added automatic top-up role rewards after successful wallet credits |
| `0.0.15.18` | 2026-06-13 | Improved wallet rank syncing, top-up notifications, balance updates, and leaderboard embeds |
| `0.0.15.17` | 2026-06-13 | Kept the last known Robux stock visible when a live stock check is temporarily unavailable |
| `0.0.15.16` | 2026-06-13 | Simplified Robux member actions so purchases run through the shop panel |
| `0.0.15.15` | 2026-06-13 | Refined the shop panel actions around top-up, balance check, and group selection |
| `0.0.15.14` | 2026-06-13 | Made remaining Robux flow messages editable in the Embed Designer |
| `0.0.15.13` | 2026-06-13 | Made Robux package dropdown text and options configurable |
| `0.0.15.12` | 2026-06-13 | Hardened the Robux payout flow against duplicate clicks and stale panel refreshes |
| `0.0.15.11` | 2026-06-12 | Restored a precise PromptPay countdown that updates every second |
| `0.0.15.10` | 2026-06-12 | Changed top-up method selection to clear PromptPay and TrueMoney buttons |
| `0.0.15.9` | 2026-06-12 | Added live Discord countdown rendering for PromptPay top-ups |
| `0.0.15.8` | 2026-06-12 | Made Robux eligibility, loading states, and packages configurable per shop |
| `0.0.15.7` | 2026-06-12 | Made Robux confirmation and success messages editable |
| `0.0.15.6` | 2026-06-12 | Made Robux error messages editable as the first step toward fully configurable buying flows |
| `0.0.15.5` | 2026-06-11 | Added developer tools for local startup and secret consistency checks |
| `0.0.15.4` | 2026-06-11 | Improved backend deployment configuration for shared shop database access |
| `0.0.15.3` | 2026-06-10 | Documented the recommended production database connection for bot runtime scaling |
| `0.0.15.1` | 2026-06-10 | Improved bot startup diagnostics when a managed bot fails to become ready |
| `0.0.15` | 2026-06-10 | Added wallet history and top-spender ranking features for Discord shops |
| `0.0.14` | 2026-06-10 | Added automatic shop panel refresh for live stock and payment countdowns |
| `0.0.13` | 2026-06-10 | Added the full Robux purchase flow with package selection, confirmation, payout, and refund handling |
| `0.0.12` | 2026-06-10 | Added PromptPay QR and SlipOK wallet top-up support for Discord shops |
| `0.0.11.6` | 2026-06-10 | Corrected Robux redemption pricing calculations |
| `0.0.11.5` | 2026-06-10 | Cleaned Discord credentials before passing them to managed bots |
| `0.0.11.4` | 2026-06-10 | Exposed clearer bot startup failure reasons to the admin runtime flow |
| `0.0.11.3` | 2026-06-10 | Waited for managed bots to be ready before marking them as running |
| `0.0.11.2` | 2026-06-10 | Preserved edited embed content while adding new component controls |
| `0.0.11.1` | 2026-06-10 | Clarified bot handoff notes for continuing Embed Designer work |
| `0.0.11` | 2026-06-10 | Made shop panel and top-up component labels, styles, and links configurable |
| `0.0.10` | 2026-06-10 | Added live Robux stock details to the shop panel |
| `0.0.9.9` | 2026-06-10 | Restricted bot admin commands to authorized Discord admins |
| `0.0.9.8` | 2026-06-10 | Added TrueMoney voucher top-up support for shop wallets |
| `0.0.9.7` | 2026-06-10 | Added the first shop panel Robux buying flow |
| `0.0.9.6` | 2026-06-10 | Added interactive shop panel routing for buttons, selections, modals, and balance checks |
| `0.0.9.5` | 2026-06-09 | Added configurable embed rendering for wallet bot messages |
| `0.0.9.4` | 2026-06-09 | Planned the configurable Embed Designer system for bot messages |
| `0.0.9.3` | 2026-06-09 | Planned the Kanom shop onboarding and migration flow |
| `0.0.9.2` | 2026-06-08 | Documented legacy TrueMoney voucher deployment settings |
| `0.0.9.1` | 2026-06-08 | Improved billing secret startup safety and bot credential handoff |
| `0.0.9` | 2026-06-08 | Added wallet top-up storage and Robux redemption debit support |
| `0.0.8.1` | 2026-06-08 | Exposed feature price identifiers so the shop can purchase selected packages |
| `0.0.8` | 2026-06-08 | Added secure per-bot feature configuration in billing |
| `0.0.7.6` | 2026-06-08 | Made permanent feature purchases attach to a specific bot |
| `0.0.7.5` | 2026-06-07 | Removed the retired Node voucher service after replacing it |
| `0.0.7.4` | 2026-06-07 | Fixed voucher service startup with safer request header handling |
| `0.0.7.3` | 2026-06-07 | Fixed voucher service token loading during deployment |
| `0.0.7.2` | 2026-06-07 | Added deployment checks before routing traffic to the voucher service |
| `0.0.7.1` | 2026-06-07 | Connected the production bot process to the voucher service |
| `0.0.7` | 2026-06-07 | Rebuilt the voucher service on the Java and Supabase stack |
| `0.0.6.1` | 2026-06-07 | Added an on-demand key rotation workflow for voucher access |
| `0.0.6` | 2026-06-07 | Prevented sensitive voucher keys from being printed in deployment logs |
| `0.0.5.9` | 2026-06-07 | Strengthened voucher bootstrap secret handling |
| `0.0.5.8` | 2026-06-07 | Separated voucher master-key deployment from other environment settings |
| `0.0.5.7` | 2026-06-07 | Increased voucher service memory for reliable production startup |
| `0.0.5.6` | 2026-06-07 | Corrected voucher database pathing during production startup |
| `0.0.5.5` | 2026-06-07 | Added missing runtime dependencies for the voucher service image |
| `0.0.5.4` | 2026-06-07 | Included voucher service source and scripts in the production image |
| `0.0.5.3` | 2026-06-07 | Adjusted voucher image setup so database tasks can run in production |
| `0.0.5.2` | 2026-06-07 | Fixed deployment variable export for composed service images |
| `0.0.5.1` | 2026-06-07 | Made backend deployment update only the services that changed |
| `0.0.5` | 2026-06-07 | Connected the TrueMoney voucher service to production deployment |
| `0.0.4.1` | 2026-06-07 | Added voucher database bootstrap support |
| `0.0.4` | 2026-06-07 | Added the first TrueMoney voucher redemption service |
| `0.0.3` | 2026-06-05 | Added the bot runtime orchestrator foundation |
| `0.0.2` | 2026-06-05 | Added the central bot service foundation with feature modules |
| `0.0.1.6` | 2026-06-05 | Documented the Feature Bot platform design |
| `0.0.1.5` | 2026-06-05 | Added backend, database, and changelog operating rules |
| `0.0.1.4` | 2026-06-04 | Added shared-host frontend deployment over FTP |
| `0.0.1.3` | 2026-06-04 | Relaxed frontend install strictness for deploy compatibility |
| `0.0.1.2` | 2026-06-04 | Added main-branch deployment pipelines for frontend and backend |
| `0.0.1.1` | 2026-06-04 | Added VPS bootstrap and deployment documentation |
| `0.0.1` | 2026-06-04 | Containerized the backend and billing services for the shared VPS |
| `0.0.0.9` | 2026-06-04 | Added the SlipOK API guide |
| `0.0.0.8` | 2026-06-03 | Added Supabase CLI support |
| `0.0.0.7` | 2026-06-03 | Added repository workflow guidance |
| `0.0.0.6` | 2026-06-02 | Updated the project README |
| `0.0.0.5` | 2026-05-26 | Refined push workflow grouping |
| `0.0.0.4` | 2026-05-26 | Synced project work for the repository |
| `0.0.0.3` | 2026-05-23 | Published the current project setup |
| `0.0.0.2` | 2026-05-23 | Added the repository setup guide |
| `0.0.0.1` | 2026-05-23 | Initial commit |
