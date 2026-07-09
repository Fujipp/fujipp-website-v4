# Changelog — Database

**Current version: `0.3.10`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.3.10` | 2026-07-09 | Seeded the App Premium Shop feature (catalog row, config schema incl. API key/margins/categories/notify+log channels, and 6 editable embed slots for the panel, confirm, success, DM, delivered announcement, and error) |
| `0.3.9.1` | 2026-07-09 | Added a Supabase/Postgres architecture map covering schemas, wallet layers, bot/runtime slot relationships, feature config flow, RLS/access model, migration workflow, and debugging entry points |
| `0.3.9` | 2026-06-25 | Seeded the Shop Status feature (store open/close/busy announcements with per-status channel names and editable embeds) |
| `0.3.8` | 2026-06-25 | Seeded the runtime-monitor feature and auto-grant it to admin-owned bots (backfill + AFTER INSERT trigger) |
| `0.3.7` | 2026-06-24 | Added a ROLE_TIER_LIST config field type and applied it to บันทึกยอดเติม's amount-tier roles for a friendlier amount+role editor |
| `0.3.6` | 2026-06-24 | บันทึกยอดเติม now supports multiple upgrade-role tiers by amount, with toggles to stack tiers and to count purchase frequency |
| `0.3.5` | 2026-06-24 | Moved the "use your own database" toggle into the renamed บันทึกยอดเติม (กรอกเอง) feature and removed the standalone BYO Database add-on |
| `0.3.4` | 2026-06-24 | Added the Admin Message Tools feature so bots can DM members and send/edit channel messages |
| `0.3.3` | 2026-06-24 | Added the Member Spending Card feature: manual spend tracking with an editable membership card and Top 1/Top 5 reward roles |
| `0.3.2` | 2026-06-24 | Added the Order Management feature and order-count storage, plus a free "use your own database" add-on every bot can enable to store shop data in its own Postgres/Neon |
| `0.3.1` | 2026-06-24 | Give every bot (existing + newly created) the free Bot Presence add-on automatically |
| `0.3.0.1` | 2026-06-24 | Store ENUM field options as text (billing-service can't map jsonb), fixing a 500 on the bot config page |
| `0.3.0` | 2026-06-24 | Added the Bot Presence feature (status + looping activity text) and a dropdown (ENUM) config field type |
| `0.2.9.1` | 2026-06-23 | Gave each Price Board category a default tag-line message that mentions the member who clicked |
| `0.2.9` | 2026-06-23 | Added the Price Board feature definition and its board + per-category price embed designs for customer bots |
| `0.2.8` | 2026-06-23 | Added a standalone top-up panel design and storage so the Roblox shop panel resumes its live updates after a restart |
| `0.2.7` | 2026-06-23 | Server Log can now route each kind of activity to its own channel, with a default channel as fallback |
| `0.2.6` | 2026-06-22 | Prepared runtime hosting to be moved between bots and tracked per server seat |
| `0.2.5` | 2026-06-22 | Added permanent bot slots so members can own more bots beyond the free three |
| `0.2.4` | 2026-06-22 | Added addressable server seats with reserved and maintenance support for hosting |
| `0.2.3` | 2026-06-22 | Added the Server Log feature definition and configurable log embed for customer bots |
| `0.2.2` | 2026-06-21 | Added secure monitoring data storage for Performance history and incident tracking |
| `0.2.1` | 2026-06-17 | Added the voice-keeper feature definition for 24/7 Discord voice presence |
| `0.2.0.5` | 2026-06-16 | Added a temporary slip-access role setting for PromptPay top-up flows |
| `0.2.0.4` | 2026-06-15 | Added flexible TrueMoney fee settings and top-up success variables |
| `0.2.0.3` | 2026-06-15 | Updated review-credit field guidance to match the new add/remove input UI |
| `0.2.0.2` | 2026-06-15 | Improved review-credit message and reaction settings for easier list editing |
| `0.2.0.1` | 2026-06-15 | Added the first review-credit price so it can be sold from the shop |
| `0.2.0` | 2026-06-15 | Added review-credit data storage and feature settings for customer bots |
| `0.1.9.1` | 2026-06-13 | Adjusted audit log storage for better billing-service compatibility |
| `0.1.9` | 2026-06-13 | Added admin audit history for pricing, wallet, user, and bot actions |
| `0.1.8.7` | 2026-06-13 | Added a top-up role setting for rewarding members after payment |
| `0.1.8.6` | 2026-06-13 | Made the top-spender leaderboard embed editable |
| `0.1.8.5` | 2026-06-13 | Corrected wallet-history and top-spender feature setup |
| `0.1.8.4` | 2026-06-13 | Promoted tested shop embed designs as default bot templates |
| `0.1.8.3` | 2026-06-13 | Added remaining Robux payout embed templates |
| `0.1.8.2` | 2026-06-13 | Made the Robux package dropdown configurable in the Embed Designer |
| `0.1.8.1` | 2026-06-12 | Added custom Robux package settings per shop |
| `0.1.8` | 2026-06-10 | Added wallet-history and top-spender-rank feature settings |
| `0.1.7.1` | 2026-06-10 | Added payment refresh and countdown settings for Robux panels |
| `0.1.7` | 2026-06-10 | Added PromptPay slip flow settings for wallet top-ups |
| `0.1.6` | 2026-06-10 | Added multi-group Robux payout settings and clearer rate configuration |
| `0.1.5.1` | 2026-06-10 | Added default button and dropdown appearance settings for embeds |
| `0.1.5` | 2026-06-10 | Added polished default embed designs for the Kanom shop flow |
| `0.1.4` | 2026-06-09 | Added database support for editable bot embeds |
| `0.1.3` | 2026-06-09 | Added bot host registry and capacity tracking |
| `0.1.2.1` | 2026-06-08 | Added secure bot credential fields |
| `0.1.2` | 2026-06-08 | Added in-bot shop wallets and wallet ledger history |
| `0.1.1.1` | 2026-06-08 | Updated feature pricing to permanent per-bot purchases |
| `0.1.1` | 2026-06-07 | Added voucher redemption history and phone summary reporting |
| `0.1.0` | 2026-06-05 | Added bot registry storage with encrypted Discord tokens |
| `0.0.9.2` | 2026-06-05 | Added starter prices for Roblox and wallet top-up features |
| `0.0.9.1` | 2026-06-05 | Added Roblox and wallet top-up feature definitions |
| `0.0.9` | 2026-06-05 | Added live demo and website link types for projects |
| `0.0.8` | 2026-06-03 | Added the billing service database foundation |
| `0.0.7` | 2026-06-02 | Added support for project certificate PDFs |
| `0.0.6` | 2026-06-02 | Expanded the project portfolio data model |
| `0.0.5.1` | 2026-06-02 | Updated Supabase project configuration |
| `0.0.5` | 2026-06-01 | Added user profiles and admin roles |
| `0.0.4` | 2026-05-28 | Added project translation storage |
| `0.0.3` | 2026-05-28 | Added profile authentication storage |
| `0.0.2` | 2026-05-28 | Added the project portfolio schema |
| `0.0.1` | 2026-05-24 | Added the initial Supabase baseline |
