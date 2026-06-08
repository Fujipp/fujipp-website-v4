# Changelog — Backend

**Current version: `0.0.9.1`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
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
