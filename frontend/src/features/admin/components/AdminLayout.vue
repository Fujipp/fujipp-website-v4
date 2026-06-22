<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { ShopSidebar } from "@/features/shop/components";
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
    <div :class="$style.shell">
        <ShopSidebar v-model="isSidebarOpen" />

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
    min-height: 100dvh;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    transition: background-color 300ms ease, color 300ms ease;
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
    border-bottom: 1px solid var(--color-main-divider);
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
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
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
    color: var(--color-text-secondary);
    font-size: 15px;
    font-weight: 600;
    line-height: 1;
    text-decoration: none;
    transition: background-color 160ms ease, border-color 160ms ease;
}

.adminTab:hover {
    background-color: var(--color-button-secondary-btn-hover);
}

.adminTabActive {
    border-color: var(--color-main-primary);
    background-color: color-mix(in srgb, var(--color-main-primary) 30%, var(--color-button-secondary-btn-active));
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
