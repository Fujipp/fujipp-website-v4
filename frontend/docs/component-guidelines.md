# Component Guidelines

This document defines how a person or AI should turn Figma components into Vue components in this project.

## Workflow

1. Read `frontend/AGENTS.md`, `frontend/docs/architecture.md`, and `frontend/docs/design-system.md`.
2. Locate the component in Figma and inspect its variants, states, sizing, layout, text style, and theme behavior.
3. List the props, slots, emitted events, and accessibility requirements before implementation.
4. Build a reusable `.vue` component using existing tokens.
5. Export the component through its local `index.ts` and the appropriate aggregate export when one exists.
6. Add or update a preview/view when visual validation is needed.
7. Run build/type-check/browser verification only when the task explicitly asks for verification.

When the AI cannot access Figma, provide it with a screenshot and a short spec including dimensions, variants, states, responsive behavior, and content examples.

## Component Locations

| Component Kind | Location | Examples |
| --- | --- | --- |
| Shared primitive UI | `src/shared/ui/<category>/` | `buttons/PrimaryButton.vue`, `fields/TextField.vue`, `tags/StatusTag.vue` |
| Shared layout | `src/shared/layout/` | `AppNavbar/AppNavbar.vue`, `AppFooter/AppFooter.vue`, `BackgroundEffect.vue` |
| Feature page section | `src/features/<feature>/components/` | `projects/FeaturedProjectCard.vue`, `shop/WalletTopupPanel.vue` |
| Routed page | `src/features/<feature>/views/` | `portfolio/HomeView.vue`, `shop/ShopDashboardView.vue` |
| Feature config/store | `src/features/<feature>/config/`, `src/features/<feature>/stores/` | `shop/config/catalog.ts`, `projects/stores/projectStore.ts` |
| Cross-cutting config/store | `src/config/`, `src/stores/` | `api.ts`, `icons.ts`, `userStore.ts`, `toastStore.ts` |
| Shared library | `src/shared/lib/` | `supabase.ts` |

Recommended folder structure:

```text
src/shared/ui/buttons/
  PrimaryButton.vue
  index.ts
```

Local export:

```ts
export { default as PrimaryButton } from './PrimaryButton.vue'
```

## Vue Component Template

```vue
<script setup lang="ts">
type ButtonVariant = 'primary' | 'secondary' | 'danger'

interface Props {
  variant?: ButtonVariant
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  disabled: false,
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="type-button-sb rounded-md px-space-6 py-space-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary disabled:cursor-not-allowed"
    :class="{
      'bg-button-primary-btn-bg text-button-primary-btn-text-active hover:bg-button-primary-btn-hover active:bg-button-primary-btn-active disabled:bg-button-primary-btn-disabled':
        variant === 'primary',
      'bg-button-secondary-btn-bg text-button-secondary-btn-text hover:bg-button-secondary-btn-hover active:bg-button-secondary-btn-active':
        variant === 'secondary',
      'bg-button-btn-bg-danger text-button-btn-text-danger hover:bg-button-btn-hover-danger active:bg-button-btn-active-danger':
        variant === 'danger',
    }"
  >
    <slot />
  </button>
</template>
```

This template is a coding pattern, not a claim that the Figma `Button` component has already been inspected. Confirm its final variants and dimensions against Figma before shipping.

## Props And Variants

- Map Figma variants to typed Vue props.
- Use a boolean prop only for true binary behavior such as `disabled` or `loading`.
- Use named slots for replaceable structured content, for example `icon-leading` or `actions`.
- Keep labels/content in slots rather than baking product copy into reusable components.
- Emit user interaction events only when native event forwarding is not enough.

Example variant mapping checklist:

| Figma Property | Vue API |
| --- | --- |
| Type: Primary / Secondary / Danger | `variant: 'primary' | 'secondary' | 'danger'` |
| Size: Small / Medium / Large | `size: 'sm' | 'md' | 'lg'` |
| Disabled: True / False | `disabled: boolean` |
| Leading icon visibility | named slot or `icon` prop, based on reuse needs |

## Token Usage

Use established utility families:

| Design Concern | Use |
| --- | --- |
| Font style | `type-*` utilities, for example `type-body-main-r` |
| Color | semantic utilities such as `bg-main-background`, `text-status-error` |
| Spacing | `*-space-*`, for example `gap-space-4`, `px-space-6` |
| Radius | `rounded-*`, using configured Figma radius tokens |
| Icon sizing | `size-icon-*` |

Avoid:

```vue
<div class="bg-[#7987ac] rounded-[6px] px-[24px] text-[16px]">
```

Prefer:

```vue
<div class="type-button-sb rounded-md bg-button-primary-btn-bg px-space-6">
```

## State Checklist

For an interactive component, evaluate each applicable state:

| State | Expected Check |
| --- | --- |
| Default | Matches the base Figma variant |
| Hover | Uses the mapped hover token or Figma-defined visual change |
| Active/Pressed | Uses the mapped active token or Figma-defined visual change |
| Disabled | Prevents interaction and displays disabled styling |
| Focus-visible | Clearly visible for keyboard users |
| Error | Included for form controls when specified |
| Loading | Included only when specified by design/product behavior |
| Dark theme | Semantic tokens remain legible in dark mode |

## Accessibility Checklist

- Buttons use `<button>` and have readable labels.
- Navigation actions use links when they change location.
- Input components expose a label, error state, and description association where applicable.
- Do not use color alone to communicate error or success.
- Decorative icons should not receive an accessible name; meaningful icon-only controls must receive one.
- Do not remove focus outlines without adding an accessible replacement.

## Validation Handoff For AI

Use this task format when assigning a component:

```md
Read `frontend/AGENTS.md`, `frontend/docs/architecture.md`,
`frontend/docs/design-system.md`, and `frontend/docs/component-guidelines.md`
first.

Create `<ComponentName>` from the Figma design:
- Figma node/frame: `<link or node id>`
- Variants: `<list>`
- States: `<list>`
- Responsive notes: `<list>`

Requirements:
- Use only existing design tokens unless a missing token is reported.
- Implement as a typed Vue component under `src/shared/ui/<category>/` or
  `src/features/<feature>/components/`, based on reuse.
- Add barrel exports.
- Keep focus and accessibility behavior.
- Run build verification only when explicitly requested.
```
