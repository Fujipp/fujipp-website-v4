<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import ThemeButton from "@/shared/ui/buttons/ThemeButton.vue";
import { useUserStore } from "@/stores";
import { adminNavItems } from "@/features/admin/config";

const SIDEBAR_STORAGE_KEY = "fujipp:admin-sidebar-open";

interface Props {
    /** Page title shown in the content header. */
    title: string;
}

defineProps<Props>();

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { profile, user } = storeToRefs(userStore);

const isOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);

const username = computed(() => (
    profile.value?.username
    ?? profile.value?.displayName
    ?? user.value?.email?.split("@")[0]
    ?? "admin"
));
const uid = computed(() => `#${user.value?.id.slice(0, 8) ?? "uid"}`);

function isActive(name: unknown): boolean {
    return typeof name === "object" && name !== null && "name" in name
        ? route.name === (name as { name: string }).name
        : false;
}

function toggleSidebar(): void {
    isOpen.value = !isOpen.value;
}

function onSelect(): void {
    if (typeof window !== "undefined" && window.innerWidth <= 760) {
        isOpen.value = false;
    }
}

async function handleLogOut(): Promise<void> {
    await userStore.signOut();
    await router.push({ name: "home" });
}

onMounted(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "true") isOpen.value = true;
    if (stored === "false") isOpen.value = false;
});

watch(isOpen, (value) => {
    if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
    }
});
</script>

<template>
    <div :class="$style.shell">
        <aside
            :class="[$style.sidebar, isOpen ? $style.open : $style.closed]"
            :aria-label="isOpen ? 'Admin sidebar' : 'Collapsed admin sidebar'"
        >
            <template v-if="isOpen">
                <div :class="$style.mainGroup">
                    <div :class="$style.brandRow">
                        <RouterLink to="/" :class="$style.brand" aria-label="Fujipp home">
                            <img
                                src="/images/icons/navbar/fujipp.svg"
                                alt=""
                                aria-hidden="true"
                                :class="$style.brandIcon"
                                draggable="false"
                            >
                            <span :class="$style.brandLabel">Admin</span>
                        </RouterLink>
                        <button
                            type="button"
                            :class="$style.iconButton"
                            aria-label="Collapse admin sidebar"
                            @click="toggleSidebar"
                        >
                            <img src="/images/icons/sidebar/sidebar-close.svg" alt="" aria-hidden="true" :class="$style.icon">
                        </button>
                    </div>
                    <div :class="$style.divider" aria-hidden="true" />

                    <ThemeButton />

                    <nav :class="$style.navigation" aria-label="Admin navigation">
                        <RouterLink
                            v-for="item in adminNavItems"
                            :key="item.label"
                            :to="item.to"
                            :class="[$style.navItem, isActive(item.to) ? $style.navItemActive : '']"
                            :aria-current="isActive(item.to) ? 'page' : undefined"
                            @click="onSelect"
                        >
                            <img :src="item.icon" alt="" aria-hidden="true" :class="$style.navIcon">
                            <span :class="$style.navLabel">{{ item.label }}</span>
                        </RouterLink>
                    </nav>
                </div>

                <div :class="$style.userPanel">
                    <div :class="$style.userInfo">
                        <img
                            v-if="profile?.avatarUrl"
                            :class="$style.avatar"
                            :src="profile.avatarUrl"
                            alt=""
                            aria-hidden="true"
                        >
                        <span v-else :class="$style.avatarFallback" aria-hidden="true" />
                        <div :class="$style.userText">
                            <div :class="$style.username">{{ username }}</div>
                            <div :class="$style.uid">{{ uid }}</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        :class="$style.iconButton"
                        aria-label="Sign out"
                        :disabled="userStore.isLoading"
                        @click="handleLogOut"
                    >
                        <img src="/images/icons/sidebar/logout.svg" alt="" aria-hidden="true" :class="$style.iconSm">
                    </button>
                </div>
            </template>

            <button
                v-else
                type="button"
                :class="$style.collapsedToggle"
                aria-label="Expand admin sidebar"
                @click="toggleSidebar"
            >
                <img src="/images/icons/sidebar/sidebar-open.svg" alt="" aria-hidden="true" :class="$style.icon">
            </button>
        </aside>

        <button
            v-if="isOpen"
            type="button"
            :class="$style.backdrop"
            aria-label="Close admin sidebar"
            @click="toggleSidebar"
        />

        <main :class="[$style.content, isOpen ? $style.contentOpen : $style.contentClosed]">
            <header :class="$style.pageHeader">
                <h1 :class="$style.pageTitle" class="type-h2-section-title-sb">{{ title }}</h1>
                <slot name="actions" />
            </header>
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
}

.sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    box-sizing: border-box;
    height: 100dvh;
    padding: 10px;
    gap: 10px;
    overflow-y: auto;
    overscroll-behavior: contain;
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    transition: width 180ms ease;
}

.open { width: 214px; }
.closed { width: 44px; }

.mainGroup,
.navigation {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
}

.brandRow {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 38px;
    gap: 20px;
}

.brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: var(--color-text-secondary);
    text-decoration: none;
}

.brandIcon {
    display: block;
    height: 32px;
    width: auto;
    user-select: none;
    -webkit-user-drag: none;
}

.brandLabel {
    font-weight: 600;
}

.divider {
    align-self: stretch;
    height: 1px;
    border-top: 1px solid var(--color-main-divider);
}

.iconButton,
.collapsedToggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
}

.iconButton { width: var(--spacing-icon-md); height: var(--spacing-icon-md); flex-shrink: 0; }
.collapsedToggle { align-self: stretch; height: 38px; }

.icon { width: var(--spacing-icon-md); height: var(--spacing-icon-md); flex-shrink: 0; }
.iconSm { width: var(--spacing-icon-xs); height: var(--spacing-icon-xs); }

.navItem {
    align-self: stretch;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    min-height: 36px;
    gap: 10px;
    padding: 8px 10px;
    border: 0;
    border-radius: var(--radius-xl);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 160ms ease;
}

.navItem:hover { background-color: var(--color-button-secondary-btn-hover); }
.navItemActive { background-color: var(--color-button-secondary-btn-active); }

.navItem:focus-visible,
.iconButton:focus-visible,
.collapsedToggle:focus-visible,
.brand:focus-visible {
    border-radius: var(--radius-sm);
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.navIcon { width: var(--spacing-icon-md); height: var(--spacing-icon-md); flex-shrink: 0; }
.navLabel { font-weight: 300; line-height: normal; }

.userPanel {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 66px;
    padding: 10px;
    gap: 10px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
}

.userInfo { display: flex; align-items: center; min-width: 0; gap: 10px; }

.avatar,
.avatarFallback {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
}

.avatar { object-fit: cover; }
.avatarFallback { background-color: var(--color-main-secondary); }

.userText { min-width: 0; }

.username,
.uid {
    max-width: 110px;
    overflow: hidden;
    font-size: 15px;
    font-weight: 300;
    line-height: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.uid { color: var(--color-text-disabled); }

.iconButton:disabled { cursor: not-allowed; opacity: 0.6; }

.content {
    box-sizing: border-box;
    min-height: 100dvh;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    transition: margin-left 180ms ease;
}

.contentOpen { margin-left: 214px; }
.contentClosed { margin-left: 44px; }

.pageHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
}

.pageTitle { margin: 0; }

.backdrop { display: none; }

@media (max-width: 760px) {
    .contentOpen,
    .contentClosed { margin-left: 44px; }

    .backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 35;
        padding: 0;
        border: 0;
        background-color: color-mix(in srgb, var(--color-text-primary) 45%, transparent);
        cursor: pointer;
    }
}
</style>
