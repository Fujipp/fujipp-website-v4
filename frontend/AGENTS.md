# Frontend AI Instructions

Read `.agents/frontend.md` first, then read:

- `docs/design-system.md` for Figma and token mappings.
- `docs/component-guidelines.md` before creating or changing UI components.

## Critical Workflow Rule

- Do not run tests, type checks, builds, or browser verification unless the user explicitly asks for verification.
- This applies after all implementation changes, including UI and responsive-layout edits.

## Stack

- Vue 3 Single File Components with `<script setup lang="ts">`.
- TypeScript.
- Vue Router.
- Vite.
- Tailwind CSS v4 configured through CSS `@theme`.
- Bun for frontend package scripts.

## Design Source Of Truth

- Figma file: `fujipp-personal-platform`.
- Figma URL: `https://www.figma.com/design/NPe2UZEWcr0Sb3U36SgHft/fujipp-personal-platform`.
- File key: `NPe2UZEWcr0Sb3U36SgHft`.
- Figma defines visual appearance, variants, states, spacing intent, and responsive layout.
- CSS tokens in `src/styles/tokens/` are the implementation source for values already synchronized from Figma.
- When Figma and code differ, do not silently invent a compromise. Identify the difference and update the appropriate source deliberately.

## Styling Rules

- Use token-based Tailwind utilities before raw values.
- Do not hardcode hex colors in `.vue` files when an existing semantic color token matches.
- Do not introduce a new font, color, spacing, radius, or icon size without checking existing tokens first.
- Use typography utilities from `src/styles/tokens/typography.css` for designed text styles.
- Support the existing dark theme mechanism through `.dark` or `[data-theme="dark"]`; do not duplicate theme-specific colors inside components.
- Keep global style assembly in `src/style.css`. Add foundation files under `src/styles/tokens/` and shared element rules under `src/styles/base.css`.

## Component Rules

- UI rendered in the browser belongs in `.vue` files.
- Reusable primitives belong in `src/shared/ui/<category>/`.
- Reusable page structure belongs in `src/shared/layout/`.
- Feature-owned views belong in `src/features/<feature>/views/`.
- Feature-owned components belong in `src/features/<feature>/components/`.
- Feature config and stores belong in `src/features/<feature>/config/` and `src/features/<feature>/stores/`.
- Cross-cutting config and stores belong in `src/config/` and `src/stores/`.
- Type definitions, composables, helpers, constants, and barrel exports belong in `.ts` files.
- Shared code must not import from `features/*`.
- Choose `shared/` only for genuinely reusable UI; otherwise keep code inside the owning feature.

Example:

```text
src/shared/ui/buttons/
  PrimaryButton.vue
  index.ts
```

Views are lazy-loaded by route in `src/router/index.ts` and are not exported through barrels.

## Vue Conventions

- Use `<script setup lang="ts">`.
- Define props and emitted events with TypeScript.
- Prefer slots for visible labels/content when a component is reusable.
- Keep variant/state mappings readable and typed; do not scatter duplicated class strings across views.
- Use the `@/` alias for imports from `src/`.
- Read API config from `@/config` via `API_BASE_URL`; do not hardcode local or production backend URLs in components, stores, or views.

## Interaction And Accessibility

- Implement visual states present in Figma: default, hover, active, disabled, and focus-visible when applicable.
- Use semantic HTML first: `<button>` for actions, `<a>` for navigation, and labeled form controls for input.
- Keyboard focus must be visible.
- Icon-only interactive controls must have an accessible label.
- Error messaging for form fields must be programmatically associated with the input when added.

## Do Not

- Do not edit or discard unrelated in-progress changes.
- Do not replace design tokens with arbitrary Tailwind values such as `text-[#...]` or `p-[...]` when a matching token exists.
- Do not use external runtime font imports; Kanit is already bundled locally in `public/fonts/kanit/`.
- Do not implement a Figma component from memory when a reference, screenshot, or spec is available.

## Verification

- Do not automatically run tests, type checks, builds, or browser verification after implementation changes.
- Run verification commands such as `npm run build` only when the user explicitly asks for them.
- When verification was not requested, finish the requested edits and state that no test or build was run by instruction.

## Changelog

- After frontend changes, add a dated row to `docs/changelog/frontend.md`.
- If the task spans multiple areas, update each matching changelog under `docs/changelog/`.

## Prompt Handoff

When giving this project to another AI, start tasks with:

```text
Read frontend/AGENTS.md, frontend/docs/design-system.md, and
frontend/docs/component-guidelines.md first. Use the existing Figma-derived
tokens and do not hardcode visual values in Vue components.
```
