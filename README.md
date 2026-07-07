# fujipp-personal-platform

Fujipp's personal portfolio plus Discord bot shop platform.

The platform has three main jobs:

- show Fujipp's work and technical capability,
- let customers buy and manage Discord bot services,
- run backend, billing, voucher, and bot-runtime services on the Backend Platform.

## Start Here

Before changing this repository, read:

| Purpose | File |
| --- | --- |
| AI / contributor rules | [AGENTS.md](AGENTS.md) |
| Shared agent source of truth | [.agents/README.md](.agents/README.md) |
| Operations index | [docs/operations/README.md](docs/operations/README.md) |
| Secrets inventory | [docs/operations/secrets-inventory.md](docs/operations/secrets-inventory.md) |
| Changelog rules | [docs/changelog/README.md](docs/changelog/README.md) |

## Repository Map

| Path | Purpose |
| --- | --- |
| `frontend/` | Vue 3, TypeScript, Vite, Bun frontend |
| `backend/` | Spring Boot public/admin API |
| `services/billing-service/` | Wallet, catalog, order, subscription, and runtime billing service |
| `services/voucher-service/` | TrueMoney voucher redeem service |
| `services/bot-runtime-service/` | Runtime orchestrator that starts/stops managed Discord bots |
| `services/central-bot/` | Shared Discord bot code used per customer bot |
| `supabase/` | PostgreSQL migrations and Supabase config |
| `infrastructure/` | Backend Platform compose, nginx, bootstrap, and legacy infra references |
| `docs/` | Operations, product notes, changelogs, legacy docs, and references |
| `.agents/` | AI operating rules and project skills |
| `.github/workflows/` | CI and deploy workflows |

## Branch Model

| Branch | Role |
| --- | --- |
| `main` | Production source branch |
| `db/migrations` | Persistent staging branch for Supabase migrations |
| `feature/<topic>` | Product or feature work |
| `fix/<topic>` | Bug fixes |
| `chore/<topic>` | Repo, docs, infra, and maintenance work |

Production database migrations are not auto-applied by pushing to `main`.
Stage migration work on `db/migrations` and apply it through the manual migration
process when ready.

## Deployment

| Workflow | Purpose |
| --- | --- |
| `ci.yml` | PR/non-main checks only; never deploys |
| `frontend-deploy.yml` | Deploys the frontend from `main` when frontend source changes |
| `backend-platform.yml` | Builds and rolls changed Backend Platform services from `main` |
| `backend-platform-manual.yml` | Manual backend-platform repins, rollbacks, compose copy, and service rolls |

See [infrastructure/README.md](infrastructure/README.md) and
[docs/operations/backend-platform.md](docs/operations/backend-platform.md).

## Local Development

Common targets are in [Makefile](Makefile):

```bash
make help
make frontend
make backend
make dev
```

Do not commit real `.env` files, secrets, generated build output, dependency
directories, or local editor/OS files.
