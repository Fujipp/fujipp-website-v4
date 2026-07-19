# Fujipp Frontend Design System

This document maps the Figma foundation into implementation tokens for the Vue frontend.

## Source

- Design file: `fujipp-personal-platform`
- Figma URL: `https://www.figma.com/design/NPe2UZEWcr0Sb3U36SgHft/fujipp-personal-platform`
- File key: `NPe2UZEWcr0Sb3U36SgHft`
- Known pages: `Atoms`, `Tech Stack`, `System Architecture`, `Components`, `Wireframe`, `Template`

When an AI can access Figma, it should inspect the relevant component or frame before implementing it. When it cannot access Figma, this document and an exported screenshot/spec should be supplied with the task.

## File Layout

| Concern | File |
| --- | --- |
| Global stylesheet entrypoint | `src/style.css` |
| Color and theme tokens | `src/styles/tokens/colors.css` |
| Font faces and text styles | `src/styles/tokens/typography.css` |
| Spacing and container tokens | `src/styles/tokens/spacing.css` |
| Corner radius tokens | `src/styles/tokens/radius.css` |
| Icon sizing tokens | `src/styles/tokens/icons.css` |
| Icon assets | `public/icons/` |
| Brand assets | `public/brand/` |
| Shared element defaults | `src/styles/base.css` |
| Local Inter assets and license | `public/fonts/inter/` |
| Local Sora assets and license | `public/fonts/sora/` |
| Local Rammetto One assets and license | `public/fonts/rammetto-one/` |

`src/style.css` is the only global entrypoint imported from application code. Token files are assembled there.

## Colors

Colors are semantic tokens imported from Figma's `Colors` variable collection. Use their Tailwind utilities in components instead of literal values.

| Purpose | Utility Examples |
| --- | --- |
| Primary/background surfaces | `bg-main-primary`, `bg-main-background`, `bg-main-surface` |
| Brand colors | `bg-main-brand-primary`, `bg-main-brand-secondary` |
| Borders/dividers | `border-main-border`, `border-main-divider` |
| Primary and secondary text | `text-text-primary-text`, `text-text-secondary-text` |
| Muted/disabled/input text | `text-text-muted`, `text-text-disabled`, `text-text-input` |
| Status | `text-status-success`, `text-status-warning`, `text-status-error`, `text-status-info` |
| Primary button state | `bg-button-primary-btn-bg`, `hover:bg-button-primary-btn-hover`, `active:bg-button-primary-btn-active` |
| Secondary button state | `bg-button-secondary-btn-bg`, `hover:bg-button-secondary-btn-hover`, `active:bg-button-secondary-btn-active` |
| Danger button state | `bg-button-btn-bg-danger`, `hover:bg-button-btn-hover-danger`, `active:bg-button-btn-active-danger` |
| Input state | `bg-input-bg`, `border-input-border`, `hover:border-input-border-hover`, `focus:border-input-border-focus` |
| Neutral palette | `bg-neutral-50` through `bg-neutral-900` |
| Chart/pastel colors | `bg-data-pastel-1` through `bg-data-pastel-8` |
| Dialog surfaces and text | `bg-dialog-background`, `text-dialog-text-primary`, `border-dialog-divider` |
| Navigation surfaces and text | `bg-nav-background`, `bg-nav-background-selected`, `text-nav-text` |
| Footer surfaces and text | `bg-footer-background`, `text-footer-text`, `border-footer-divider` |

Light theme is the default. Enable the dark Figma mode on a containing element with either:

```html
<html class="dark">
```

or:

```html
<html data-theme="dark">
```

Dark overrides cover every semantic color group, including dialog, navigation, and footer surfaces. Components should reference semantic tokens so these overrides work automatically.

## Typography

The primary English font family is **Inter**. **Sora** is hosted locally for alternate display use, and **Rammetto One** is available for decorative display text through `font-rammetto-one`. Thai text falls through the system stack led by **SF Pro** on Apple platforms.

Fonts are hosted locally and must not be replaced with a CDN or runtime font import. The typography scale supports Regular (`400`), Semibold (`600`), and Extrabold (`800`).

| Style | Utility pattern | Desktop/iPad | Mobile | Weights |
| --- | --- | ---: | ---: | --- |
| `h1-page-title` | `type-h1-page-title-{weight}` | 32px | 26px | `r` 400 · `sb` 600 · `eb` 800 |
| `h2-section-title` | `type-h2-section-title-{weight}` | 28px | 22px | `r` 400 · `sb` 600 · `eb` 800 |
| `h3-card-title` | `type-h3-card-title-{weight}` | 24px | 20px | `r` 400 · `sb` 600 · `eb` 800 |
| `subtitle` | `type-subtitle-{weight}` | 22px | 18px | `r` 400 · `sb` 600 · `eb` 800 |
| `body-main` | `type-body-main-{weight}` | 20px | 16px | `r` 400 · `sb` 600 · `eb` 800 |
| `body-small` | `type-body-small-{weight}` | 18px | 14px | `r` 400 · `sb` 600 · `eb` 800 |
| `caption` | `type-caption-{weight}` | 16px | 12px | `r` 400 · `sb` 600 · `eb` 800 |
| `overline` | `type-overline-{weight}` | 14px | 10px | `r` 400 · `sb` 600 · `eb` 800 |
| `button` | `type-button-{weight}` | 16px | 12px | `r` 400 · `sb` 600 · `eb` 800 |
| `input-label` | `type-input-label-{weight}` | 14px | 10px | `r` 400 · `sb` 600 · `eb` 800 |
| `handling` | `type-handling-{weight}` | 14px | 10px | `r` 400 · `sb` 600 · `eb` 800 |
| `support` | `type-support-{weight}` | 10px | 8px | `r` 400 · `sb` 600 · `eb` 800 |

Mobile sizes are the default. Desktop/iPad sizes apply from `768px` upward. Figma currently sets line height to `Auto` and letter spacing to `0`; the CSS utility mapping uses `line-height: normal` and `letter-spacing: 0`.

## Spacing

Spacing tokens match the Figma `Spacing` variables. They become utilities such as `p-space-4`, `gap-space-6`, `mt-space-12`, and `px-space-16`.

| Token | Value | Example Utility |
| --- | ---: | --- |
| `space/0` | 0px | `gap-space-0` |
| `space/1` | 4px | `p-space-1` |
| `space/2` | 8px | `px-space-2` |
| `space/3` | 12px | `py-space-3` |
| `space/4` | 16px | `gap-space-4` |
| `space/5` | 20px | `mt-space-5` |
| `space/6` | 24px | `px-space-6` |
| `space/8` | 32px | `gap-space-8` |
| `space/10` | 40px | `py-space-10` |
| `space/12` | 48px | `mt-space-12` |
| `space/14` | 56px | `px-space-14` |
| `space/16` | 64px | `py-space-16` |
| `space/20` | 80px | `gap-space-20` |
| `space/24` | 96px | `mt-space-24` |
| `space/32` | 128px | `py-space-32` |
| `space/max-w-7xl` | 1280px | `max-w-7xl` |

Larger spacing tokens (`space/40` through `space/132`) are defined in the token file and should be used only when the Figma layout calls for them.

## Radius

| Figma Token | Utility | Value |
| --- | --- | ---: |
| `radius/none` | `rounded-none` | 0px |
| `radius/sm` | `rounded-sm` | 2px |
| `radius/base` | `rounded` | 4px |
| `radius/md` | `rounded-md` | 6px |
| `radius/lg` | `rounded-lg` | 8px |
| `radius/xl` | `rounded-xl` | 12px |
| `radius/2xl` | `rounded-2xl` | 16px |
| `radius/3xl` | `rounded-3xl` | 24px |
| `radius/full` | `rounded-full` | 9999px |

## Icon Sizes

SVG icons live under `public/icons/`, separate from brand assets under `public/brand/` and content images under `public/images/`.
This library is the source for the UI rewrite, not a compatibility layer for older component paths. The icon source package is normalized into lowercase kebab-case names and semantic folders:
Application code should import icon paths from `src/config/icons.ts` (`icons.add`, `icons.stack.frontend.vuejs`, etc.) instead of hardcoding public paths. Monochrome icons use `--color-text-primary`; icons with their own non-black colors keep their original SVG colors.

```text
/icons/action/add.svg
/icons/common/image.svg
/icons/input/eye-close.svg
/icons/language/thai.svg
/icons/link/github.svg
/icons/navigation/home.svg
/icons/navigation/direction/right.svg
/icons/navigation/theme/mode-dark.svg
/icons/shop/renew.svg
/icons/stack/frontend/vuejs.svg
/brand/fujipp-logo.svg
```

Stack icons use `/icons/stack/{category}/{name}.svg`, where category is one of `ai`, `backend`, `database`, `devops`, `frontend`, `language`, `media`, `service`, `tool`, or `ux-ui`.

| Figma Token | Utility | Value |
| --- | --- | ---: |
| `icon/xs` | `size-icon-xs` | 16px |
| `icon/sm` | `size-icon-sm` | 20px |
| `icon/md` | `size-icon-md` | 24px |
| `icon/lg` | `size-icon-lg` | 32px |
| `icon/xl` | `size-icon-xl` | 40px |

## Implementation Example

```vue
<template>
  <button
    class="type-button-sb rounded-md bg-button-primary-btn-bg px-space-6 py-space-3 text-button-primary-btn-text-active transition-colors hover:bg-button-primary-btn-hover active:bg-button-primary-btn-active disabled:bg-button-primary-btn-disabled"
  >
    Save
  </button>
</template>
```

If a component cannot be expressed using existing tokens, record the missing design decision before adding a new token.
