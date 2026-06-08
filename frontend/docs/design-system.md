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
| Shared element defaults | `src/styles/base.css` |
| Local Inter assets and license | `public/fonts/inter/` |
| Local Sora assets and license | `public/fonts/sora/` |

`src/style.css` is the only global entrypoint imported from application code. Token files are assembled there.

## Colors

Colors are semantic tokens imported from Figma's `Colors` variable collection. Use their Tailwind utilities in components instead of literal values.

| Purpose | Utility Examples |
| --- | --- |
| Primary/background surfaces | `bg-main-primary`, `bg-main-background`, `bg-main-surface` |
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

Light theme is the default. Enable the dark Figma mode on a containing element with either:

```html
<html class="dark">
```

or:

```html
<html data-theme="dark">
```

Dark overrides currently apply to background, border, primary/secondary text, and status colors. Components should reference semantic tokens so these overrides work automatically.

## Typography

The primary English font family is **Inter**. **Sora** is also hosted locally for alternate display use during UI revisions. Thai text falls through the system stack led by **SF Pro** on Apple platforms.

Fonts are hosted locally and must not be replaced with a CDN or runtime font import. The typography scale supports Regular (`400`), Semibold (`600`), and Extrabold (`800`).

| Figma Style | CSS Utility | Font Size | Weight |
| --- | --- | ---: | ---: |
| `Text Regular/h1-page-title-r` | `type-h1-page-title-r` | 32px | 400 |
| `Text Regular/h2-section-title-r` | `type-h2-section-title-r` | 28px | 400 |
| `Text Regular/h3-card-title-r` | `type-h3-card-title-r` | 24px | 400 |
| `Text Regular/subtitle-r` | `type-subtitle-r` | 22px | 400 |
| `Text Regular/body-main-r` | `type-body-main-r` | 20px | 400 |
| `Text Regular/body-small-r` | `type-body-small-r` | 18px | 400 |
| `Text Regular/caption-r` | `type-caption-r` | 16px | 400 |
| `Text Regular/overline-r` | `type-overline-r` | 14px | 400 |
| `Text Regular/button-r` | `type-button-r` | 16px | 400 |
| `Text Regular/input-label-r` | `type-input-label-r` | 14px | 400 |
| `Text Regular/handling-r` | `type-handling-r` | 14px | 400 |
| `Text Semibold/h1-page-title-sb` | `type-h1-page-title-sb` | 32px | 600 |
| `Text Semibold/h2-section-title-sb` | `type-h2-section-title-sb` | 28px | 600 |
| `Text Semibold/h3-card-title-sb` | `type-h3-card-title-sb` | 24px | 600 |
| `Text Semibold/subtitle-sb` | `type-subtitle-sb` | 22px | 600 |
| `Text Semibold/body-main-sb` | `type-body-main-sb` | 20px | 600 |
| `Text Semibold/body-small-sb` | `type-body-small-sb` | 18px | 600 |
| `Text Semibold/caption-sb` | `type-caption-sb` | 16px | 600 |
| `Text Semibold/overline-sb` | `type-overline-sb` | 14px | 600 |
| `Text Semibold/button-sb` | `type-button-sb` | 16px | 600 |
| `Text Semibold/input-label-sb` | `type-input-label-sb` | 14px | 600 |
| `Text Semibold/handling-sb` | `type-handling-sb` | 14px | 600 |
| `Text Extrabold/h1-page-title-eb` | `type-h1-page-title-eb` | 32px | 800 |
| `Text Extrabold/h2-section-title-eb` | `type-h2-section-title-eb` | 28px | 800 |
| `Text Extrabold/h3-card-title-eb` | `type-h3-card-title-eb` | 24px | 800 |
| `Text Extrabold/subtitle-eb` | `type-subtitle-eb` | 22px | 800 |
| `Text Extrabold/body-main-eb` | `type-body-main-eb` | 20px | 800 |
| `Text Extrabold/body-small-eb` | `type-body-small-eb` | 18px | 800 |
| `Text Extrabold/caption-eb` | `type-caption-eb` | 16px | 800 |
| `Text Extrabold/overline-eb` | `type-overline-eb` | 14px | 800 |
| `Text Extrabold/button-eb` | `type-button-eb` | 16px | 800 |
| `Text Extrabold/input-label-eb` | `type-input-label-eb` | 14px | 800 |
| `Text Extrabold/handling-eb` | `type-handling-eb` | 14px | 800 |

Figma currently sets line height to `Auto` and letter spacing to `0`; the CSS utility mapping uses `line-height: normal` and `letter-spacing: 0`.

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
