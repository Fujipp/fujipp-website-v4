# Frontend Reference

Read `.agents/frontend.md` and `frontend/AGENTS.md` first.

## Stack

- Vue 3 SFC with `<script setup lang="ts">`.
- TypeScript, Vue Router, Vite, Tailwind CSS v4 via CSS `@theme`.
- Bun for frontend scripts.
- Pinia for stores, vue-i18n for locales, Supabase client in `src/shared/lib/supabase.ts`.

## Structure

- Shared reusable UI: `frontend/src/shared/ui/<category>/`.
- Shared layout: `frontend/src/shared/layout/`.
- Feature-owned code: `frontend/src/features/<feature>/`.
- Cross-cutting config/stores: `frontend/src/config/`, `frontend/src/stores/`.
- Lazy route views: `frontend/src/router/index.ts`.
- Tokens: `frontend/src/styles/tokens/`.

Shared code must not import from `features/*`. Put a component in `shared/` only when multiple features can reuse it.

## Design And API

- Use Figma/tokens as visual source of truth. For components, read `frontend/docs/design-system.md` and `frontend/docs/component-guidelines.md`.
- Do not hardcode colors, spacing, radius, fonts, icon sizes, or backend URLs when project tokens/config exist.
- API base URL comes from `@/config` as `API_BASE_URL`; preserve local and host backend switching.
- Do not add packages without explicit approval.

## Token-Saving Reads

- For UI changes: route/view -> feature components -> shared component -> token file.
- For data flow: view/store -> `src/config/api.ts` -> matching backend DTO/controller.
- For i18n copy: read only the relevant file under `src/locales/<lang>/`.
