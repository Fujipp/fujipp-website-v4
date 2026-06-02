<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";

interface Props {
    ariaLabel?: string;
    disabled?: boolean;
    icon?: string;
    to?: RouteLocationRaw;
    type?: "button" | "submit" | "reset";
    variant?: "text" | "icon";
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    icon: "/images/icons/navbar/theme/slide.svg",
    type: "button",
    variant: "text",
});

const variantClass = computed(() => (props.variant === "icon" ? "iconButton" : "text"));
</script>

<template>
    <RouterLink
        v-if="to"
        :to="to"
        :class="[$style.secondaryButton, $style[variantClass]]"
        :aria-label="ariaLabel"
    >
        <img
            v-if="variant === 'icon'"
            :class="$style.buttonIcon"
            :src="icon"
            alt=""
            aria-hidden="true"
            draggable="false"
        >
        <slot v-else />
    </RouterLink>
    <button
        v-else
        :type="type"
        :disabled="disabled"
        :class="[$style.secondaryButton, $style[variantClass]]"
        :aria-label="ariaLabel"
    >
        <img
            v-if="variant === 'icon'"
            :class="$style.buttonIcon"
            :src="icon"
            alt=""
            aria-hidden="true"
            draggable="false"
        >
        <slot v-else />
    </button>
</template>

<style module>
.secondaryButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    flex-shrink: 0;
    border: 1.5px solid var(--color-main-primary);
    color: var(--color-main-primary);
    font-family: var(--font-sans);
    font-weight: 300;
    line-height: normal;
    letter-spacing: 0;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.secondaryButton:hover {
    background-color: rgb(121 135 172 / 12%);
}

.secondaryButton:active {
    background-color: rgb(121 135 172 / 20%);
}

.secondaryButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.secondaryButton:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.text {
    width: 160px;
    height: 48px;
    padding: 12px 16px;
    border-radius: 12px;
    background-color: transparent;
    font-size: 1rem;
}

.buttonIcon {
    width: 6px;
    height: 9px;
    transform: rotate(180deg);
    user-select: none;
    -webkit-user-drag: none;
}

.iconButton {
    width: 32px;
    height: 32px;
    padding: 0;
    border-color: var(--color-button-secondary-btn-bg);
    border-radius: var(--radius-full);
    background-color: var(--color-button-secondary-btn-bg);
}

.iconButton:hover {
    border-color: var(--color-button-secondary-btn-hover);
    background-color: var(--color-button-secondary-btn-hover);
}

.iconButton:active {
    border-color: var(--color-button-secondary-btn-active);
    background-color: var(--color-button-secondary-btn-active);
}

.iconButton .buttonIcon {
    width: 6px;
    height: 9px;
}
</style>
