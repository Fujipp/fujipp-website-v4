# Changelog

What changed, when, per area — each area keeps **its own version counter**.

| Area | File | Current |
| --- | --- | --- |
| Frontend | [frontend.md](./frontend.md) | see file |
| Backend | [backend.md](./backend.md) | see file |
| Database | [database.md](./database.md) | see file |
| Other (infra · CI · docs · tooling) | [other.md](./other.md) | see file |

Newest entry is at the **top** of each file.

## Versioning scheme

Format: `MAJOR.MINOR.PATCH[.BUILD]`, every area starts at `0.0.0`.

- **New capability / feature** → bump **PATCH**: `0.0.1` → `0.0.2` → `0.0.3` …
- **Small follow-up** (fix, refactor, chore, style, docs, config) → bump the 4th **BUILD** segment:
  `0.0.1` → `0.0.1.1` → `0.0.1.2` … up to `0.0.1.9`
- A segment **rolls over at 9** into the one to its left:
  - `0.0.1.9` + a follow-up → `0.0.2`
  - `0.0.9` + a feature → `0.1.0`
  - `0.9.x` + a feature → `1.0.0`

`1.0.0` is reserved for the first real production release.

## How to add an entry

Add one row to the top of the relevant area file, bumping its version per the rules above:

```md
| `0.1.8` | 2026-06-06 | short description of what changed |
```

Keep one line per change. If a single piece of work spans areas (e.g. a feature that
touches frontend + database), add a row in **each** area's file with its own version bump.

> Historical rows (before 2026-06-05) were reconstructed from git history, so they map
> roughly one commit → one version. Going forward, log changes as they happen.
