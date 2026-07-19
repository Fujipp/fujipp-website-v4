<script setup lang="ts">
interface Props {
    modelValue?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    disabled: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
}>();

function toggle(): void {
    emit("update:modelValue", !props.modelValue);
}
</script>

<template>
    <button
        type="button"
        role="switch"
        :class="[$style.toggleSwitch, modelValue && $style.on]"
        :disabled="disabled"
        :aria-checked="modelValue"
        :aria-label="ariaLabel"
        @click="toggle"
    >
        <span :class="$style.knob" aria-hidden="true" />
    </button>
</template>

<style module>
.toggleSwitch {
    position: relative;
    display: inline-flex;
    box-sizing: border-box;
    width: 45px;
    height: 28px;
    flex-shrink: 0;
    overflow: hidden;
    border: 1px solid var(--color-button-border);
    border-radius: var(--radius-full);
    background: transparent;
    padding: 0;
    cursor: pointer;
    transition:
        border-color 180ms ease,
        background 180ms ease,
        opacity 180ms ease;
}

.toggleSwitch:hover:not(:disabled):not(.on) {
    border-color: var(--color-main-brand-secondary);
    background: color-mix(in srgb, var(--color-main-brand-secondary) 18%, transparent);
}

.toggleSwitch:focus-visible {
    outline: 2px solid var(--color-main-brand-secondary);
    outline-offset: 2px;
}

.toggleSwitch:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.toggleSwitch.on {
    border-color: var(--color-main-brand-secondary);
    background: var(--color-main-brand-secondary);
}

.knob {
    position: absolute;
    top: 50%;
    left: 4px;
    box-sizing: border-box;
    width: 20px;
    height: 20px;
    border: 1px solid var(--color-button-border);
    border-radius: var(--radius-full);
    background: var(--color-button-secondary);
    transform: translateY(-50%);
    transition:
        left 180ms ease,
        border-color 180ms ease;
}

.on .knob {
    left: calc(100% - 24px);
    border-color: var(--color-button-text-secondary);
    background: var(--color-button-text-secondary);
}
</style>
