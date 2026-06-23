# fujipp-personal-platform

Personal portfolio and project management platform.

## Project Structure

```
fujipp-personal-platform/
├── frontend/          Vue 3 + TypeScript + Tailwind CSS v4
├── backend/           Spring Boot 4 + Java 21
├── supabase/          Database migrations (PostgreSQL via Supabase)
├── docker/            Container configuration
├── infrastructure/    Deployment and environment
├── docs/              Project-level documentation
└── .agents/skills/    AI workflow guides
```

---

## AI Instructions

Before working on any section, read the relevant guide below. Rules in these files take precedence over general coding defaults.

| Section | File to read first |
| --- | --- |
| Frontend | `frontend/AGENTS.md`, `frontend/docs/design-system.md`, `frontend/docs/component-guidelines.md` |
| Commit / push | `.agents/skills/github-push-guide/SKILL.md` |
| General repo rules | `.github/copilot-instructions.md` |

**Never commit or push unless the user explicitly asks.**

---

## FRONTEND

**Stack:** Vue 3 SFC · `<script setup lang="ts">` · TypeScript · Vue Router · Vite · Tailwind CSS v4 · Bun

**Design source of truth:** Figma file `fujipp-personal-platform`
- URL: `https://www.figma.com/design/NPe2UZEWcr0Sb3U36SgHft/fujipp-personal-platform`
- Pages: Atoms · Tech Stack · System Architecture · Components · Wireframe · Template

### Design Tokens

CSS tokens live in `frontend/src/styles/tokens/`. The global entrypoint is `frontend/src/style.css`.

| Token group | File | Example utilities |
| --- | --- | --- |
| Colors | `tokens/colors.css` | `bg-main-primary`, `text-text-primary-text`, `bg-button-primary-btn-bg` |
| Typography | `tokens/typography.css` | `type-h1-page-title-r`, `type-body-main-sb` |
| Spacing | `tokens/spacing.css` | `p-space-4`, `gap-space-6`, `px-space-16` |
| Radius | `tokens/radius.css` | `rounded-md`, `rounded-xl`, `rounded-full` |
| Icons | `tokens/icons.css` | `size-icon-sm`, `size-icon-md`, `size-icon-lg` |

Font family is **Kanit**, bundled locally in `public/fonts/kanit/`. Do not use a CDN or runtime import.

Always use token utilities. Do not hardcode hex colors, pixel values, or arbitrary Tailwind syntax such as `text-[#...]` or `p-[...]` when a matching token exists.

### Component Layout

| Kind | Location |
| --- | --- |
| Primitive UI (Button, Input, Badge) | `src/components/ui/` |
| Layout (AppHeader, Sidebar) | `src/components/layout/` |
| Page sections (HeroSection, ProjectGrid) | `src/components/sections/` |
| Routed pages | `src/views/` |
| Composables | `src/composables/` |
| Shared types | `src/types/` |

One folder per reusable component, with an `index.ts` barrel export:

```
src/components/ui/Button/
  Button.vue
  index.ts
```

### Vue Conventions

- `<script setup lang="ts">` only.
- Props and emits must be TypeScript-typed.
- Use `@/` alias for imports from `src/`.
- Use slots for visible labels/content in reusable components.
- Dark theme via `.dark` or `[data-theme="dark"]` on a containing element. Use semantic tokens; do not duplicate theme-specific colors inside components.

### Verification

Do not run tests, type checks, builds, or browser verification unless the user explicitly asks.

---

## BACKEND

**Stack:** Spring Boot 4.0.6 · Java 21 · Maven · Spring Data JPA · Spring Security · OAuth2 Resource Server · Spring Validation · Spring Session Redis · AMQP

Currently at base CRUD stage. Validation (`spring-boot-starter-validation`) is included.

### Package Structure

```
backend/src/main/java/fujipp/project/backend/
├── config/
├── controller/
├── dto/
├── model/
├── repository/
└── service/
```

**Conventions (work in progress — follow when extending):**
- Controllers handle HTTP only; business logic stays in services.
- DTOs for request/response; do not expose JPA entities directly.
- Use `@Valid` on request bodies; define constraints on DTO fields.
- Repository interfaces extend `JpaRepository`; custom queries use JPQL or `@Query`.

Run backend: `./mvnw spring-boot:run` from `backend/`.
Run tests: `./mvnw test` from `backend/`.

---

## DATABASE

**Platform:** Supabase (PostgreSQL) with Row Level Security (RLS).

### Migration Pattern

Files in `supabase/migrations/` use the naming format:

```
YYYYMMDDHHMMSS_<description>.sql
```

Example: `20260601143909_create_projects.sql`

**Rules:**
- Every schema change is a new migration file — never edit an existing one.
- Tables use `UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID()` and `TIMESTAMPTZ NOT NULL DEFAULT NOW()` for timestamps.
- Enable RLS on every new table: `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;`
- Grant minimum required privileges: `GRANT SELECT ON ... TO anon, authenticated;` and `GRANT ALL ON ... TO service_role;`
- Name policies descriptively: `"<table>_<action>_<role>"` e.g. `"project_gallery_select_public"`.
- Use `DROP POLICY IF EXISTS` before `CREATE POLICY` to make migrations idempotent.
- Admin-only write operations must check `profiles.role = 'ADMIN'` via a subquery against `auth.uid()`.
- Do not run destructive SQL (DROP TABLE, TRUNCATE) without explicit user approval.

Applying migrations: **prod auto-applies** — Supabase is connected to this repo via the
Supabase GitHub integration, so migrations land on the linked project when their PR merges
to `main` (no manual step). `supabase db push` / `supabase migration up` are only for a
local/linked dev database.

---

## DOCKER

Configuration lives in `docker/`. Details to be documented as services are defined.

---

## INFRASTRUCTURE

Configuration lives in `infrastructure/`. Details to be documented as environments are provisioned.

---

## DOCS

Project-level documentation lives in `docs/`.
Frontend-specific docs live in `frontend/docs/`.

---

## Commit and Push

Follow `.agents/skills/github-push-guide/SKILL.md` exactly. Summary:

**Format:** `<type>(<scope>): <result>`

| Type | Use |
| --- | --- |
| `feat` | New user-facing capability |
| `fix` | Corrects broken behavior |
| `chore` | Maintenance or configuration |
| `docs` | Documentation or agent guidance |
| `refactor` | Restructure without behavior change |
| `test` | Add or repair tests |
| `build` | Build tooling or dependencies |
| `ci` | Automation workflows |

| Path | Scope |
| --- | --- |
| `frontend/` | `frontend` |
| `backend/` | `backend` |
| `supabase/` | `database` |
| `docker/` | `docker` |
| `infrastructure/` | `infra` |
| `docs/`, `.agents/skills/` | `docs` or `skills` |
| `.github/` | `ci` or `github` |
| Root config files | `root` |

Split unrelated folder changes into separate commits. Never commit `.env`, secrets, `node_modules/`, `dist/`, `build/`, `target/`, or IDE state.
