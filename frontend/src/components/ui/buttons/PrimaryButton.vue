<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

interface Props {
    disabled?: boolean;
    href?: string;
    icon?: string;
    to?: RouteLocationRaw;
    type?: "button" | "submit" | "reset";
}

withDefaults(defineProps<Props>(), {
    disabled: false,
    type: "button",
});

const buttonClasses =
    "type-button-sb rounded-xl bg-button-primary-btn-bg px-space-4 py-space-3 text-button-primary-btn-text-active transition-colors hover:bg-button-primary-btn-hover active:bg-button-primary-btn-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary";
</script>

<template>
    <a
        v-if="href"
        :class="[$style.primaryButton, buttonClasses]"
        :href="href"
        target="_blank"
        rel="noopener noreferrer"
    >
        <img v-if="icon" :class="$style.leftIcon" :src="icon" alt="" aria-hidden="true">
        <slot />
    </a>
    <RouterLink
        v-else-if="to"
        :class="[$style.primaryButton, buttonClasses]"
        :to="to"
    >
        <img v-if="icon" :class="$style.leftIcon" :src="icon" alt="" aria-hidden="true">
        <slot />
    </RouterLink>
    <button
        v-else
        :type="type"
        :disabled="disabled"
        :class="[$style.primaryButton, buttonClasses]"
        class="disabled:cursor-not-allowed disabled:bg-button-primary-btn-disabled"
    >
        <img v-if="icon" :class="$style.leftIcon" :src="icon" alt="" aria-hidden="true">
        <slot />
    </button>
</template>

<style module>
.primaryButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 160px;
    height: 48px;
    gap: 8px;
    text-decoration: none;
}

.leftIcon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    object-fit: contain;
}
</style>
