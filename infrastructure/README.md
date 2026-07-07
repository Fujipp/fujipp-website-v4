# Infrastructure

Operational infrastructure for Fujipp's backend platform and deployment support.

## Layout

| Path | Purpose |
| --- | --- |
| `backend-platform/` | Current production Backend Platform compose stack, env template, and runtime-node notes |
| `bootstrap/` | One-time host bootstrap scripts |
| `nginx/` | Nginx vhost snippets and reverse-proxy references |
| `legacy/` | Historical shared-VPS artifacts kept for reference only |

GitHub Actions workflows live in [`.github/workflows`](../.github/workflows)
because GitHub only loads workflows from that root path.

## Current Workflows

| Workflow file | Trigger | Purpose |
| --- | --- | --- |
| `ci.yml` | PRs / non-main pushes | Build checks only; never deploys |
| `frontend-deploy.yml` | `main` + `frontend/**` | Builds the SPA and deploys it to the DirectAdmin host |
| `backend-platform.yml` | `main` + backend/service/platform paths | Builds only changed Backend Platform images and rolls changed services |
| `backend-platform-manual.yml` | manual dispatch | Operator-controlled backend-platform repin, rollback, compose copy, or service roll |

Production database migrations are not auto-applied from `main`. Stage migration
work on the persistent `db/migrations` branch and apply it through the manual
database migration process once that workflow exists.

## Main Backend Platform Host

- Hostname: `FujippBackend`
- App root: `/opt/fujipp`
- Compose app dir: `/opt/fujipp/apps/backend-platform`
- Env file: `/opt/fujipp/env/platform.env`
- Compose project: `fujipp-backend-platform`

See [backend-platform/README.md](backend-platform/README.md) for runtime memory,
image, smoke-check, and multi-VPS notes.

## First-Time Host Setup

```bash
scp infrastructure/bootstrap/vps-bootstrap.sh deploy@YOUR_VPS_IP:/tmp/
ssh deploy@YOUR_VPS_IP 'bash /tmp/vps-bootstrap.sh'
```

Then copy `infrastructure/backend-platform/` to
`/opt/fujipp/apps/backend-platform/`, create `/opt/fujipp/env/platform.env` from
the template, and start with Docker Compose.

## Secrets

Never commit real env files or private keys. The inventory of required keys lives
in [docs/operations/secrets-inventory.md](../docs/operations/secrets-inventory.md).
