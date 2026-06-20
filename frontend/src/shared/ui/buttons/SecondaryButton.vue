<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";

interface Props {
    ariaLabel?: string;
    disabled?: boolean;
    href?: string;
    icon?: string;
    rel?: string;
    target?: string;
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
    <a
        v-else-if="href"
        :href="href"
        :class="[$style.secondaryButton, $style[variantClass]]"
        :aria-label="ariaLabel"
        :target="target"
        :rel="rel"
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
    </a>
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
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    flex-shrink: 0;
    overflow: hidden;
    isolation: isolate;
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 16%, transparent);
    background:
        linear-gradient(
            150deg,
            color-mix(in srgb, var(--color-neutral-50) 14%, transparent) 0%,
            color-mix(in srgb, var(--color-neutral-50) 4%, transparent) 42%,
            color-mix(in srgb, var(--color-neutral-900) 28%, transparent) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 45%, transparent),
        inset 0 -8px 16px color-mix(in srgb, var(--color-neutral-900) 30%, transparent),
        0 6px 18px color-mix(in srgb, var(--color-neutral-900) 35%, transparent);
    backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    color: var(--color-neutral-50);
    font-family: var(--font-sans);
    font-weight: 300;
    line-height: normal;
    letter-spacing: 0;
    text-decoration: none;
    cursor: pointer;
    transition:
        background 220ms ease,
        border-color 220ms ease,
        box-shadow 220ms ease,
        opacity 220ms ease,
        transform 220ms ease;
}

.secondaryButton::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background:
        radial-gradient(
            120% 80% at 50% -20%,
            color-mix(in srgb, var(--color-neutral-50) 38%, transparent) 0%,
            transparent 60%
        );
    opacity: 0.7;
    pointer-events: none;
    z-index: -1;
}

.secondaryButton:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-neutral-50) 26%, transparent);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 55%, transparent),
        inset 0 -8px 16px color-mix(in srgb, var(--color-neutral-900) 30%, transparent),
        0 8px 22px color-mix(in srgb, var(--color-neutral-900) 40%, transparent);
}

.secondaryButton:active:not(:disabled) {
    transform: scale(0.97);
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
    border-radius: 999px;
    font-size: 1rem;
}

.buttonIcon {
    width: 6px;
    height: 9px;
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--color-neutral-50) 30%, transparent));
    transform: rotate(180deg);
    user-select: none;
    -webkit-user-drag: none;
}

.iconButton {
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: var(--radius-full);
}

.iconButton .buttonIcon {
    width: 6px;
    height: 9px;
}
</style>
