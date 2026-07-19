# Changelog

Public release notes for Fujipp Personal Platform. Each area keeps its own version so a frontend-only
release does not imply that the backend or database changed.

| Area | File | Current |
| --- | --- | --- |
| Frontend | [frontend.md](./frontend.md) | see file |
| Backend | [backend.md](./backend.md) | see file |
| Database | [database.md](./database.md) | see file |
| Other (infra · CI · docs · tooling) | [other.md](./other.md) | see file |

Newest release is always at the top of each file.

## Release-first workflow

A changelog version represents a **reviewed release that is about to be committed and pushed**, not
every edit made while a task is in progress.

1. Finish the requested work.
2. Collect every completed change that will ship in the same push.
3. Before committing, bump each affected area's version once and add one concise release note.
4. If more fixes are made before that push, update the same pending note instead of adding another version.
5. Commit and push the release.

One push may contain several clean commits, but it should normally create only one public release-note
row per affected area.

## Versioning

Use `MAJOR.MINOR.PATCH`.

- **PATCH** — the normal release increment for a completed push: `0.7.16` → `0.7.17`.
- **MINOR** — a significant product milestone or a clearly new phase: `0.7.x` → `0.8.0`.
- **MAJOR** — a stable public product generation. `1.0.0` remains reserved for the first production release.

Do not add fourth-level build numbers going forward. Historical build-level rows were consolidated into
milestones in July 2026 because they described iteration history rather than useful public releases.

## Adding a release

Update the current version and add one row at the top of the relevant file:

| Version | Date | Change |
| --- | --- | --- |
| `0.7.17` | 2026-07-19 | Redesigned release notes into concise, searchable product milestones. |

If a release affects multiple areas, add one row to each affected file using that area's own version.

## Public wording

- Describe the shipped outcome, not the implementation diary.
- Combine related work into one coherent sentence.
- Prefer language a visitor or customer can understand.
- Mention technical details only when they explain reliability, security, or capability.
- Do not expose secrets, private infrastructure, bypasses, raw file paths, migration IDs, or temporary debugging.
- Avoid “WIP”, “workaround”, “hardcoded”, and similar internal language.
- Keep enough detail to answer: **What became better in this release?**
