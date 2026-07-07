# Infrastructure, CI, And Repository Ops Rules

Read this file before changing `.github/`, `infrastructure/`, `scripts/`,
`Makefile`, root agent stubs, or operational documentation.

---

## Source Of Truth

- GitHub Actions workflows stay in `.github/workflows/`; GitHub will not read
  workflow files from any other folder.
- Backend Platform compose and env templates live in `infrastructure/backend-platform/`.
- Nginx snippets live in `infrastructure/nginx/`.
- Bootstrap scripts live in `infrastructure/bootstrap/`.
- Operational docs live in `docs/operations/`.
- Product planning/history docs live in `docs/product/` and `docs/legacy/`.

Keep root `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` as thin
stubs that point to `.agents/README.md`. The detailed rules belong under `.agents/`.

## Deployment Workflows

- `ci.yml` is for PR/non-main checks only and must never deploy.
- `backend-platform.yml` is the normal production backend/service build and deploy
  path from `main`.
- `backend-platform-manual.yml` is for manual backend-platform repins, rollbacks,
  and explicit service rolls.
- `frontend-deploy.yml` is the production frontend deploy path from `main`.

When renaming or moving infrastructure files, update every path reference in docs,
workflows, scripts, and Makefile in the same change.

## Database Migrations

Production database migrations are intentionally not auto-applied from `main`.
Use the persistent `db/migrations` branch as the staging branch for migration work,
then apply production migrations through the manual database workflow once that
workflow exists.

## Do Not

- Do not commit real env files, private keys, generated build output, dependency
  directories, or local editor/OS files.
- Do not add new deployment secrets without updating `docs/operations/secrets-inventory.md`.
- Do not change production deployment triggers without calling out which workflows
  will run from the touched paths.
