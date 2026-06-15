# Changelog — Database

**Current version: `0.2.0.4`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.2.0.4` | 2026-06-15 | wallet-topup: add `TRUEMONEY_FEE_FLAT` (flat baht) alongside `TRUEMONEY_FEE` (%) and reword both (`20260615150000`); expose `{{fee}}`/`{{gross}}` on the `topup_success` embed. The bot now actually applies these (was defined-but-unused) |
| `0.2.0.3` | 2026-06-15 | reword review-credit STRING_LIST field hints (`20260615140000`) — edited as add/remove input boxes now, so drop the "บรรทัดละ" (per-line) wording |
| `0.2.0.2` | 2026-06-15 | add `STRING_LIST` to `feature_variable_templates_type_chk` and switch review-credit's `REVIEW_REPLY_MESSAGES` + `REVIEW_REACTIONS` to it (`20260615130000`) — stored as JSON arrays still, but edited one-item-per-line in the form; labels/descriptions updated. Existing values stay valid |
| `0.2.0.1` | 2026-06-15 | seed review-credit price (`20260615120200`) — RENT_PERMANENT 190 THB (no monthly); makes it purchasable + visible in the admin Pricing page. Editable there afterwards |
| `0.2.0` | 2026-06-15 | review-credit: new `shop.review_credit_state` table (`20260615120000`, per-bot/channel counter + last reply id, RLS service_role only) + seed the `review-credit` feature into `billing.feature_catalog` (ENGAGEMENT) with 6 config templates (`20260615120100`); ports the legacy Aka Shop review counter — no price yet (visible, not purchasable) |
| `0.1.9.1` | 2026-06-13 | `admin_audit_log.payload` jsonb → text (`20260613173500`) — billing runs on Jackson 3, which Hibernate's auto jsonb mapper can't use; the app serializes payload to JSON text itself |
| `0.1.9` | 2026-06-13 | admin: new append-only `billing.admin_audit_log` table (`20260613163224`) — actor/action/target + jsonb payload, RLS-enabled (service_role only), indexed on actor/target-user/created; trail for admin price/wallet/user/bot actions |
| `0.1.8.7` | 2026-06-13 | wallet-topup: seed config template `TOPUP_ROLE_ID` (`20260613160000`) — a dedicated "top-up role" given to anyone who tops up, shown in the Shop Wallet & Top-up tab (separate from the Top Spender rank/milestone roles) |
| `0.1.8.6` | 2026-06-13 | seed the `top-spender-rank` embed slot `top_leaderboard` (`20260613150000`) with a default mirroring the previously hardcoded /top embed (`{{updated}}`, `{{board}}`) — the /top leaderboard is now editable in the Embed Designer |
| `0.1.8.5` | 2026-06-13 | fix the wallet-history/top-spender seed (`20260610170000`): category UTILITY violated `feature_catalog_category_chk` so the migration had never applied — now ENGAGEMENT; applied to the shared DB and wallet-history subscribed to Test-001 |
| `0.1.8.4` | 2026-06-13 | promote the shop owner's Test-001 embed designs to the seeded defaults for all 18 customized slots (roblox-robux-payout + wallet-topup); previously seeded component roles (pkg_select, group_select, method_select, btn_*) preserved via merge |
| `0.1.8.3` | 2026-06-13 | roblox-robux-payout: seed the 6 remaining embed slots (`check_result`, `group_balance`, `payout_admin_success`, `buy_queued`, `notify_success`, `notify_error`) with defaults mirroring the previously hardcoded embeds |
| `0.1.8.2` | 2026-06-13 | roblox-robux-payout: seed `pkg_select` component role on the `buy_eligible` slot (placeholder, emoji, `option_label` template with `{{robux}}`/`{{price}}`, ok/insufficient descriptions) so the package dropdown is Embed-Designer-editable |
| `0.1.8.1` | 2026-06-12 | roblox-robux-payout: add `ROBUX_PACKAGES` JSON config template — lets a shop define its own {robux, price} package list instead of deriving from the rate |
| `0.1.8` | 2026-06-10 | seed wallet-history + top-spender-rank features with config templates (history limit, rank/milestone roles, leaderboard channel) |
| `0.1.7.1` | 2026-06-10 | roblox-robux-payout: add PAYMENT_REFRESH_INTERVAL template + PAYMENT_COUNTDOWN_TARGET accepts ISO date or seconds |
| `0.1.7` | 2026-06-10 | wallet-topup slip flow templates: PROMPTPAY_ACCOUNT_NAME, TOPUP_QR_TIMEOUT, SLIP_CHECK_CHANNEL, TOPUP_NOTIFY_CHANNEL |
| `0.1.6` | 2026-06-10 | roblox-robux-payout: add numbered group config templates (ROBLOX_*_1/_2/_3), make legacy single keys optional, clarify ROBUX_RATE = Robux per baht |
| `0.1.5.1` | 2026-06-10 | seed Kanom button/dropdown component appearance defaults under embed slot JSON components |
| `0.1.5` | 2026-06-10 | seed real Kanom embed designs as slot defaults (panel + top-up flow visuals, dynamic {{vars}}, custom emoji) |
| `0.1.4` | 2026-06-09 | add embed designer: `bots.embed_slots` (registry + defaults) + `bots.bot_embeds` (per-bot overrides); seed Kanom slots |
| `0.1.3` | 2026-06-09 | add `bots.vps_nodes` (host registry + max_slots) + `bot_instances.vps_node_id`; seed primary VPS at 5 slots |
| `0.1.2.1` | 2026-06-08 | add bot credential columns (discord public key + encrypted client secret) |
| `0.1.2` | 2026-06-08 | add `shop` schema: member_wallets + wallet_ledger (in-bot shop wallet, layer B) |
| `0.1.1.1` | 2026-06-08 | features sold permanent per-bot: drop monthly SKUs, reprice (roblox 490 / wallet 290) |
| `0.1.1` | 2026-06-07 | add `voucher` schema: redeem (top-up) history + phone_summary view |
| `0.1.0` | 2026-06-05 | add `bots` schema + bot_instances registry (encrypted Discord token) |
| `0.0.9.2` | 2026-06-05 | seed prices for Roblox + wallet-topup features (rent/permanent) |
| `0.0.9.1` | 2026-06-05 | seed Roblox + wallet-topup features and their config schema |
| `0.0.9` | 2026-06-05 | allow `live` and `website` project link types |
| `0.0.8` | 2026-06-03 | add billing service schema |
| `0.0.7` | 2026-06-02 | allow project certificate PDFs |
| `0.0.6` | 2026-06-02 | extend project portfolio schema |
| `0.0.5.1` | 2026-06-02 | update supabase config |
| `0.0.5` | 2026-06-01 | add auth profiles and admin roles |
| `0.0.4` | 2026-05-28 | add project translations |
| `0.0.3` | 2026-05-28 | add profiles auth schema |
| `0.0.2` | 2026-05-28 | add project portfolio schema |
| `0.0.1` | 2026-05-24 | add initial supabase baseline |
