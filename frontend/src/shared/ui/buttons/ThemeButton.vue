<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ThemeApp } from "@/config";
import { useThemeStore } from "@/stores";
import type { ThemeMode } from "@/config/theme";

const themeStore = useThemeStore();
const { selectedTheme } = storeToRefs(themeStore);

function selectTheme(theme: ThemeMode): void {
    themeStore.setTheme(theme);
}
</script>

<template>
    <div :class="$style.buttonTheme" role="group" aria-label="Theme mode">
        <button
            v-for="theme in ThemeApp"
            :key="theme.mode"
            type="button"
            :class="[$style.themeOption, selectedTheme === theme.mode ? $style.active : '']"
            :aria-label="`Use ${theme.mode.toLowerCase()} theme`"
            :aria-pressed="selectedTheme === theme.mode"
            @click="selectTheme(theme.mode)"
        >
            <span
                :class="$style.themeIcon"
                :style="{ '--theme-icon': `url(${theme.src})` }"
                aria-hidden="true"
            />
        </button>
    </div>
</template>

<style module>
.buttonTheme {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    box-sizing: border-box;
    width: 174px;
    height: 48px;
    gap: 23px;
}

.themeOption {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 44px;
    height: 40px;
    padding: 10px;
    overflow: hidden;
    border: 0;
    border-radius: var(--radius-xl);
    background-color: var(--color-main-secondary);
    color: var(--color-input-placeholder);
    cursor: pointer;
    transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.themeOption:hover {
    background-color: var(--color-button-secondary-btn-hover);
}

.themeOption:active {
    background-color: var(--color-button-secondary-btn-active);
    transform: translateY(1px);
}

.themeOption:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.active {
    color: var(--color-text-secondary);
}

.themeIcon {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    flex-shrink: 0;
    background-color: currentColor;
    mask: var(--theme-icon) center / contain no-repeat;
    -webkit-mask: var(--theme-icon) center / contain no-repeat;
}
</style>
