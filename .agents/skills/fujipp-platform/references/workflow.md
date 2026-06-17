# Workflow Reference

## Task Intake

Before editing, state or infer:

- Goal: user-visible outcome.
- Scope: allowed areas and out-of-scope areas.
- Dependencies: design tokens/Figma, API contract, env/config, Supabase, service integration.
- Plan: smallest useful steps.
- Done: expected working state and whether verification was requested.

Ask before expanding scope, adding/removing packages, changing architecture, running verification, or touching risky infra/secrets/migrations.

## Changelog

Update `docs/changelog/` for every completed change:

- `frontend.md` for `frontend/`.
- `backend.md` for `backend/` and backend-gateway API changes.
- `database.md` for `supabase/` migrations/schema/seed changes.
- `other.md` for docs, agent rules, infra, docker, scripts, and services outside the main backend/frontend changelogs unless another area clearly owns it.

Use the versioning scheme in `docs/changelog/README.md`. Multiple meaningful entries are allowed; do not hide unrelated changes behind one row.

## Handoff

End substantial work with:

- Status and goal.
- Files changed.
- Decisions and why.
- Verification run, or why it was not run.
- Risks/TODOs/next step.
- User instruction that must carry forward.

## Push Discipline

When pushing, use `.agents/skills/github-push-guide/SKILL.md`.

- Split commits by area or reason when review/revert can be independent.
- Keep cross-area commits together only when the behavior is inseparable.
- Do not stage unrelated user changes.
- Do not commit secrets, env files, generated builds, dependency folders, logs, or IDE state.
