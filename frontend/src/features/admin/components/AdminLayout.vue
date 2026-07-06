<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { adminNavItems } from "@/features/admin/config";

interface Props {
    /** Page title shown in the content header. */
    title: string;
}

defineProps<Props>();

const route = useRoute();
const isSidebarOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);

function isActive(name: unknown): boolean {
    return typeof name === "object" && name !== null && "name" in name
        ? route.name === (name as { name: string }).name
        : false;
}
</script>

<template>
    <div :class="$style.shell" class="fp-admin">

        <main :class="[$style.content, isSidebarOpen ? $style.contentOpen : $style.contentClosed]">
            <header :class="$style.pageHeader">
                <div :class="$style.titleGroup">
                    <span :class="$style.kicker">Shop Admin</span>
                    <h1 :class="$style.pageTitle" class="type-h2-section-title-sb">{{ title }}</h1>
                </div>
                <slot name="actions" />
            </header>

            <nav :class="$style.adminTabs" aria-label="Shop admin navigation">
                <RouterLink
                    v-for="item in adminNavItems"
                    :key="item.label"
                    :to="item.to"
                    :class="[$style.adminTab, isActive(item.to) ? $style.adminTabActive : '']"
                    :aria-current="isActive(item.to) ? 'page' : undefined"
                >
                    <img :src="item.icon" alt="" aria-hidden="true" :class="$style.tabIcon">
                    <span>{{ item.label }}</span>
                </RouterLink>
            </nav>

            <slot />
        </main>
    </div>
</template>

<style module>
.shell {
    --admin-page: var(--color-neutral-50);
    --shop-card-bg: #ffffff;
    --shop-card-inset: var(--color-neutral-100);
    --shop-card-border: var(--color-input-border);
    --shop-card-text: var(--color-neutral-800);
    --shop-card-muted: var(--color-neutral-600);
    --shop-row-hover: var(--color-neutral-100);

    min-height: 100dvh;
    background-color: var(--admin-page);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    transition: background-color 300ms ease, color 300ms ease;
}

:global(.dark) .shell,
:global([data-theme="dark"]) .shell {
    --admin-page: var(--color-main-section-background);
    --shop-card-bg: var(--color-main-background);
    --shop-card-inset: #1f1f1f;
    --shop-card-border: var(--color-main-divider);
    --shop-card-text: var(--color-text-secondary);
    --shop-card-muted: #9aa6b4;
    --shop-row-hover: var(--color-table-row-hover);
}

.content {
    display: flex;
    min-width: 0;
    min-height: 100dvh;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-5);
    transition: margin-left 180ms ease;
}

.contentOpen {
    margin-left: 194px;
}

.contentClosed {
    margin-left: 44px;
}

.pageHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-space-4);
    padding-bottom: var(--spacing-space-4);
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
}

.titleGroup {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--spacing-space-1);
}

.kicker {
    color: var(--color-main-primary);
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1;
    text-transform: uppercase;
}

.pageTitle {
    margin: 0;
    color: var(--color-text-primary);
}

.adminTabs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-2xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-muted, var(--color-neutral-600));
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.adminTab {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    gap: var(--spacing-space-2);
    padding: 0 var(--spacing-space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-xl);
    color: var(--shop-card-muted, var(--color-text-secondary));
    font-size: 15px;
    font-weight: 600;
    line-height: 1;
    text-decoration: none;
    transition: background-color 160ms ease, border-color 160ms ease;
}

.adminTab:hover {
    background-color: var(--shop-row-hover, var(--color-neutral-100));
}

.adminTabActive {
    border-color: var(--color-main-primary);
    background-color: var(--color-main-primary);
    color: var(--color-button-primary-btn-text-active);
}

.adminTab:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.tabIcon {
    width: var(--spacing-icon-sm);
    height: var(--spacing-icon-sm);
    flex-shrink: 0;
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-5) var(--spacing-space-3) var(--spacing-space-10);
    }

    .contentOpen,
    .contentClosed {
        margin-left: 44px;
    }

    .adminTabs {
        align-items: stretch;
    }

    .adminTab {
        flex: 1 1 calc(50% - var(--spacing-space-3));
        justify-content: center;
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
    min-height: 38px;
    box-sizing: border-box;
    padding: 0 10px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-md);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font-family: var(--font-sans);
    font-size: 14px;
    transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease;
}

:where(.fp-admin) :where(textarea) {
    min-height: 88px;
    padding: 8px 10px;
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
    color: var(--color-input-placeholder);
}

:where(.fp-admin) :where(input[type="checkbox"], input[type="radio"]) {
    width: 18px;
    height: 18px;
    min-height: 0;
    padding: 0;
    accent-color: var(--color-main-primary);
    cursor: pointer;
}

.fp-admin table {
    width: 100%;
    border-collapse: collapse;
    color: var(--shop-card-text, var(--color-text-secondary));
    font-size: 14px;
}

.fp-admin th {
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
    background-color: var(--shop-card-inset, var(--color-main-background));
    color: var(--shop-card-text, var(--color-text-primary));
    font-size: 13px;
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
    min-height: 40px;
    border-radius: var(--radius-lg);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
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
