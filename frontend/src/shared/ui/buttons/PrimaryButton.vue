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
    props.disabled ? "disabled" : "",
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

    if (!target || props.disabled) return;

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
        :aria-disabled="disabled || undefined"
        :tabindex="disabled ? -1 : undefined"
        @click="disabled && $event.preventDefault()"
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
        :aria-disabled="disabled || undefined"
        :tabindex="disabled ? -1 : undefined"
        @click="disabled && $event.preventDefault()"
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
    isolation: isolate;
    border: 0;
    border-radius: var(--radius-xl);
    background: transparent;
    box-shadow: 0 4px 4px rgb(0 0 0 / 10%);
    backdrop-filter: saturate(160%) contrast(105%);
    -webkit-backdrop-filter: saturate(160%) contrast(105%);
    padding: 10px;
    color: var(--color-button-secondary);
    font-family: var(--font-sans);
    font-size: var(--type-size-button);
    font-weight: 600;
    line-height: normal;
    letter-spacing: 0;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition:
        background 180ms ease,
        box-shadow 180ms ease,
        transform 180ms ease;
}

.primaryButton::before,
.primaryButton::after {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    content: "";
    pointer-events: none;
}

.primaryButton::before {
    z-index: -2;
    background:
        linear-gradient(
            180deg,
            rgb(255 255 255 / 80%) 0%,
            rgb(255 255 255 / 18%) 18%,
            rgb(255 255 255 / 4%) 52%,
            rgb(255 255 255 / 14%) 100%
        );
    opacity: 0.32;
}

.primaryButton::after {
    z-index: -1;
    border: 1px solid color-mix(in srgb, var(--color-button-primary) 38%, transparent);
    background: linear-gradient(180deg, transparent 45%, rgb(255 255 255 / 10%));
    box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 50%),
        inset 0 -1px 0 rgb(255 255 255 / 12%);
}

.primaryButton:hover:not(:disabled):not(.disabled) {
    box-shadow: 0 6px 8px rgb(0 0 0 / 12%);
    transform:
        perspective(700px)
        rotateX(var(--button-tilt-y))
        rotateY(var(--button-tilt-x))
        translateY(-1px);
}

.primaryButton:active:not(:disabled):not(.disabled) {
    box-shadow: 0 2px 4px rgb(0 0 0 / 10%);
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

.primaryButton:disabled,
.primaryButton.disabled {
    cursor: not-allowed;
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
    background-color: var(--color-button-secondary);
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
