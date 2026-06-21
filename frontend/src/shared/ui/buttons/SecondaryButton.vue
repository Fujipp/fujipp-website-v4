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
    variant?: "text" | "icon" | "icon-reveal";
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    icon: "/images/icons/navbar/theme/slide.svg",
    type: "button",
    variant: "text",
});

const variantClass = computed(() => {
    if (props.variant === "icon") return "iconButton";
    if (props.variant === "icon-reveal") return "iconReveal";
    return "text";
});

function updateGlassPointer(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;

    if (!target) return;

    const rect = target.getBoundingClientRect();
    target.style.setProperty("--glass-pointer-x", `${event.clientX - rect.left}px`);
    target.style.setProperty("--glass-pointer-y", `${event.clientY - rect.top}px`);
}

function resetGlassPointer(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;

    if (!target) return;

    target.style.removeProperty("--glass-pointer-x");
    target.style.removeProperty("--glass-pointer-y");
}
</script>

<template>
    <RouterLink
        v-if="to"
        :to="to"
        :class="[$style.secondaryButton, $style[variantClass]]"
        :aria-label="ariaLabel"
        @pointermove="updateGlassPointer"
        @pointerleave="resetGlassPointer"
    >
        <img
            v-if="variant === 'icon'"
            :class="$style.buttonIcon"
            :src="icon"
            alt=""
            aria-hidden="true"
            draggable="false"
        >
        <template v-else-if="variant === 'icon-reveal'">
            <img
                :class="$style.brandIcon"
                :src="icon"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
            <span :class="$style.revealLabel"><slot /></span>
        </template>
        <slot v-else />
    </RouterLink>
    <a
        v-else-if="href"
        :href="href"
        :class="[$style.secondaryButton, $style[variantClass]]"
        :aria-label="ariaLabel"
        :target="target"
        :rel="rel"
        @pointermove="updateGlassPointer"
        @pointerleave="resetGlassPointer"
    >
        <img
            v-if="variant === 'icon'"
            :class="$style.buttonIcon"
            :src="icon"
            alt=""
            aria-hidden="true"
            draggable="false"
        >
        <template v-else-if="variant === 'icon-reveal'">
            <img
                :class="$style.brandIcon"
                :src="icon"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
            <span :class="$style.revealLabel"><slot /></span>
        </template>
        <slot v-else />
    </a>
    <button
        v-else
        :type="type"
        :disabled="disabled"
        :class="[$style.secondaryButton, $style[variantClass]]"
        :aria-label="ariaLabel"
        @pointermove="updateGlassPointer"
        @pointerleave="resetGlassPointer"
    >
        <img
            v-if="variant === 'icon'"
            :class="$style.buttonIcon"
            :src="icon"
            alt=""
            aria-hidden="true"
            draggable="false"
        >
        <template v-else-if="variant === 'icon-reveal'">
            <img
                :class="$style.brandIcon"
                :src="icon"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
            <span :class="$style.revealLabel"><slot /></span>
        </template>
        <slot v-else />
    </button>
</template>

<style module>
.secondaryButton {
    --glass-foreground: var(--color-neutral-700);
    --glass-border: color-mix(in srgb, var(--color-neutral-600) 24%, transparent);
    --glass-border-hover: color-mix(in srgb, var(--color-neutral-700) 34%, transparent);
    --glass-highlight: color-mix(in srgb, var(--color-neutral-50) 82%, transparent);
    --glass-highlight-soft: color-mix(in srgb, var(--color-neutral-50) 48%, transparent);
    --glass-lowlight: color-mix(in srgb, var(--color-neutral-400) 40%, transparent);
    --glass-shadow: color-mix(in srgb, var(--color-neutral-900) 22%, transparent);
    --glass-shadow-hover: color-mix(in srgb, var(--color-neutral-900) 26%, transparent);
    --glass-icon-filter: brightness(0) saturate(100%) invert(34%) sepia(12%) saturate(842%) hue-rotate(182deg) brightness(91%) contrast(88%);
    --glass-icon-shadow: color-mix(in srgb, var(--color-neutral-900) 20%, transparent);
    --glass-pointer-color: color-mix(in srgb, var(--color-main-primary) 24%, var(--color-neutral-50) 54%);
    --glass-pointer-x: 50%;
    --glass-pointer-y: 50%;

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    flex-shrink: 0;
    overflow: hidden;
    isolation: isolate;
    border: 1px solid var(--glass-border);
    background:
        linear-gradient(
            150deg,
            var(--glass-highlight) 0%,
            var(--glass-highlight-soft) 42%,
            var(--glass-lowlight) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 72%, transparent),
        inset 0 -8px 16px var(--glass-lowlight),
        0 6px 18px var(--glass-shadow);
    backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    color: var(--glass-foreground);
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

:global(.dark) .secondaryButton,
:global([data-theme="dark"]) .secondaryButton {
    --glass-foreground: var(--color-neutral-50);
    --glass-border: color-mix(in srgb, var(--color-neutral-50) 16%, transparent);
    --glass-border-hover: color-mix(in srgb, var(--color-neutral-50) 26%, transparent);
    --glass-highlight: color-mix(in srgb, var(--color-neutral-50) 14%, transparent);
    --glass-highlight-soft: color-mix(in srgb, var(--color-neutral-50) 4%, transparent);
    --glass-lowlight: color-mix(in srgb, var(--color-neutral-900) 28%, transparent);
    --glass-shadow: color-mix(in srgb, var(--color-neutral-900) 35%, transparent);
    --glass-shadow-hover: color-mix(in srgb, var(--color-neutral-900) 40%, transparent);
    --glass-icon-filter: brightness(0) invert(1);
    --glass-icon-shadow: color-mix(in srgb, var(--color-neutral-50) 30%, transparent);
    --glass-pointer-color: color-mix(in srgb, var(--color-neutral-50) 36%, var(--color-main-primary) 24%);
}

.secondaryButton::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background:
        radial-gradient(
            120% 80% at 50% -20%,
            color-mix(in srgb, var(--color-neutral-50) 62%, transparent) 0%,
            transparent 60%
        );
    opacity: 0.7;
    pointer-events: none;
    z-index: -1;
}

.secondaryButton::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background:
        radial-gradient(
            circle 76px at var(--glass-pointer-x) var(--glass-pointer-y),
            var(--glass-pointer-color) 0%,
            transparent 68%
        );
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
}

.secondaryButton:hover:not(:disabled)::after,
.secondaryButton:focus-visible::after {
    opacity: 0.82;
}

.secondaryButton:hover:not(:disabled) {
    border-color: var(--glass-border-hover);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 78%, transparent),
        inset 0 -8px 16px var(--glass-lowlight),
        0 8px 22px var(--glass-shadow-hover);
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
    filter: var(--glass-icon-filter) drop-shadow(0 0 10px var(--glass-icon-shadow));
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

.iconReveal {
    width: auto;
    height: 48px;
    padding: 0 13px;
    gap: 0;
    border-radius: var(--radius-full);
}

.brandIcon {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}

.revealLabel {
    display: inline-block;
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    font-size: 1rem;
    white-space: nowrap;
    transition: max-width 260ms ease, margin-left 260ms ease, opacity 200ms ease;
}

.iconReveal:hover .revealLabel,
.iconReveal:focus-visible .revealLabel {
    max-width: 160px;
    margin-left: 8px;
    opacity: 1;
}
</style>
