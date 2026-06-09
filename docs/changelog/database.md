# Changelog — Database

**Current version: `0.1.4`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
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
