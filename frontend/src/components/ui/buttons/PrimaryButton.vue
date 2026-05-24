<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

interface Props {
    disabled?: boolean;
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
    <RouterLink
        v-if="to"
        :class="[$style.primaryButton, buttonClasses]"
        :to="to"
    >
        <slot />
    </RouterLink>
    <button
        v-else
        :type="type"
        :disabled="disabled"
        :class="[$style.primaryButton, buttonClasses]"
        class="disabled:cursor-not-allowed disabled:bg-button-primary-btn-disabled"
    >
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
    text-decoration: none;
}
</style>
