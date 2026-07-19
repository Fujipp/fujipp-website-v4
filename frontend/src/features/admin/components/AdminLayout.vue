<script setup lang="ts">
import { AppFooter } from "@/shared/layout";

interface Props {
    /** Page title shown in the content header. */
    title: string;
}

defineProps<Props>();
</script>

<template>
    <div :class="$style.shell" class="fp-admin">
        <main :class="$style.content">
            <header :class="$style.pageHeader">
                <h1 :class="$style.pageTitle" class="type-h2-section-title-sb">{{ title }}</h1>
                <slot name="actions" />
            </header>

            <slot />
        </main>
        <AppFooter :class="$style.footer" />
    </div>
</template>

<style module>
.shell {
    --admin-page: var(--color-main-background);
    --shop-card-bg: var(--color-main-background);
    --shop-card-inset: var(--color-main-surface);
    --shop-card-border: var(--color-input-border);
    --shop-card-text: var(--color-text-primary);
    --shop-card-muted: var(--color-text-secondary);
    --shop-row-hover: var(--color-table-row-hover);

    min-height: 100dvh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: var(--admin-page);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    transition: background-color 300ms ease, color 300ms ease;
}

:global(.dark) .shell,
:global([data-theme="dark"]) .shell {
    --admin-page: var(--color-main-background);
    --shop-card-bg: var(--color-main-background);
    --shop-card-inset: var(--color-main-surface);
    --shop-card-border: var(--color-main-divider);
    --shop-card-text: var(--color-text-primary);
    --shop-card-muted: var(--color-text-secondary);
    --shop-row-hover: var(--color-table-row-hover);

    /* The global input tokens remain light for public forms. Admin is a dense
       workspace, so its controls inherit the same dark surface as its tables. */
    --color-input-background: var(--color-main-surface);
    --color-input-text: var(--color-text-primary);
    --color-input-border: var(--color-main-divider);
    --color-input-title: var(--color-text-secondary);
    --color-input-disabled: var(--color-button-secondary);
    --color-input-bg: var(--color-main-surface);
    --color-text-input: var(--color-text-primary);
    --color-input-placeholder: var(--color-text-secondary);
    --color-input-bg-disabled: var(--color-button-secondary);
    --color-input-border-hover: var(--color-text-secondary);
    --color-input-border-disabled: var(--color-main-divider);
}

.content {
    display: flex;
    width: min(100%, var(--container-7xl));
    min-width: 0;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-24) var(--spacing-space-4) var(--spacing-space-10);
    gap: var(--spacing-space-5);
    flex: 1;
}

.pageHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-space-4);
    padding-bottom: var(--spacing-space-4);
    border-bottom: 1px solid var(--color-main-divider);
}

.pageTitle {
    margin: 0;
    color: var(--color-text-primary);
}

.footer {
    margin-top: auto;
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-20) var(--spacing-space-3) var(--spacing-space-8);
    }

}
</style>

<!--
  Theme-aware defaults for raw form controls + tables inside every admin page.
  Scoped to .fp-admin and wrapped in :where() so the rules carry near-zero
  specificity — a view's own class styles always win, but the many unstyled
  white inputs/selects/checkboxes pick up a consistent, dark/light-aware look
  that cross-fades on theme toggle.
-->
<style>
:where(.fp-admin) :where(input[type="text"], input[type="number"], input[type="date"],
                 input[type="search"], input[type="password"], input:not([type]),
                 select, textarea) {
    min-height: var(--spacing-space-10);
    box-sizing: border-box;
    padding: 0 var(--spacing-space-3);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-md);
    background-color: var(--color-input-bg);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--type-size-button);
    transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease;
}

:where(.fp-admin) :where(textarea) {
    min-height: var(--spacing-space-24);
    padding: var(--spacing-space-2) var(--spacing-space-3);
    line-height: 1.5;
    resize: vertical;
}

:where(.fp-admin) :where(input:hover:not(:disabled), select:hover:not(:disabled), textarea:hover:not(:disabled)) {
    border-color: color-mix(in srgb, var(--color-main-primary) 60%, var(--color-input-border));
}

:where(.fp-admin) :where(input:focus-visible, select:focus-visible, textarea:focus-visible) {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 1px;
    border-color: var(--color-main-primary);
}

:where(.fp-admin) :where(input::placeholder, textarea::placeholder) {
    color: var(--color-text-secondary);
}

:where(.fp-admin) :where(input[type="checkbox"], input[type="radio"]) {
    width: var(--spacing-icon-sm);
    height: var(--spacing-icon-sm);
    min-height: 0;
    padding: 0;
    accent-color: var(--color-main-primary);
    cursor: pointer;
}

.fp-admin table {
    width: 100%;
    border-collapse: collapse;
    color: var(--shop-card-text, var(--color-text-primary));
    font-size: var(--type-size-caption);
}

.fp-admin th {
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
    background-color: var(--color-main-background);
    color: var(--shop-card-text, var(--color-text-primary));
    font-size: var(--type-size-caption);
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1.2;
    text-align: left;
    text-transform: none;
    white-space: nowrap;
}

.fp-admin td {
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
    color: var(--shop-card-muted, var(--color-text-secondary));
    line-height: 1.35;
    white-space: nowrap;
}

.fp-admin tbody tr {
    transition: background-color 160ms ease;
}

.fp-admin tbody tr:hover {
    background-color: var(--shop-row-hover, var(--color-table-row-hover));
}

.fp-admin table input:not([type="checkbox"]):not([type="radio"]),
.fp-admin table select {
    min-height: var(--spacing-space-10);
    border-radius: var(--radius-lg);
    background-color: var(--color-input-bg);
    color: var(--color-text-primary);
}

.fp-admin button {
    font-family: var(--font-sans);
}

.fp-admin button:focus-visible,
.fp-admin a:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}
</style>
