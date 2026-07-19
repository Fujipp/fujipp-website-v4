<script setup lang="ts">
type ControlSize = "s" | "m" | "l";

interface Props {
    modelValue?: boolean;
    size?: ControlSize;
    disabled?: boolean;
    ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    size: "s",
    disabled: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
}>();

function onChange(): void {
    emit("update:modelValue", !props.modelValue);
}
</script>

<template>
    <input
        type="checkbox"
        :class="[$style.checkboxInput, $style[size]]"
        :checked="modelValue"
        :disabled="disabled"
        :aria-label="ariaLabel"
        @change="onChange"
    >
</template>

<style module>
.checkboxInput {
    --checkbox-check: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M1.5 5.4 4 7.9 8.5 2.2' fill='none' stroke='%23000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");

    appearance: none;
    -webkit-appearance: none;

    position: relative;
    box-sizing: border-box;
    width: var(--control-size);
    height: var(--control-size);
    flex-shrink: 0;
    margin: 0;
    border: 1.5px solid var(--color-button-border);
    border-radius: var(--radius-base);
    background: transparent;
    cursor: pointer;
    transition:
        border-color 180ms ease,
        background 180ms ease,
        opacity 180ms ease;
}

.checkboxInput::after {
    content: "";
    position: absolute;
    inset: 0;
    margin: auto;
    width: 62.5%;
    height: 62.5%;
    background-color: var(--color-button-text-secondary);
    mask: var(--checkbox-check) center / contain no-repeat;
    -webkit-mask: var(--checkbox-check) center / contain no-repeat;
    opacity: 0;
    transform: scale(0.6);
    transition:
        opacity 180ms ease,
        transform 180ms ease;
}

.checkboxInput:hover:not(:disabled) {
    border-color: var(--color-main-brand-secondary);
}

.checkboxInput:checked {
    border-color: var(--color-main-brand-secondary);
    background: var(--color-main-brand-secondary);
}

.checkboxInput:checked::after {
    opacity: 1;
    transform: scale(1);
}

.checkboxInput:focus-visible {
    outline: 2px solid var(--color-main-brand-secondary);
    outline-offset: 2px;
}

.checkboxInput:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.s {
    --control-size: 16px;
}

.m {
    --control-size: 20px;
}

.l {
    --control-size: 24px;
}
</style>
