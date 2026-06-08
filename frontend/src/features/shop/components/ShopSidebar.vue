<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter, type RouteLocationRaw } from "vue-router";
import PrimaryButton from "@/shared/ui/buttons/PrimaryButton.vue";
import ThemeButton from "@/shared/ui/buttons/ThemeButton.vue";
import { useUserStore } from "@/stores";

const SHOP_SIDEBAR_STORAGE_KEY = "fujipp:shop-sidebar-open";

export interface ShopSidebarItem {
    label: string;
    icon: string;
    to?: RouteLocationRaw;
}

interface Props {
    items?: readonly ShopSidebarItem[];
    modelValue?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: true,
    items: () => [
        { label: "Dashboard", icon: "/images/icons/sidebar/home.svg", to: { name: "shop-dashboard" } },
        { label: "Package", icon: "/images/icons/sidebar/package.svg", to: { name: "shop-package" } },
        { label: "Wallet", icon: "/images/icons/sidebar/wallet.svg", to: { name: "shop-wallet" } },
        { label: "History", icon: "/images/icons/sidebar/history.svg" },
    ],
});

const emit = defineEmits<{
    "update:modelValue": [isOpen: boolean];
    select: [item: ShopSidebarItem];
}>();

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { isAuthenticated, profile, user } = storeToRefs(userStore);

const isOpen = computed(() => props.modelValue);
const signInRoute = computed<RouteLocationRaw>(() => ({
    name: "login",
    query: { redirect: "/shop" },
}));
const username = computed(() => (
    profile.value?.username
    ?? profile.value?.displayName
    ?? user.value?.email?.split("@")[0]
    ?? "admin"
));
const uid = computed(() => `#${user.value?.id.slice(0, 8) ?? "uid"}`);

function readStoredSidebarState(): boolean | null {
    if (typeof window === "undefined") return null;

    const storedState = window.localStorage.getItem(SHOP_SIDEBAR_STORAGE_KEY);
    if (storedState === "true") return true;
    if (storedState === "false") return false;

    return null;
}

function saveSidebarState(value: boolean): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SHOP_SIDEBAR_STORAGE_KEY, String(value));
}

function toggleSidebar(): void {
    emit("update:modelValue", !isOpen.value);
}

function selectItem(item: ShopSidebarItem): void {
    emit("select", item);
}

function isRouteActive(item: ShopSidebarItem): boolean {
    if (!item.to || typeof item.to === "string") return false;
    if ("name" in item.to && item.to.name) return route.name === item.to.name;

    return "path" in item.to && item.to.path ? route.path === item.to.path : false;
}

async function handleLogOut(): Promise<void> {
    await userStore.signOut();
    await router.push({ name: "home" });
}

onMounted(() => {
    const storedState = readStoredSidebarState();
    if (storedState !== null && storedState !== isOpen.value) {
        emit("update:modelValue", storedState);
    }
});

watch(isOpen, (value) => {
    saveSidebarState(value);
});
</script>

<template>
    <aside
        :class="[$style.shopSidebar, isOpen ? $style.open : $style.closed]"
        :aria-label="isOpen ? 'Shop sidebar' : 'Collapsed shop sidebar'"
    >
        <template v-if="isOpen">
            <div :class="$style.mainGroup">
                <div :class="$style.brandGroup">
                    <div :class="$style.brandRow">
                        <RouterLink to="/" :class="$style.brand" aria-label="Fujipp home">
                            <img
                                src="/images/icons/navbar/fujipp.svg"
                                alt=""
                                aria-hidden="true"
                                :class="$style.brandIcon"
                                draggable="false"
                            >
                        </RouterLink>
                        <button
                            type="button"
                            :class="$style.toggleButton"
                            aria-label="Collapse shop sidebar"
                            @click="toggleSidebar"
                        >
                            <img
                                src="/images/icons/sidebar/sidebar-close.svg"
                                alt=""
                                aria-hidden="true"
                                :class="$style.toggleIcon"
                            >
                        </button>
                    </div>
                    <div :class="$style.divider" aria-hidden="true" />
                </div>

                <ThemeButton />

                <nav :class="$style.navigation" aria-label="Shop navigation">
                    <component
                        :is="item.to ? 'RouterLink' : 'button'"
                        v-for="item in items"
                        :key="item.label"
                        :to="item.to"
                        :type="item.to ? undefined : 'button'"
                        :class="[$style.navItem, isRouteActive(item) ? $style.navItemActive : '']"
                        :aria-current="isRouteActive(item) ? 'page' : undefined"
                        @click="selectItem(item)"
                    >
                        <span :class="$style.navTitle">
                            <img :src="item.icon" alt="" aria-hidden="true" :class="$style.navIcon">
                            <span :class="$style.navLabel">{{ item.label }}</span>
                        </span>
                    </component>
                </nav>
            </div>

            <div :class="[$style.userPanel, !isAuthenticated ? $style.guestPanel : '']">
                <template v-if="isAuthenticated">
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
                        :class="$style.logoutButton"
                        aria-label="Sign out"
                        :disabled="userStore.isLoading"
                        @click="handleLogOut"
                    >
                        <img
                            src="/images/icons/sidebar/logout.svg"
                            alt=""
                            aria-hidden="true"
                            :class="$style.logoutIcon"
                        >
                    </button>
                </template>

                <template v-else>
                    <PrimaryButton :to="signInRoute">Sign in</PrimaryButton>
                </template>
            </div>
        </template>

        <button
            v-else
            type="button"
            :class="$style.collapsedToggle"
            aria-label="Expand shop sidebar"
            @click="toggleSidebar"
        >
            <img
                src="/images/icons/sidebar/sidebar-open.svg"
                alt=""
                aria-hidden="true"
                :class="$style.toggleIcon"
            >
        </button>
    </aside>
</template>

<style module>
.shopSidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    width: 194px;
    height: 100dvh;
    min-height: 100vh;
    padding: 10px;
    overflow-y: auto;
    overscroll-behavior: contain;
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    transition: width 180ms ease;
}

.open {
    width: 194px;
    justify-content: space-between;
    gap: 10px;
}

.closed {
    width: 44px;
}

.mainGroup,
.brandGroup,
.navigation {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.mainGroup {
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
    min-width: 0;
    color: var(--color-text-secondary);
    text-decoration: none;
}

.brandIcon {
    display: block;
    width: auto;
    max-width: 100%;
    height: 32px;
    user-select: none;
    -webkit-user-drag: none;
}

.divider {
    align-self: stretch;
    height: 1px;
    border-top: 1px solid var(--color-main-divider);
}

.toggleButton,
.collapsedToggle,
.logoutButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
}

.toggleButton {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    flex-shrink: 0;
}

.collapsedToggle {
    align-self: stretch;
    height: 38px;
    justify-content: center;
}

.toggleButton:focus-visible,
.collapsedToggle:focus-visible,
.logoutButton:focus-visible,
.navItem:focus-visible,
.brand:focus-visible {
    border-radius: var(--radius-sm);
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.toggleIcon {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    flex-shrink: 0;
    user-select: none;
    -webkit-user-drag: none;
}

.navigation {
    font-size: 16px;
}

.navItem {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    box-sizing: border-box;
    min-height: 36px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-xl);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 160ms ease;
}

.navItem:hover {
    background-color: var(--color-button-secondary-btn-hover);
}

.navItemActive {
    background-color: var(--color-button-secondary-btn-active);
}

.navItem:active {
    background-color: var(--color-button-secondary-btn-active);
}

.navTitle {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 36px;
    gap: 10px;
    padding: 8px 0;
}

.navIcon {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    flex-shrink: 0;
}

.navLabel {
    flex-shrink: 0;
    font-weight: 300;
    line-height: normal;
}

.userPanel {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 75px;
    padding: 10px 5px;
    gap: 10px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
}

.guestPanel {
    align-items: stretch;
    min-height: auto;
    padding: 0;
    border: 0;
}

.userInfo {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 10px;
}

.avatar,
.avatarFallback {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
}

.avatar {
    object-fit: cover;
}

.avatarFallback {
    background-color: var(--color-main-secondary);
}

.userText {
    min-width: 0;
}

.username,
.uid {
    max-width: 96px;
    overflow: hidden;
    font-size: 16px;
    font-weight: 300;
    line-height: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.uid {
    color: var(--color-text-disabled);
}

.logoutButton {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
}

.logoutButton:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.logoutIcon {
    width: var(--spacing-icon-xs);
    height: var(--spacing-icon-xs);
}
</style>
