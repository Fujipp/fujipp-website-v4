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
    background: color-mix(in srgb, var(--color-button-secondary) 24%, transparent);
}

.toggleSwitch:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.toggleSwitch:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.toggleSwitch.on {
    background: var(--color-button-text);
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
}
</style>
