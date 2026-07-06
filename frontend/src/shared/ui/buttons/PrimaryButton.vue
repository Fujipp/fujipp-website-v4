<script setup lang="ts">
import { computed, useAttrs, useSlots } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { getIconColorMode } from "@/config";

type ButtonWidthMode = "fill" | "hug" | "fixed";

defineOptions({
    inheritAttrs: false,
});

interface Props {
    ariaLabel?: string;
    disabled?: boolean;
    href?: string;
    icon?: string;
    leadingIcon?: string;
    rel?: string;
    target?: string;
    to?: RouteLocationRaw;
    trailingIcon?: string;
    type?: "button" | "submit" | "reset";
    fixedWidth?: string;
    widthMode?: ButtonWidthMode;
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    fixedWidth: "160px",
    type: "button",
    widthMode: "fill",
});

const attrs = useAttrs();
const slots = useSlots();
const leadingIconSrc = computed(() => props.leadingIcon ?? props.icon);
const isIconOnly = computed(() => Boolean((leadingIconSrc.value || props.trailingIcon) && !slots.default));
const buttonClass = computed(() => [
    "primaryButton",
    props.widthMode,
    isIconOnly.value ? "iconOnly" : "",
]);
const buttonStyle = computed(() => ({
    "--button-fixed-width": props.fixedWidth,
}));

function isOriginalColorIcon(icon: string): boolean {
    return getIconColorMode(icon) === "original";
}

function iconMaskStyle(icon: string): Record<string, string> {
    return {
        "--button-icon-src": `url(${icon})`,
    };
}

function updateButtonTilt(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;

    if (!target) return;

    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    target.style.setProperty("--button-tilt-x", `${x * 3}deg`);
    target.style.setProperty("--button-tilt-y", `${y * -3}deg`);
}

function resetButtonTilt(event: PointerEvent | FocusEvent): void {
    const target = event.currentTarget as HTMLElement | null;

    if (!target) return;

    target.style.setProperty("--button-tilt-x", "0deg");
    target.style.setProperty("--button-tilt-y", "0deg");
}
</script>

<template>
    <a
        v-if="href"
        v-bind="attrs"
        :class="buttonClass.map((className) => className && $style[className])"
        :style="buttonStyle"
        :href="href"
        :target="target"
        :rel="rel"
        :aria-label="ariaLabel"
        @pointermove="updateButtonTilt"
        @pointerleave="resetButtonTilt"
        @blur="resetButtonTilt"
    >
        <slot name="leading-icon">
            <img v-if="leadingIconSrc && isOriginalColorIcon(leadingIconSrc)" :class="$style.icon" :src="leadingIconSrc" alt="" aria-hidden="true">
            <span v-else-if="leadingIconSrc" :class="[$style.icon, $style.maskIcon]" :style="iconMaskStyle(leadingIconSrc)" aria-hidden="true" />
        </slot>
        <span :class="$style.label"><slot /></span>
        <slot name="trailing-icon">
            <img v-if="trailingIcon && isOriginalColorIcon(trailingIcon)" :class="$style.icon" :src="trailingIcon" alt="" aria-hidden="true">
            <span v-else-if="trailingIcon" :class="[$style.icon, $style.maskIcon]" :style="iconMaskStyle(trailingIcon)" aria-hidden="true" />
        </slot>
    </a>
    <RouterLink
        v-else-if="to"
        v-bind="attrs"
        :class="buttonClass.map((className) => className && $style[className])"
        :style="buttonStyle"
        :to="to"
        :aria-label="ariaLabel"
        @pointermove="updateButtonTilt"
        @pointerleave="resetButtonTilt"
        @blur="resetButtonTilt"
    >
        <slot name="leading-icon">
            <img v-if="leadingIconSrc && isOriginalColorIcon(leadingIconSrc)" :class="$style.icon" :src="leadingIconSrc" alt="" aria-hidden="true">
            <span v-else-if="leadingIconSrc" :class="[$style.icon, $style.maskIcon]" :style="iconMaskStyle(leadingIconSrc)" aria-hidden="true" />
        </slot>
        <span :class="$style.label"><slot /></span>
        <slot name="trailing-icon">
            <img v-if="trailingIcon && isOriginalColorIcon(trailingIcon)" :class="$style.icon" :src="trailingIcon" alt="" aria-hidden="true">
            <span v-else-if="trailingIcon" :class="[$style.icon, $style.maskIcon]" :style="iconMaskStyle(trailingIcon)" aria-hidden="true" />
        </slot>
    </RouterLink>
    <button
        v-else
        v-bind="attrs"
        :type="type"
        :disabled="disabled"
        :class="buttonClass.map((className) => className && $style[className])"
        :style="buttonStyle"
        :aria-label="ariaLabel"
        @pointermove="updateButtonTilt"
        @pointerleave="resetButtonTilt"
        @blur="resetButtonTilt"
    >
        <slot name="leading-icon">
            <img v-if="leadingIconSrc && isOriginalColorIcon(leadingIconSrc)" :class="$style.icon" :src="leadingIconSrc" alt="" aria-hidden="true">
            <span v-else-if="leadingIconSrc" :class="[$style.icon, $style.maskIcon]" :style="iconMaskStyle(leadingIconSrc)" aria-hidden="true" />
        </slot>
        <span :class="$style.label"><slot /></span>
        <slot name="trailing-icon">
            <img v-if="trailingIcon && isOriginalColorIcon(trailingIcon)" :class="$style.icon" :src="trailingIcon" alt="" aria-hidden="true">
            <span v-else-if="trailingIcon" :class="[$style.icon, $style.maskIcon]" :style="iconMaskStyle(trailingIcon)" aria-hidden="true" />
        </slot>
    </button>
</template>

<style module>
.primaryButton {
    --button-tilt-x: 0deg;
    --button-tilt-y: 0deg;
    --button-fixed-width: 160px;

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    gap: 10px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-button-primary) 32%, transparent);
    border-radius: var(--radius-xl);
    background:
        linear-gradient(
            145deg,
            color-mix(in srgb, var(--color-button-primary) 34%, transparent) 0%,
            color-mix(in srgb, var(--color-button-primary) 16%, transparent) 48%,
            color-mix(in srgb, var(--color-button-primary) 24%, transparent) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-button-primary) 28%, transparent),
        0 4px 4px rgb(0 0 0 / 10%);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    padding: 10px;
    color: var(--color-button-text);
    font-family: var(--font-sans);
    font-size: var(--type-size-button);
    font-weight: 600;
    line-height: normal;
    letter-spacing: 0;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition:
        border-color 180ms ease,
        background 180ms ease,
        box-shadow 180ms ease,
        opacity 180ms ease,
        transform 180ms ease;
}

.primaryButton:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-button-primary) 52%, transparent);
    background:
        linear-gradient(
            145deg,
            color-mix(in srgb, var(--color-button-primary) 40%, transparent) 0%,
            color-mix(in srgb, var(--color-button-primary) 20%, transparent) 48%,
            color-mix(in srgb, var(--color-button-primary) 28%, transparent) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-button-primary) 34%, transparent),
        0 8px 12px rgb(0 0 0 / 14%);
    transform:
        perspective(700px)
        rotateX(var(--button-tilt-y))
        rotateY(var(--button-tilt-x))
        translateY(-1px);
}

.primaryButton:active:not(:disabled) {
    box-shadow: 0 3px 4px rgb(0 0 0 / 10%);
    transform:
        perspective(700px)
        rotateX(var(--button-tilt-y))
        rotateY(var(--button-tilt-x))
        translateY(1px)
        scale(0.99);
}

.primaryButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.primaryButton:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.icon,
.label {
    position: relative;
    z-index: 1;
}

.icon {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    flex-shrink: 0;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}

.maskIcon {
    background-color: var(--color-text-primary);
    mask: var(--button-icon-src) center / contain no-repeat;
    -webkit-mask: var(--button-icon-src) center / contain no-repeat;
}

.label {
    font-weight: 600;
}

.label:empty {
    display: none;
}

.fill {
    width: 100%;
}

.hug {
    width: fit-content;
}

.fixed {
    width: var(--button-fixed-width);
    flex-shrink: 0;
}

.iconOnly {
    width: 44px;
    min-width: 44px;
    padding: 10px;
}
</style>
