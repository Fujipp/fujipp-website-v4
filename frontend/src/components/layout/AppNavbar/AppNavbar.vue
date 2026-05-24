<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { mobileNavbarLinks, navbarLinks, ThemeApp } from "@/config";
import { useThemeStore } from "@/stores";
import type { ThemeMode } from "@/config/theme";

const isMenuOpen = ref(false);
const isThemePickerOpen = ref(false);
const themeStore = useThemeStore();
const { selectedTheme } = storeToRefs(themeStore);

const themeTrackOffset = computed(() => {
    if (isThemePickerOpen.value) return 0;

    const selectedThemeIndex = ThemeApp.findIndex((theme) => theme.mode === selectedTheme.value);
    return -(selectedThemeIndex * 48);
});

function selectTheme(theme: ThemeMode) {
    themeStore.setTheme(theme);
    isThemePickerOpen.value = false;
}

function handleThemeIconClick(theme: ThemeMode) {
    if (!isThemePickerOpen.value && selectedTheme.value === theme) {
        isThemePickerOpen.value = true;
        return;
    }

    selectTheme(theme);
}
</script>

<template>
    <header
        class="fixed top-0 left-0 box-border w-full z-50 h-16 px-2 flex items-center bg-main-surface transition-colors duration-300">
        <div class="container mx-auto relative flex items-center justify-between px-1 py-3">
            <!-- Left: Burger + Logo -->
            <div class="flex items-center gap-3">
                <button type="button" class="flex items-center justify-center md:hidden" :aria-expanded="isMenuOpen"
                    aria-label="Toggle menu" @click="isMenuOpen = !isMenuOpen">
                    <img :src="isMenuOpen
                        ? '/images/icons/navbar/close.svg'
                        : '/images/icons/navbar/burger.svg'" :alt="isMenuOpen ? 'Close menu' : 'Open menu'"
                        class="w-3 h-3" />
                </button>
                <RouterLink to="/" class="type-h1-page-title-sb text-text-secondary">
                    FUJIPP
                </RouterLink>
            </div>
            <!-- Center: Navigation Links -->
            <nav class="hidden md:flex items-center gap-space-6 absolute left-1/2 transform -translate-x-1/2">
                <RouterLink v-for="link in navbarLinks" :key="link.path" v-slot="{ href, navigate, isExactActive }"
                    :to="link.path" custom>
                    <a :href="href"
                        class="relative inline-flex h-[44px] w-fit items-center justify-center transition-colors focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
                        :class="isExactActive
                            ? 'type-button-sb text-button-primary-btn-text-active'
                            : 'type-button-r text-text-secondary'" @click="navigate">
                        {{ link.label }}
                        <span v-if="isExactActive" aria-hidden="true"
                            class="absolute bottom-0 left-1/2 h-space-1 w-space-6 -translate-x-1/2 rounded-sm bg-main-primary" />
                    </a>
                </RouterLink>
            </nav>
            <!-- Right: Theme Switcher -->
            <div class="flex items-center justify-end">
                <button type="button"
                    class="flex h-space-8 shrink-0 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
                    :aria-expanded="isThemePickerOpen" aria-label="Choose theme"
                    @click="isThemePickerOpen = !isThemePickerOpen">
                    <img src="/images/icons/navbar/theme/slide.svg" alt="" aria-hidden="true"
                        class="transition-transform duration-300" :class="isThemePickerOpen ? 'rotate-180' : ''" />
                </button>
                <div class="ml-space-2 h-space-8 overflow-hidden transition-[width] duration-300"
                    :class="isThemePickerOpen ? 'w-[136px]' : 'w-space-10'">
                    <div class="flex items-center gap-space-2 transition-transform duration-300"
                        :style="{ transform: `translateX(${themeTrackOffset}px)` }">
                        <button v-for="theme in ThemeApp" :key="theme.mode" type="button"
                            class="flex h-space-8 w-space-10 shrink-0 items-center justify-center rounded-sm transition-colors"
                            :class="selectedTheme === theme.mode ? '' : ''"
                            :aria-label="`Use ${theme.mode.toLowerCase()} theme`"
                            :aria-pressed="selectedTheme === theme.mode"
                            :tabindex="isThemePickerOpen || selectedTheme === theme.mode ? 0 : -1"
                            @click="handleThemeIconClick(theme.mode)">
                            <img :src="theme.src" :alt="`${theme.mode} theme`" class="size-icon-md" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </header>
    <Transition enter-active-class="transition-opacity duration-300 ease-out" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200 ease-in"
        leave-from-class="opacity-100" leave-to-class="opacity-0">
        <button v-if="isMenuOpen" type="button" aria-label="Close menu"
            class="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            @click="isMenuOpen = false" />
    </Transition>
    <Transition enter-active-class="transition-transform duration-300 ease-out" enter-from-class="-translate-x-full"
        enter-to-class="translate-x-0" leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="translate-x-0" leave-to-class="-translate-x-full">
        <nav v-if="isMenuOpen" aria-label="Mobile navigation"
            class="fixed bottom-0 left-0 top-16 z-40 flex w-[210px] flex-col bg-main-surface px-space-4 py-space-6 shadow-xl md:hidden">
            <p class="type-handling-r text-left text-text-secondary">
                Menu
            </p>
            <div class="mt-space-4 flex flex-col gap-space-2">
                <RouterLink v-for="link in mobileNavbarLinks" :key="link.path"
                    v-slot="{ href, navigate, isExactActive }" :to="link.path" custom>
                    <a :href="href"
                        class="flex h-[44px] items-center gap-space-3 rounded-sm px-space-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
                        :class="isExactActive
                            ? 'type-button-sb bg-button-secondary-btn-bg text-button-primary-btn-text-active'
                            : 'type-button-r text-text-secondary hover:bg-button-secondary-btn-hover active:bg-button-secondary-btn-active'"
                        @click="isMenuOpen = false; navigate($event)">
                        <img v-if="link.icon" :src="link.icon" alt="" aria-hidden="true"
                            class="size-icon-md shrink-0" />
                        {{ link.label }}
                    </a>
                </RouterLink>
            </div>
        </nav>
    </Transition>
</template>
<style scoped></style>
