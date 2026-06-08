# Frontend Rules

Read this file before changing anything under `frontend/`.

For detailed token tables and component workflow, also read:
- `frontend/docs/design-system.md` — color, typography, spacing, radius, icon token tables
- `frontend/docs/component-guidelines.md` — step-by-step workflow for building components from Figma

---

## Stack

| | |
| --- | --- |
| Framework | Vue 3 SFC — `<script setup lang="ts">` only |
| Language | TypeScript |
| Styling | Tailwind CSS v4 via CSS `@theme` |
| Bundler | Vite |
| Package manager | Bun |
| Routing | Vue Router |

---

## Design Source of Truth

- **Figma file:** `fujipp-personal-platform`
- **URL:** `https://www.figma.com/design/NPe2UZEWcr0Sb3U36SgHft/fujipp-personal-platform`
- **Pages:** Atoms · Tech Stack · System Architecture · Components · Wireframe · Template

Figma defines visual appearance, variants, states, spacing, and responsive layout.
CSS tokens in `frontend/src/styles/tokens/` are the implementation of what Figma defines.

**If Figma and code differ** — do not invent a compromise. Stop and identify which source needs to be updated.

**If no Figma reference or token exists for the task** — ask the user before implementing.

---

## Tokens

Token files live in `frontend/src/styles/tokens/`. The only global entrypoint is `frontend/src/style.css`.

| Concern | File | Example utility |
| --- | --- | --- |
| Colors | `tokens/colors.css` | `bg-main-primary`, `text-text-primary-text`, `bg-button-primary-btn-bg` |
| Typography | `tokens/typography.css` | `type-h1-page-title-r`, `type-body-main-sb` |
| Spacing | `tokens/spacing.css` | `p-space-4`, `gap-space-6`, `px-space-16` |
| Radius | `tokens/radius.css` | `rounded-md`, `rounded-xl`, `rounded-full` |
| Icons | `tokens/icons.css` | `size-icon-sm`, `size-icon-md`, `size-icon-lg` |

**Font:** Inter for English, Sora available for alternate display use, and SF Pro/system fallback for Thai. Inter and Sora are bundled locally in `public/fonts/`. Never use a CDN or runtime import.

**Dark theme:** via `.dark` or `[data-theme="dark"]` on a containing element. Semantic tokens handle it automatically — do not duplicate theme colors inside components.

---

## Styling Rules

- Use token utilities. Never hardcode hex, px, or arbitrary Tailwind (`text-[#...]`, `p-[12px]`) when a matching token exists.
- Do not introduce a new font, color, spacing, radius, or icon size without checking existing tokens first.
- Global styles: `src/style.css`. Token files: `src/styles/tokens/`. Shared element rules: `src/styles/base.css`.

---

## Project Structure (shared + features)

Code is split into **`shared/`** (generic, reusable across the whole app) and
**`features/`** (everything owned by one domain — its views, components, config, store).

| Kind | Location |
| --- | --- |
| Shared primitive UI (Button, Field, Tag, Toast, Modal) | `src/shared/ui/<category>/` |
| Shared layout (AppNavbar, AppFooter, BackgroundEffect) | `src/shared/layout/` |
| Shared libs (supabase client) | `src/shared/lib/` |
| Feature views | `src/features/<feature>/views/` |
| Feature-specific components | `src/features/<feature>/components/` |
| Feature config / store | `src/features/<feature>/config/`, `src/features/<feature>/stores/` |
| Cross-cutting config / store (theme, navigation, auth, skills) | `src/config/`, `src/stores/` |
| Global styles & tokens | `src/styles/` |

Current features: `portfolio` · `projects` · `shop` · `auth`.

**Dependency rule:** `features/*` may import from `shared/*`, `config/`, `stores/`.
`shared/*` must **never** import from `features/*` (no backwards dependency).

### Component & file naming

- Group by **category** (plural, lowercase folder): `buttons/`, `fields/`, `tags/`, `modals/`, `toasts/`, `sections/`.
- One component per `.vue` file, **PascalCase**, name ends with its type: `PrimaryButton.vue`, `TextField.vue`, `CategoryTag.vue`.
- **File name must equal the exported component name.**
- Each folder (category or feature `components/`) has an `index.ts` barrel.

### Barrels

- Import from the **category / feature barrel**, not a root mega-barrel:
  `@/shared/ui`, `@/shared/ui/buttons`, `@/shared/layout`, `@/features/projects/components`.
- Import a feature's components/store/config from its **sub-barrels**
  (`@/features/projects/components`, `@/features/projects/stores`, `@/features/projects/config`).
- **Views are lazy-loaded by route** in `src/router/index.ts`
  (`() => import('@/features/<feature>/views/<View>.vue')`) so each route is its own chunk —
  views are not exported through a barrel.

```
src/shared/ui/buttons/
  PrimaryButton.vue
  index.ts            # export { default as PrimaryButton } from "./PrimaryButton.vue"
```

---

## Environment & API base URL

- Env vars are typed in `env.d.ts` and read via `import.meta.env`. `.env` is git-ignored;
  keep `.env.example` in sync (placeholders only).
- The backend URL is resolved in one place — `src/config/api.ts`, exported as `API_BASE_URL`.
  **Import `API_BASE_URL` from `@/config`; never read `import.meta.env.VITE_API_*` or hardcode
  `http://localhost:8080` in a store/view.**
- Pick which backend to call by flipping `VITE_API_TARGET` in `.env`: `local` | `host`
  (`bun run dev` = local, `bun run dev:host` = host). `VITE_API_BASE_URL`, if set, is a hard
  override that wins (used by CI / production builds).

---

## Vue Conventions

- `<script setup lang="ts">` — no other style.
- Props and emits must be TypeScript-typed.
- Use `@/` alias for all imports from `src/`.
- Use slots for visible labels/content in reusable components; do not bake copy into them.
- Keep variant/state class mappings typed and readable; do not scatter duplicated class strings across views.

---

## Interaction and Accessibility

- Implement all Figma states: default, hover, active, disabled, focus-visible.
- Semantic HTML first — `<button>` for actions, `<a>` for navigation, labeled controls for input.
- Keyboard focus must always be visible.
- Icon-only controls must have an accessible label.
- Form field errors must be programmatically associated with their input.

---

## Do Not

- Do not implement a component from memory when a Figma reference or screenshot is available.
- Do not edit unrelated files or discard in-progress changes outside the task scope.
- Do not run build, type check, or tests unless the user explicitly asks — see `.agents/README.md`.
