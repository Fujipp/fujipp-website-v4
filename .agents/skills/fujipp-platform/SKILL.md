---
name: fujipp-platform
description: Project-specific operating skill for Fujipp's personal platform repository. Use when working anywhere in this repo, planning or implementing portfolio/shop/admin/bot changes, scanning architecture, reducing token usage, handing work between AI agents, updating changelogs, or deciding which frontend, backend, Supabase, service, deployment, or GitHub rules apply.
---

# Fujipp Platform

Use this skill as a token-efficient router for the repository. It does not replace `.agents/README.md`;
read that file first, then load only the reference file that matches the task.

## Fast Start

1. Read `.agents/README.md`.
2. Identify the scope: frontend, backend, database, service, infra, docs/agent rules, or mixed.
3. Read the section rule for that scope:
   - Frontend: `.agents/scopes/frontend.md` and `frontend/AGENTS.md`.
   - Backend: `.agents/scopes/backend.md`.
   - Database/Supabase: `.agents/scopes/database.md`; also use the Supabase skills when touching Supabase.
   - Infrastructure/CI/repo ops: `.agents/scopes/infrastructure.md`.
   - Commit/push: `.agents/skills/github-push-guide/SKILL.md`.
4. Load one reference below only when relevant.
5. Work in the smallest safe slice. Ask before expanding scope, adding dependencies, or changing architecture.
6. Update the matching file in `docs/changelog/`.

## Token Budget Rules

- Prefer `rg`, `rg --files`, `find -maxdepth`, and focused `sed -n` reads over opening whole trees.
- Do not read generated or dependency output: `node_modules/`, `dist/`, `target/`, `.vite/`, `.git/`.
- Start with manifests and routing files, then follow imports to the touched feature.
- Read changelog headings/current versions before editing changelogs; do not load entire long histories unless needed.
- For UI work, read tokens and the relevant component docs before views; do not load every component.
- For backend/database work, read entities, DTOs, services, and migrations for the touched domain only.

## References

- Product, PM intake, handoff, changelog, and GitHub push flow: `references/workflow.md`.
- Repository map and where to look first by task type: `references/repo-map.md`.
- Frontend Vue/TypeScript/Bun architecture and UI rules: `references/frontend.md`.
- Backend, billing, voucher, bot runtime, and central bot boundaries: `references/backend-services.md`.
- Supabase migrations, security, and Spring Boot alignment: `references/database.md`.

## Product Compass

This is Fujipp's portfolio plus Discord bot shop platform. Optimize for:

- Showing Fujipp's real capability and trustworthiness.
- Making bot service purchase/configuration/operation usable.
- Honest unfinished states while the shop and UI revision are still in progress.
- Maintainable code that looks like it was built by a careful human.

If a task pulls away from portfolio + Discord bot shop, stop and confirm.
