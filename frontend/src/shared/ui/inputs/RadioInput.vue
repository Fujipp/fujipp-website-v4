<script setup lang="ts">
type ControlSize = "s" | "m" | "l";

interface Props {
    modelValue?: string;
    value: string;
    name?: string;
    size?: ControlSize;
    disabled?: boolean;
    ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    size: "s",
    disabled: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

function onChange(): void {
    emit("update:modelValue", props.value);
}
</script>

<template>
    <input
        type="radio"
        :class="[$style.radioInput, $style[size]]"
        :name="name"
        :value="value"
        :checked="modelValue === value"
        :disabled="disabled"
        :aria-label="ariaLabel"
        @change="onChange"
    >
</template>

<style module>
.radioInput {
    appearance: none;
    -webkit-appearance: none;

    position: relative;
    box-sizing: border-box;
    width: var(--control-size);
    height: var(--control-size);
    flex-shrink: 0;
    margin: 0;
    border: 1.5px solid var(--color-button-border);
    border-radius: var(--radius-full);
    background: transparent;
    cursor: pointer;
    transition:
        border-color 180ms ease,
        background 180ms ease,
        opacity 180ms ease;
}

.radioInput::after {
    content: "";
    position: absolute;
    inset: 0;
    margin: auto;
    width: 37.5%;
    height: 37.5%;
    border-radius: var(--radius-full);
    background: var(--color-button-text-secondary);
    opacity: 0;
    transform: scale(0.6);
    transition:
        opacity 180ms ease,
        transform 180ms ease;
}

.radioInput:hover:not(:disabled) {
    border-color: var(--color-main-brand-secondary);
}

.radioInput:checked {
    border-color: var(--color-main-brand-secondary);
    background: var(--color-main-brand-secondary);
}

.radioInput:checked::after {
    opacity: 1;
    transform: scale(1);
}

.radioInput:focus-visible {
    outline: 2px solid var(--color-main-brand-secondary);
    outline-offset: 2px;
}

.radioInput:disabled {
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
