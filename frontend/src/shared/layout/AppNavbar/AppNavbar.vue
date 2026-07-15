<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import {
    API_BASE_URL,
    authenticatedNavbarLinks,
    guestNavbarLinks,
    icons,
    ThemeApp,
} from "@/config";
import type { ThemeMode } from "@/config/theme";
import { saveLocale, type SupportedLocale } from "@/i18n";
import { useThemeStore, useUserStore } from "@/stores";
import { AuthCard } from "@/features/auth/components";
import { SecondaryButton } from "@/shared/ui/buttons";
import { ToggleSwitch } from "@/shared/ui/toggles";

interface Props {
    adminToolsEnabled?: boolean;
}

withDefaults(defineProps<Props>(), {
    adminToolsEnabled: true,
});

const emit = defineEmits<{
    "update:adminToolsEnabled": [value: boolean];
}>();

type AuthMode = "login" | "register";
type OAuthProvider = "google" | "discord" | "github";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const themeStore = useThemeStore();
const { selectedTheme } = storeToRefs(themeStore);
const { locale } = useI18n();

const isMenuOpen = ref(false);
const isProfileOpen = ref(false);
const authMode = ref<AuthMode | null>(null);
const profileMenu = ref<HTMLElement | null>(null);
const walletBalanceSatang = ref(0);
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const agreementAccepted = ref(false);
const passwordMismatch = ref(false);
const sheetDragY = ref(0);
const isDraggingSheet = ref(false);
let sheetPointerId: number | null = null;
let sheetDragStartY = 0;
let sheetDragStartedAt = 0;
const CREDENTIALS_ENABLED = false as const;
const WALLET_BALANCE_CHANGED_EVENT = "fujipp:wallet-balance-changed";

const isAuthenticated = computed(() => userStore.isAuthenticated);
const navigationLinks = computed(() => (
    isAuthenticated.value ? authenticatedNavbarLinks : guestNavbarLinks
));
const avatarSrc = computed(() => userStore.profile?.avatarUrl || "/brand/avatar-default.svg");
const displayName = computed(() => (
    userStore.profile?.displayName
    || userStore.profile?.username
    || userStore.user?.user_metadata?.full_name
    || userStore.profile?.email?.split("@")[0]
    || "username"
));
const displayEmail = computed(() => userStore.profile?.email || userStore.user?.email || "");
const formattedCredit = computed(() => (
    `${(walletBalanceSatang.value / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} THB`
));
const accountPath = computed(() => userStore.isAdmin ? "/shop/admin" : "/store");
const currentLocale = computed<SupportedLocale>(() => locale.value === "th" ? "th" : "en");
const authError = computed(() => passwordMismatch.value ? "Passwords do not match" : userStore.error ?? "");

function closeOverlays(): void {
    isMenuOpen.value = false;
    isProfileOpen.value = false;
    authMode.value = null;
}

function startSheetDrag(event: PointerEvent): void {
    if (window.innerWidth > 767 || !event.isPrimary) return;
    if (!(event.target as HTMLElement).closest("[data-sheet-handle]")) return;

    sheetPointerId = event.pointerId;
    sheetDragStartY = event.clientY;
    sheetDragStartedAt = performance.now();
    sheetDragY.value = 0;
    isDraggingSheet.value = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function moveSheetDrag(event: PointerEvent): void {
    if (sheetPointerId !== event.pointerId) return;
    sheetDragY.value = Math.max(0, event.clientY - sheetDragStartY);
}

function endSheetDrag(event: PointerEvent): void {
    if (sheetPointerId !== event.pointerId) return;

    const elapsed = Math.max(performance.now() - sheetDragStartedAt, 1);
    const velocity = sheetDragY.value / elapsed;
    const shouldClose = sheetDragY.value >= Math.min(120, window.innerHeight * 0.12)
        || (sheetDragY.value > 24 && velocity > 0.65);

    sheetPointerId = null;
    isDraggingSheet.value = false;

    if (shouldClose) {
        closeOverlays();
        window.setTimeout(() => { sheetDragY.value = 0; }, 280);
    } else {
        sheetDragY.value = 0;
    }
}

function openAuth(mode: AuthMode): void {
    isMenuOpen.value = false;
    isProfileOpen.value = false;
    userStore.clearError();
    passwordMismatch.value = false;
    authMode.value = mode;
}

function switchAuthMode(mode: AuthMode): void {
    userStore.clearError();
    username.value = "";
    password.value = "";
    confirmPassword.value = "";
    agreementAccepted.value = false;
    passwordMismatch.value = false;
    authMode.value = mode;
}

async function handleOAuth(provider: OAuthProvider): Promise<void> {
    await userStore.signInWithOAuth(provider, route.fullPath);
}

async function handleAuthSubmit(): Promise<void> {
    if (!CREDENTIALS_ENABLED || userStore.isLoading || !authMode.value) return;
    if (authMode.value === "login") {
        if (!username.value.trim() || !password.value) return;
        if (await userStore.signInWithUsername(username.value.trim(), password.value)) closeOverlays();
        return;
    }
    if (!username.value.trim() || !password.value || !confirmPassword.value || !agreementAccepted.value) return;
    if (password.value !== confirmPassword.value) {
        passwordMismatch.value = true;
        return;
    }
    passwordMismatch.value = false;
    if (await userStore.signUpWithUsername(username.value.trim(), password.value)) closeOverlays();
}

function toggleMenu(): void {
    isProfileOpen.value = false;
    isMenuOpen.value = !isMenuOpen.value;
}

function toggleProfile(): void {
    isMenuOpen.value = false;
    isProfileOpen.value = !isProfileOpen.value;
}

function selectTheme(theme: ThemeMode): void {
    themeStore.setTheme(theme);
}

function selectLanguage(language: SupportedLocale): void {
    locale.value = language;
    saveLocale(language);
}

function formatMobileLabel(label: string): string {
    return label.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function handleLogout(): Promise<void> {
    closeOverlays();
    // Leave the protected Shop route before clearing auth. Otherwise App.vue
    // correctly treats the session loss as an expired session and preserves
    // the current path in /login?redirect=... instead of completing logout.
    await router.replace({ name: "home" });
    await userStore.signOut();
}

async function loadWalletBalance(): Promise<void> {
    if (!userStore.isAuthenticated || !userStore.accessToken) {
        walletBalanceSatang.value = 0;
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/wallet`, {
            headers: { Authorization: `Bearer ${userStore.accessToken}` },
        });

        if (!response.ok) return;
        const wallet = await response.json() as { balanceSatang?: number };
        walletBalanceSatang.value = wallet.balanceSatang ?? 0;
    } catch {
        walletBalanceSatang.value = 0;
    }
}

function closeOnOutsideClick(event: MouseEvent): void {
    if (window.matchMedia("(min-width: 768px)").matches && !profileMenu.value?.contains(event.target as Node)) {
        isProfileOpen.value = false;
    }
}

function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") closeOverlays();
}

function handleWalletBalanceChanged(): void {
    void loadWalletBalance();
}

watch(() => route.fullPath, closeOverlays);
watch(
    [() => userStore.isAuthenticated, () => userStore.accessToken],
    () => { void loadWalletBalance(); },
    { immediate: true },
);
watch(
    () => isMenuOpen.value || isProfileOpen.value || authMode.value !== null,
    (isOpen) => {
        if (typeof document !== "undefined") {
            const isMobile = window.matchMedia("(max-width: 767px)").matches;
            document.body.style.overflow = isOpen && (isMobile || authMode.value !== null) ? "hidden" : "";
        }
    },
);

onMounted(() => {
    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener(WALLET_BALANCE_CHANGED_EVENT, handleWalletBalanceChanged);
});

onUnmounted(() => {
    document.removeEventListener("click", closeOnOutsideClick);
    document.removeEventListener("keydown", closeOnEscape);
    window.removeEventListener(WALLET_BALANCE_CHANGED_EVENT, handleWalletBalanceChanged);
    document.body.style.overflow = "";
});
</script>

<template>
    <header :class="$style.navbar">
        <div :class="$style.navbarContainer">
            <div :class="$style.leftSide">
                <button
                    type="button"
                    :class="$style.burgerButton"
                    :aria-expanded="isMenuOpen"
                    aria-label="Open navigation"
                    @click.stop="toggleMenu"
                >
                    <span
                        :class="$style.maskIcon"
                        :style="{ '--navbar-icon': `url(${icons.hamburgerOpen})` }"
                        aria-hidden="true"
                    />
                </button>

                <RouterLink to="/" :class="$style.logo" aria-label="Fujipp home">
                    <span :class="$style.logoMark" aria-hidden="true" />
                </RouterLink>

                <nav :class="$style.desktopNavigation" aria-label="Main navigation">
                    <RouterLink
                        v-for="link in navigationLinks"
                        :key="link.path"
                        v-slot="{ href, navigate, isExactActive }"
                        :to="link.path"
                        custom
                    >
                        <a
                            :href="href"
                            :class="[$style.desktopLink, isExactActive ? $style.activeDesktopLink : '']"
                            @click="navigate"
                        >
                            <span>{{ link.label }}</span>
                            <span :class="$style.activeIndicator" aria-hidden="true" />
                        </a>
                    </RouterLink>
                </nav>
            </div>

            <div v-if="!isAuthenticated" :class="$style.guestActions">
                <button
                    type="button"
                    :class="$style.signInLink"
                    @click="openAuth('login')"
                >
                    Sign in
                </button>
                <button
                    type="button"
                    :class="$style.signUpLink"
                    @click="openAuth('register')"
                >
                    Sign up
                </button>
            </div>

            <div v-else ref="profileMenu" :class="$style.profileArea">
                <button
                    type="button"
                    :class="$style.creditProfileButton"
                    :aria-expanded="isProfileOpen"
                    aria-haspopup="dialog"
                    aria-label="Open profile settings"
                    @click.stop="toggleProfile"
                >
                    <span :class="$style.creditText">{{ formattedCredit }}</span>
                    <img
                        :class="$style.profileImage"
                        :src="avatarSrc"
                        alt=""
                        aria-hidden="true"
                        @error="($event.target as HTMLImageElement).src = '/brand/avatar-default.svg'"
                    >
                </button>

                <section
                    v-if="isProfileOpen"
                    :class="$style.desktopProfileDialog"
                    role="dialog"
                    aria-label="Profile settings"
                >
                    <div :class="$style.profileRow">
                        <img
                            :class="$style.profileImage"
                            :src="avatarSrc"
                            alt=""
                            aria-hidden="true"
                            @error="($event.target as HTMLImageElement).src = '/brand/avatar-default.svg'"
                        >
                        <div :class="$style.profileText">
                            <strong :class="$style.username">{{ displayName }}</strong>
                            <span :class="$style.email">{{ displayEmail }}</span>
                        </div>
                    </div>
                    <div :class="$style.divider" />
                    <div :class="$style.settingRow">
                        <span>Theme</span>
                        <div :class="$style.optionButtons">
                            <button
                                v-for="theme in ThemeApp"
                                :key="theme.mode"
                                type="button"
                                :class="[$style.iconOption, selectedTheme === theme.mode ? $style.selectedThemeOption : '']"
                                :aria-pressed="selectedTheme === theme.mode"
                                :aria-label="`Use ${theme.mode.toLowerCase()} theme`"
                                @click="selectTheme(theme.mode)"
                            >
                                <span
                                    :class="$style.maskIcon"
                                    :style="{ '--navbar-icon': `url(${theme.src})` }"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                    </div>
                    <div :class="$style.settingRow">
                        <span>Language</span>
                        <div :class="$style.languageButtons">
                            <button
                                type="button"
                                :class="$style.iconOption"
                                aria-label="Use Thai"
                                :aria-pressed="currentLocale === 'th'"
                                @click="selectLanguage('th')"
                            >
                                <img :src="icons.languageThai" alt="" aria-hidden="true">
                            </button>
                            <button
                                type="button"
                                :class="$style.iconOption"
                                aria-label="Use English"
                                :aria-pressed="currentLocale === 'en'"
                                @click="selectLanguage('en')"
                            >
                                <img :src="icons.languageUs" alt="" aria-hidden="true">
                            </button>
                        </div>
                    </div>
                    <div v-if="userStore.isAdmin" :class="$style.divider" />
                    <div v-if="userStore.isAdmin" :class="$style.settingRow">
                        <span>Tools</span>
                        <ToggleSwitch
                            :model-value="adminToolsEnabled"
                            aria-label="Show admin tools"
                            @update:model-value="emit('update:adminToolsEnabled', $event)"
                        />
                    </div>
                    <RouterLink :to="accountPath" :class="$style.manageAccount" @click="closeOverlays">
                        <span>Manage Account</span>
                        <span
                            :class="$style.maskIcon"
                            :style="{ '--navbar-icon': `url(${icons.directionRight})` }"
                            aria-hidden="true"
                        />
                    </RouterLink>
                    <SecondaryButton @click="handleLogout">Sign out</SecondaryButton>
                </section>
            </div>
        </div>
    </header>

    <Transition
        :enter-active-class="$style.fadeTransition"
        :leave-active-class="$style.fadeTransition"
        :enter-from-class="$style.fadeHidden"
        :leave-to-class="$style.fadeHidden"
    >
        <button
            v-if="isMenuOpen || isProfileOpen"
            type="button"
            :class="$style.mobileBackdrop"
            aria-label="Close navigation overlay"
            @click="closeOverlays"
        />
    </Transition>

    <Transition
        :enter-active-class="$style.drawerTransition"
        :leave-active-class="$style.drawerTransition"
        :enter-from-class="$style.drawerHidden"
        :leave-to-class="$style.drawerHidden"
    >
        <aside v-if="isMenuOpen" :class="$style.mobileDrawer" aria-label="Mobile navigation">
            <div :class="$style.drawerHeader">
                <div :class="$style.portalBrand">
                    <RouterLink to="/" :class="$style.logo" aria-label="Fujipp home" @click="closeOverlays">
                        <span :class="$style.logoMark" aria-hidden="true" />
                    </RouterLink>
                    <span :class="$style.portalText">PORTAL</span>
                </div>
                <button type="button" :class="$style.drawerClose" aria-label="Close navigation" @click="closeOverlays">
                    <span
                        :class="$style.maskIcon"
                        :style="{ '--navbar-icon': `url(${icons.hamburgerClose})` }"
                        aria-hidden="true"
                    />
                </button>
            </div>

            <nav :class="$style.drawerLinks">
                <RouterLink
                    v-for="link in navigationLinks"
                    :key="link.path"
                    :to="link.path"
                    :class="$style.drawerLink"
                    :exact-active-class="$style.activeDrawerLink"
                    @click="closeOverlays"
                >
                    <span :class="$style.drawerLinkMain">
                        <span
                            :class="$style.maskIcon"
                            :style="{ '--navbar-icon': `url(${link.icon})` }"
                            aria-hidden="true"
                        />
                        <span>{{ formatMobileLabel(link.label) }}</span>
                    </span>
                    <span
                        :class="$style.maskIcon"
                        :style="{ '--navbar-icon': `url(${icons.directionRight})` }"
                        aria-hidden="true"
                    />
                </RouterLink>
            </nav>

            <SecondaryButton
                v-if="!isAuthenticated"
                :class="$style.drawerSignUp"
                @click="openAuth('register')"
            >
                Sign up
            </SecondaryButton>
        </aside>
    </Transition>

    <Transition
        :enter-active-class="$style.sheetTransition"
        :leave-active-class="$style.sheetTransition"
        :enter-from-class="$style.sheetHidden"
        :leave-to-class="$style.sheetHidden"
    >
        <section
            v-if="isAuthenticated && isProfileOpen"
            :class="[$style.mobileProfileSheet, isDraggingSheet ? $style.sheetDragging : '']"
            :style="{ '--sheet-drag-y': `${sheetDragY}px` }"
            role="dialog"
            aria-modal="true"
            aria-label="Profile settings"
            @pointerdown="startSheetDrag"
            @pointermove="moveSheetDrag"
            @pointerup="endSheetDrag"
            @pointercancel="endSheetDrag"
        >
            <button :class="$style.sheetHandle" type="button" data-sheet-handle aria-label="ลากลงเพื่อปิด">
                <span :class="$style.sheetIndicator" aria-hidden="true" />
            </button>
            <div :class="$style.sheetHeader">
                <span>Setting</span>
                <button type="button" :class="$style.sheetClose" aria-label="Close profile settings" @click="closeOverlays">
                    <span
                        :class="$style.maskIcon"
                        :style="{ '--navbar-icon': `url(${icons.directionDown})` }"
                        aria-hidden="true"
                    />
                </button>
            </div>
            <div :class="$style.mobileProfileCard">
                <img
                    :class="$style.profileImage"
                    :src="avatarSrc"
                    alt=""
                    aria-hidden="true"
                    @error="($event.target as HTMLImageElement).src = '/brand/avatar-default.svg'"
                >
                <div :class="$style.mobileProfileText">
                    <strong>{{ displayName }}</strong>
                    <span :class="$style.email">{{ displayEmail }}</span>
                </div>
            </div>
            <div :class="$style.divider" />
            <div :class="$style.settingRow">
                <span>Theme</span>
                <div :class="$style.optionButtons">
                    <button
                        v-for="theme in ThemeApp"
                        :key="theme.mode"
                        type="button"
                        :class="[$style.iconOption, selectedTheme === theme.mode ? $style.selectedThemeOption : '']"
                        :aria-pressed="selectedTheme === theme.mode"
                        :aria-label="`Use ${theme.mode.toLowerCase()} theme`"
                        @click="selectTheme(theme.mode)"
                    >
                        <span
                            :class="$style.maskIcon"
                            :style="{ '--navbar-icon': `url(${theme.src})` }"
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>
            <div :class="$style.settingRow">
                <span>Language</span>
                <div :class="$style.languageButtons">
                    <button type="button" :class="$style.iconOption" aria-label="Use Thai" :aria-pressed="currentLocale === 'th'" @click="selectLanguage('th')">
                        <img :src="icons.languageThai" alt="" aria-hidden="true">
                    </button>
                    <button type="button" :class="$style.iconOption" aria-label="Use English" :aria-pressed="currentLocale === 'en'" @click="selectLanguage('en')">
                        <img :src="icons.languageUs" alt="" aria-hidden="true">
                    </button>
                </div>
            </div>
            <div v-if="userStore.isAdmin" :class="$style.divider" />
            <div v-if="userStore.isAdmin" :class="$style.settingRow">
                <span>Tools</span>
                <ToggleSwitch
                    :model-value="adminToolsEnabled"
                    aria-label="Show admin tools"
                    @update:model-value="emit('update:adminToolsEnabled', $event)"
                />
            </div>
            <RouterLink :to="accountPath" :class="$style.manageAccount" @click="closeOverlays">
                <span>Manage Account</span>
                <span :class="$style.maskIcon" :style="{ '--navbar-icon': `url(${icons.directionRight})` }" aria-hidden="true" />
            </RouterLink>
            <SecondaryButton @click="handleLogout">Sign out</SecondaryButton>
        </section>
    </Transition>

    <Teleport to="body">
        <Transition
            :enter-active-class="$style.authTransition"
            :leave-active-class="$style.authTransition"
            :enter-from-class="$style.authHidden"
            :leave-to-class="$style.authHidden"
        >
            <div
                v-if="authMode"
                :class="$style.authOverlay"
                role="presentation"
                @click.self="closeOverlays"
            >
                <AuthCard
                    :class="[$style.authDialog, isDraggingSheet ? $style.sheetDragging : '']"
                    :style="{ '--sheet-drag-y': `${sheetDragY}px` }"
                    :mode="authMode"
                    modal
                    v-model:username="username"
                    v-model:password="password"
                    v-model:confirm-password="confirmPassword"
                    v-model:remember="agreementAccepted"
                    :loading="userStore.isLoading"
                    :error="authError"
                    :credentials-enabled="CREDENTIALS_ENABLED"
                    role="dialog"
                    aria-modal="true"
                    @pointerdown="startSheetDrag"
                    @pointermove="moveSheetDrag"
                    @pointerup="endSheetDrag"
                    @pointercancel="endSheetDrag"
                    @oauth="handleOAuth"
                    @submit="handleAuthSubmit"
                    @switch-mode="switchAuthMode"
                    @back="closeOverlays"
                />
            </div>
        </Transition>
    </Teleport>
</template>

<style module>
.navbar {
    position: fixed;
    z-index: 50;
    top: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    background: var(--color-nav-background);
    color: var(--color-nav-text);
    view-transition-name: app-navbar;
}

.navbarContainer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    width: 100%;
    max-width: 1280px;
    min-height: 63px;
    margin: 0 auto;
    padding: 12px 16px;
    gap: 20px;
}

.leftSide,
.guestActions,
.profileArea,
.portalBrand,
.drawerLinkMain,
.profileRow,
.settingRow,
.optionButtons,
.languageButtons {
    display: flex;
    align-items: center;
}

.leftSide { gap: 16px; }
.guestActions { justify-content: center; gap: 16px; }
.profileArea { position: relative; }

.logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: var(--radius-base);
}

.logoMark {
    width: 32px;
    height: 28px;
    background: currentColor;
    mask: url("/brand/fujipp-logo.svg") center / contain no-repeat;
    -webkit-mask: url("/brand/fujipp-logo.svg") center / contain no-repeat;
}

.desktopNavigation {
    display: flex;
    align-items: center;
    min-height: 39px;
    gap: 16px;
}

.desktopLink {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 39px;
    color: var(--color-nav-text);
    font-size: var(--type-size-button);
    font-weight: 600;
    line-height: normal;
    text-decoration: none;
}

.activeIndicator {
    width: 24px;
    height: 4px;
    border-radius: var(--radius-sm);
    background: transparent;
    transition: background-color 160ms ease;
}

.activeDesktopLink .activeIndicator { background: var(--color-nav-text); }

.signInLink {
    box-sizing: border-box;
    padding: 10px;
    border: 0;
    border-radius: var(--radius-xl);
    background: transparent;
    color: var(--color-nav-text);
    font-family: inherit;
    font-size: var(--type-size-button);
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition:
        background-color 180ms ease,
        color 180ms ease,
        transform 120ms ease;
}

.signUpLink {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 110px;
    padding: 10px;
    overflow: hidden;
    border: 1px solid var(--color-nav-text);
    border-radius: var(--radius-xl);
    background: transparent;
    color: var(--color-nav-text);
    font-family: inherit;
    font-size: var(--type-size-button);
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition:
        background-color 180ms ease,
        color 180ms ease,
        transform 120ms ease;
}

.signInLink:hover,
.signInLink:focus-visible,
.signUpLink:hover,
.signUpLink:focus-visible {
    background: var(--color-nav-text);
    color: var(--color-nav-background);
}

.signInLink:active,
.signUpLink:active {
    transform: scale(0.97);
}

.creditProfileButton {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    box-sizing: border-box;
    height: 39px;
    padding: 3px 6px 3px 12px;
    gap: 4px;
    overflow: hidden;
    border: 1px solid var(--color-nav-divider);
    border-radius: var(--radius-xl);
    background: transparent;
    color: var(--color-nav-text);
    cursor: pointer;
}

.creditText { font-size: var(--type-size-button); font-weight: 600; }
.profileImage { width: 32px; height: 32px; flex-shrink: 0; border-radius: var(--radius-full); object-fit: cover; }

.desktopProfileDialog {
    position: absolute;
    z-index: 70;
    top: calc(100% + 8px);
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    box-sizing: border-box;
    width: 320px;
    padding: 12px 16px;
    gap: 8px;
    overflow: hidden;
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-xl);
    background: var(--color-dialog-background);
    color: var(--color-dialog-text-primary);
    box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
}

.profileRow { gap: 8px; text-align: left; }
.profileText { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }
.username { max-width: 230px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--type-size-button); }
.email { color: var(--color-dialog-text-secondary); font-size: var(--type-size-support); }
.divider { width: 100%; height: 1px; background: var(--color-dialog-divider); }
.settingRow { justify-content: space-between; min-height: 32px; gap: 20px; font-size: var(--type-size-button); font-weight: 600; }
.optionButtons { justify-content: flex-end; gap: 4px; }
.languageButtons { justify-content: flex-end; gap: 8px; }


.iconOption,
.sheetClose,
.drawerClose,
.burgerButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
}

.iconOption {
    position: relative;
    isolation: isolate;
    width: 32px;
    height: 32px;
    padding: 4px;
    overflow: hidden;
    border-radius: var(--radius-base);
    transition:
        background-color 160ms ease,
        box-shadow 160ms ease,
        transform 120ms ease;
}
.iconOption > * { position: relative; z-index: 1; }
.iconOption img { width: 24px; height: 24px; }
.iconOption:hover { background: color-mix(in srgb, var(--color-dialog-text-primary) 7%, transparent); }
.iconOption:active { transform: scale(0.94); }

.selectedThemeOption {
    background: transparent;
    box-shadow: 0 4px 4px rgb(0 0 0 / 10%);
    backdrop-filter: saturate(160%) contrast(105%);
    -webkit-backdrop-filter: saturate(160%) contrast(105%);
}

.selectedThemeOption::before,
.selectedThemeOption::after {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    content: "";
    pointer-events: none;
}

.selectedThemeOption::before {
    z-index: -2;
    background: linear-gradient(
        180deg,
        rgb(255 255 255 / 80%) 0%,
        rgb(255 255 255 / 18%) 18%,
        rgb(255 255 255 / 4%) 52%,
        rgb(255 255 255 / 14%) 100%
    );
    opacity: 0.32;
}

.selectedThemeOption::after {
    z-index: -1;
    border: 1px solid color-mix(in srgb, var(--color-button-primary) 38%, transparent);
    background: linear-gradient(180deg, transparent 45%, rgb(255 255 255 / 10%));
    box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 50%),
        inset 0 -1px 0 rgb(255 255 255 / 12%);
}
.maskIcon { display: inline-block; width: 24px; height: 24px; flex-shrink: 0; background: currentColor; mask: var(--navbar-icon) center / contain no-repeat; -webkit-mask: var(--navbar-icon) center / contain no-repeat; }

.manageAccount {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 32px;
    color: inherit;
    font-size: var(--type-size-button);
    font-weight: 600;
    text-decoration: none;
}

.logo:focus-visible,
.desktopLink:focus-visible,
.signInLink:focus-visible,
.signUpLink:focus-visible,
.creditProfileButton:focus-visible,
.iconOption:focus-visible,
.manageAccount:focus-visible,
.burgerButton:focus-visible,
.drawerClose:focus-visible,
.drawerLink:focus-visible,
.sheetClose:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.burgerButton { display: none; width: 32px; height: 32px; padding: 0; }
.mobileBackdrop,
.mobileDrawer,
.mobileProfileSheet { display: none; }

.fadeTransition { transition: opacity 220ms ease; }
.fadeHidden { opacity: 0; }
.drawerTransition { transition: transform 260ms ease; }
.drawerHidden { transform: translateX(-100%); }
.sheetTransition { transition: transform 280ms ease; }
.sheetHidden { transform: translateY(100%); }
.sheetDragging { transition: none !important; }

.authOverlay {
    position: fixed;
    z-index: 200;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 24px 16px;
    background: rgb(0 0 0 / 25%);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

.authDialog {
    width: min(100%, 680px);
    max-width: 680px;
    box-shadow: 0 16px 48px rgb(0 0 0 / 22%);
}

.authTransition { transition: opacity 220ms ease; }
.authTransition .authDialog { transition: transform 280ms ease, opacity 220ms ease; }
.authHidden { opacity: 0; }
.authHidden .authDialog { opacity: 0; transform: translateY(16px) scale(.98); }

@media (max-width: 767px) {
    .navbarContainer { min-height: 55px; padding: 8px 12px; }
    .leftSide { gap: 12px; }
    .burgerButton { display: inline-flex; }
    .desktopNavigation,
    .signUpLink,
    .desktopProfileDialog { display: none; }
    .guestActions { gap: 0; }
    .signInLink { padding: 10px; border: 1px solid var(--color-nav-text); }

    .authOverlay { align-items: flex-end; padding: 0; }
    .authDialog { width: 100%; max-width: none; box-shadow: 0 -12px 36px rgb(0 0 0 / 18%); transform: translateY(var(--sheet-drag-y, 0)); }
    .authHidden .authDialog { transform: translateY(100%); }

    .mobileBackdrop {
        position: fixed;
        z-index: 60;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        padding: 0;
        border: 0;
        background: rgb(0 0 0 / 50%);
        backdrop-filter: blur(13px);
        -webkit-backdrop-filter: blur(13px);
    }

    .mobileDrawer {
        position: fixed;
        z-index: 70;
        top: 0;
        bottom: 0;
        left: 0;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        width: min(82vw, 320px);
        padding: 8px 12px;
        gap: 4px;
        background: var(--color-nav-background);
        color: var(--color-nav-text);
        box-shadow: 4px 0 4px rgb(0 0 0 / 25%);
    }

    .drawerHeader { display: flex; align-items: center; justify-content: space-between; min-height: 39px; gap: 20px; }
    .portalBrand { gap: 12px; }
    .portalText { font-family: var(--font-rammetto-one); font-size: var(--type-size-button); }
    .drawerClose { width: 32px; height: 32px; padding: 0; }
    .drawerLinks { display: flex; flex-direction: column; gap: 4px; }
    .drawerLink {
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-sizing: border-box;
        min-height: 40px;
        padding: 4px 8px;
        border-radius: var(--radius-lg);
        color: inherit;
        font-size: var(--type-size-button);
        font-weight: 600;
        text-decoration: none;
        transition:
            background-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease;
    }
    .drawerLinkMain { gap: 4px; }
    .drawerLink > .maskIcon { transition: transform 180ms ease; }
    .drawerLink:hover,
    .drawerLink:focus-visible {
        background: var(--color-nav-background-selected);
        transform: translateX(4px);
    }
    .drawerLink:hover > .maskIcon,
    .drawerLink:focus-visible > .maskIcon { transform: translateX(3px); }
    .activeDrawerLink {
        background: var(--color-nav-background-selected);
        box-shadow: inset 3px 0 0 var(--color-nav-text);
    }
    .drawerLink:active { transform: translateX(4px) scale(0.98); }
    .drawerSignUp { margin-top: 4px; }

    .mobileProfileSheet {
        position: fixed;
        z-index: 70;
        right: 0;
        bottom: 0;
        left: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        box-sizing: border-box;
        width: 100%;
        height: max(356px, 50dvh);
        min-height: 356px;
        max-height: calc(100dvh - 32px);
        padding: 8px 12px;
        gap: 8px;
        overflow-y: auto;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        background: var(--color-dialog-background);
        color: var(--color-dialog-text-primary);
        box-shadow: 0 -8px 24px rgb(0 0 0 / 14%);
        transform: translateY(var(--sheet-drag-y, 0));
    }

    .mobileProfileSheet.sheetHidden { transform: translateY(100%); }

    .sheetHandle { display: flex; align-items: center; justify-content: center; align-self: stretch; min-height: var(--spacing-space-4); padding: 0; border: 0; background: transparent; cursor: grab; touch-action: none; }
    .sheetHandle:active { cursor: grabbing; }
    .sheetHandle:focus-visible { outline: 2px solid var(--color-main-primary); outline-offset: 2px; }
    .sheetIndicator { align-self: center; width: 24px; height: 4px; border-radius: var(--radius-sm); background: var(--color-dialog-text-primary); }
    .sheetHeader { display: flex; align-items: center; justify-content: space-between; min-height: 32px; font-size: var(--type-size-button); font-weight: 600; }
    .sheetClose { width: 32px; height: 32px; padding: 4px; }
    .mobileProfileCard { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 12px; gap: 4px; border-radius: var(--radius-xl); background: var(--color-dialog-background-selected); color: var(--color-input-text); }
    .mobileProfileText { display: flex; flex-direction: column; align-items: center; gap: 4px; }
}

@media (prefers-reduced-motion: reduce) {
    .fadeTransition,
    .drawerTransition,
    .sheetTransition { transition: none; }
}
</style>
