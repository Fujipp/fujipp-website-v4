<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { icons, mobileNavbarLinks, navbarLinks, ThemeApp } from "@/config";
import { useThemeStore, useUserStore } from "@/stores";
import type { ThemeMode } from "@/config/theme";

const isMenuOpen = ref(false);
const isThemePickerOpen = ref(false);
const isProfileMenuOpen = ref(false);
const route = useRoute();

/* Login/Register from the profile menu return to the page the user was on. */
const authRedirectQuery = computed(() => {
    if (["login", "register"].includes(String(route.name))) return route.query;

    return { redirect: route.fullPath };
});

const userStore = useUserStore();
const avatarSrc = computed(() => userStore.profile?.avatarUrl || "/brand/avatar-default.svg");

async function handleLogout(): Promise<void> {
    isProfileMenuOpen.value = false;
    await userStore.signOut();
}
const profileMenu = ref<HTMLElement | null>(null);

function closeProfileMenuOnOutsideClick(event: MouseEvent): void {
    if (!profileMenu.value?.contains(event.target as Node)) {
        isProfileMenuOpen.value = false;
    }
}

function closeProfileMenuOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") {
        isProfileMenuOpen.value = false;
    }
}

onMounted(() => {
    document.addEventListener("click", closeProfileMenuOnOutsideClick);
    document.addEventListener("keydown", closeProfileMenuOnEscape);
});

onUnmounted(() => {
    document.removeEventListener("click", closeProfileMenuOnOutsideClick);
    document.removeEventListener("keydown", closeProfileMenuOnEscape);
});
const themeStore = useThemeStore();
const { selectedTheme } = storeToRefs(themeStore);

/* The icon the collapsed picker shows; leads selectedTheme while the apply is deferred. */
const displayedTheme = ref<ThemeMode>(selectedTheme.value);

watch(selectedTheme, (theme) => {
    displayedTheme.value = theme;
});

const themeTrackOffset = computed(() => {
    if (isThemePickerOpen.value) return 0;

    const selectedThemeIndex = ThemeApp.findIndex((theme) => theme.mode === displayedTheme.value);
    return -(selectedThemeIndex * 48);
});

let applyThemeTimer: ReturnType<typeof setTimeout> | undefined;

/* Apply the theme only after the picker finishes collapsing (300ms) —
   the full-page repaint of a theme switch otherwise eats the animation frames. */
function selectTheme(theme: ThemeMode) {
    isThemePickerOpen.value = false;
    displayedTheme.value = theme;

    if (applyThemeTimer) clearTimeout(applyThemeTimer);
    applyThemeTimer = setTimeout(() => {
        themeStore.setTheme(theme);
        applyThemeTimer = undefined;
    }, 300);
}

function handleThemeIconClick(theme: ThemeMode) {
    if (!isThemePickerOpen.value && displayedTheme.value === theme) {
        isThemePickerOpen.value = true;
        return;
    }

    selectTheme(theme);
}

/* Mobile: a single button cycles Light → Dark → System instead of the slide-out track. */
const displayedThemeIcon = computed(() => (
    ThemeApp.find((theme) => theme.mode === displayedTheme.value)?.src ?? icons.modeSystem
));

function cycleTheme() {
    const index = ThemeApp.findIndex((theme) => theme.mode === displayedTheme.value);
    const next = ThemeApp[(index + 1) % ThemeApp.length]!;

    /* No collapsing track on mobile, so apply immediately — repeated taps cycle right away. */
    if (applyThemeTimer) {
        clearTimeout(applyThemeTimer);
        applyThemeTimer = undefined;
    }

    displayedTheme.value = next.mode;
    themeStore.setTheme(next.mode);
}
</script>

<template>
    <header
        class="fixed top-0 left-0 box-border w-full z-50 bg-main-background transition-colors duration-300">
        <div class="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-space-5 px-space-4 py-space-3">
            <!-- Left: Burger + Logo + Menu -->
            <div class="flex items-center gap-[10px]">
                <button type="button"
                    class="flex size-[40px] flex-col items-center justify-center gap-[5px] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary md:hidden"
                    :aria-expanded="isMenuOpen" aria-label="Toggle menu" @click="isMenuOpen = !isMenuOpen">
                    <span aria-hidden="true"
                        class="block h-[2px] w-[22px] rounded-full bg-text-primary transition-transform duration-300 ease-in-out"
                        :class="isMenuOpen ? 'translate-y-[7px] rotate-45' : ''" />
                    <span aria-hidden="true"
                        class="block h-[2px] w-[22px] rounded-full bg-text-primary transition-[transform,opacity] duration-300 ease-in-out"
                        :class="isMenuOpen ? 'scale-x-0 opacity-0' : ''" />
                    <span aria-hidden="true"
                        class="block h-[2px] w-[22px] rounded-full bg-text-primary transition-transform duration-300 ease-in-out"
                        :class="isMenuOpen ? '-translate-y-[7px] -rotate-45' : ''" />
                </button>
                <RouterLink
                    to="/"
                    class="hidden items-center focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary md:inline-flex"
                    aria-label="Fujipp home"
                >
                    <span
                        aria-hidden="true"
                        class="inline-block h-[49px] w-[56px] bg-text-primary"
                        :style="{
                            mask: 'url(/brand/fujipp-logo.svg) center / contain no-repeat',
                            WebkitMask: 'url(/brand/fujipp-logo.svg) center / contain no-repeat',
                        }"
                    />
                </RouterLink>
                <nav class="hidden md:flex items-start gap-space-2" aria-label="Main navigation">
                    <RouterLink v-for="link in navbarLinks" :key="link.path" v-slot="{ href, navigate, isExactActive }"
                        :to="link.path" custom>
                        <a :href="href"
                            class="flex h-[44px] flex-col items-center gap-space-1 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
                            :class="isExactActive
                                ? 'type-button-sb text-text-primary'
                                : 'type-button-r font-light text-text-primary hover:text-text-secondary'"
                            @click="navigate">
                            <span class="flex h-9 items-center justify-center px-space-4 py-space-2">
                                {{ link.label }}
                            </span>
                            <span aria-hidden="true"
                                class="h-space-1 w-space-6 rounded-sm transition-colors"
                                :class="isExactActive ? 'bg-button-border' : 'bg-transparent'" />
                        </a>
                    </RouterLink>
                </nav>
            </div>
            <!-- Right: Theme Switcher + Profile -->
            <div class="flex items-center justify-end gap-space-2">
                <button type="button"
                    class="flex h-space-8 w-space-10 shrink-0 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary md:hidden"
                    :aria-label="`Theme: ${displayedTheme.toLowerCase()} — switch theme`"
                    @click="cycleTheme">
                    <span aria-hidden="true" class="inline-block size-icon-md bg-text-primary"
                        :style="{
                            mask: `url(${displayedThemeIcon}) center / contain no-repeat`,
                            WebkitMask: `url(${displayedThemeIcon}) center / contain no-repeat`,
                        }" />
                </button>
                <button type="button"
                    class="hidden h-space-8 shrink-0 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary md:flex"
                    :aria-expanded="isThemePickerOpen" aria-label="Choose theme"
                    @click="isThemePickerOpen = !isThemePickerOpen">
                    <span aria-hidden="true"
                        class="inline-block size-icon-md bg-text-primary transition-transform duration-300 ease-in-out"
                        :class="isThemePickerOpen ? 'rotate-180' : ''"
                        :style="{
                            mask: `url(${icons.slide}) center / contain no-repeat`,
                            WebkitMask: `url(${icons.slide}) center / contain no-repeat`,
                        }" />
                </button>
                <div class="hidden h-space-8 overflow-hidden transition-[width] duration-300 ease-in-out md:block"
                    :class="isThemePickerOpen ? 'w-[136px]' : 'w-space-10'">
                    <div class="flex items-center gap-space-2 transition-transform duration-300 ease-in-out"
                        :style="{ transform: `translateX(${themeTrackOffset}px)` }">
                        <button v-for="theme in ThemeApp" :key="theme.mode" type="button"
                            class="flex h-space-8 w-space-10 shrink-0 items-center justify-center rounded-sm transition-colors"
                            :aria-label="`Use ${theme.mode.toLowerCase()} theme`"
                            :aria-pressed="selectedTheme === theme.mode"
                            :tabindex="isThemePickerOpen || selectedTheme === theme.mode ? 0 : -1"
                            @click="handleThemeIconClick(theme.mode)">
                            <span aria-hidden="true" class="inline-block size-icon-md bg-text-primary"
                                :style="{
                                    mask: `url(${theme.src}) center / contain no-repeat`,
                                    WebkitMask: `url(${theme.src}) center / contain no-repeat`,
                                }" />
                        </button>
                    </div>
                </div>
                <div ref="profileMenu" class="relative">
                    <button type="button"
                        class="box-border flex size-[50px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-button-border bg-button-secondary transition-colors hover:border-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
                        :aria-expanded="isProfileMenuOpen" aria-haspopup="menu" aria-label="Account menu"
                        @click="isProfileMenuOpen = !isProfileMenuOpen">
                        <img :src="avatarSrc" alt="" aria-hidden="true"
                            class="size-full object-cover" draggable="false"
                            @error="($event.target as HTMLImageElement).src = '/brand/avatar-default.svg'">
                    </button>
                    <div v-if="isProfileMenuOpen" role="menu"
                        class="absolute right-0 top-[calc(100%+8px)] z-50 box-border flex min-w-[160px] flex-col gap-space-1 rounded-xl border border-main-divider bg-main-background p-space-2 shadow-lg">
                        <template v-if="userStore.isAuthenticated">
                            <RouterLink to="/shop" role="menuitem"
                                class="type-button-sb flex h-[40px] items-center rounded-lg px-space-3 text-text-primary no-underline transition-colors hover:bg-button-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
                                @click="isProfileMenuOpen = false">
                                Setting
                            </RouterLink>
                            <button type="button" role="menuitem"
                                class="type-button-r flex h-[40px] cursor-pointer items-center rounded-lg border-0 bg-transparent px-space-3 text-left text-status-error transition-colors hover:bg-button-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
                                @click="handleLogout">
                                Log Out
                            </button>
                        </template>
                        <template v-else>
                            <RouterLink :to="{ path: '/login', query: authRedirectQuery }" role="menuitem"
                                class="type-button-sb flex h-[40px] items-center rounded-lg px-space-3 text-text-primary no-underline transition-colors hover:bg-button-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
                                @click="isProfileMenuOpen = false">
                                Login
                            </RouterLink>
                            <RouterLink :to="{ path: '/register', query: authRedirectQuery }" role="menuitem"
                                class="type-button-r flex h-[40px] items-center rounded-lg px-space-3 text-text-primary no-underline transition-colors hover:bg-button-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
                                @click="isProfileMenuOpen = false">
                                Register
                            </RouterLink>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </header>
    <button v-if="isMenuOpen" type="button" aria-label="Close menu"
        class="fixed inset-x-0 bottom-0 top-[73px] z-30 bg-black/60 backdrop-blur-sm md:hidden"
        @click="isMenuOpen = false" />
    <nav v-if="isMenuOpen" aria-label="Mobile navigation"
            class="fixed bottom-0 left-0 top-[73px] z-40 flex w-[219px] flex-col gap-space-2 bg-main-background px-space-4 py-space-3 shadow-xl md:hidden">
            <p class="type-support-r text-left font-light text-text-primary">
                MENU
            </p>
            <div class="flex flex-col gap-space-2">
                <RouterLink v-for="link in mobileNavbarLinks" :key="link.path"
                    v-slot="{ href, navigate, isExactActive }" :to="link.path" custom>
                    <a :href="href"
                        class="box-border flex h-[48px] items-center gap-[15px] rounded-base border px-space-4 py-space-3 text-text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
                        :class="isExactActive
                            ? 'type-button-sb border-button-border bg-button-secondary'
                            : 'type-button-r border-transparent font-light hover:bg-button-secondary-btn-hover active:bg-button-secondary-btn-active'"
                        @click="isMenuOpen = false; navigate($event)">
                        <span v-if="link.icon" aria-hidden="true"
                            class="inline-block size-icon-md shrink-0 bg-text-primary"
                            :style="{
                                mask: `url(${link.icon}) center / contain no-repeat`,
                                WebkitMask: `url(${link.icon}) center / contain no-repeat`,
                            }" />
                        <span class="lowercase first-letter:uppercase">{{ link.label }}</span>
                    </a>
                </RouterLink>
            </div>
        </nav>
</template>
<style scoped></style>
