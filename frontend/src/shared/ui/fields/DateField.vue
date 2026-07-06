<script setup lang="ts">
import { ref } from "vue";
import { icons } from "@/config";

interface Props {
    modelValue?: string;
    label?: string;
    /** Adds a time picker: value becomes datetime-local (YYYY-MM-DDTHH:mm). */
    withTime?: boolean;
    supportText?: string;
    error?: string;
    disabled?: boolean;
    min?: string;
    max?: string;
    name?: string;
    ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
    modelValue: "",
    withTime: false,
    supportText: "",
    error: "",
    disabled: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

const input = ref<HTMLInputElement | null>(null);

function openPicker(): void {
    input.value?.showPicker?.();
    input.value?.focus();
}
</script>

<template>
    <label :class="$style.dateField">
        <span v-if="label" :class="$style.title" class="type-overline-r">{{ label }}</span>
        <span :class="[$style.field, error ? $style.errorField : '']">
            <input
                ref="input"
                :class="[$style.input, !modelValue && $style.empty]"
                class="type-body-small-r"
                :type="withTime ? 'datetime-local' : 'date'"
                :value="modelValue"
                :disabled="disabled"
                :min="min"
                :max="max"
                :name="name"
                :aria-label="ariaLabel"
                :aria-invalid="Boolean(error) || undefined"
                @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
            >
            <button
                type="button"
                :class="$style.iconButton"
                :disabled="disabled"
                aria-label="Open calendar"
                tabindex="-1"
                @click.prevent="openPicker"
            >
                <img :src="icons.calendar" alt="" aria-hidden="true">
            </button>
        </span>
        <span
            v-if="error || supportText"
            :class="[$style.supportText, error ? $style.errorText : '']"
            class="type-overline-r"
        >{{ error || supportText }}</span>
    </label>
</template>

<style module>
.dateField {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8px;
    color: var(--color-neutral-600);
}

:global(.dark) .dateField,
:global([data-theme="dark"]) .dateField {
    color: var(--color-text-secondary);
}

.title {
    color: var(--color-input-title);
    font-family: var(--font-sans);
    font-weight: 800;
}

.field {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    height: 48px;
    gap: 6px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    background-color: var(--color-input-bg);
    padding: 12px 16px;
    transition:
        border-color 160ms ease,
        background-color 160ms ease;
}

.field:hover:not(:has(.input:disabled)) {
    border-color: var(--color-input-border-hover);
}

.field:has(.input:focus) {
    border-width: 1.5px;
    border-color: var(--color-input-border-focus);
}

.field:has(.input:disabled) {
    border-color: var(--color-input-border-disabled);
    background-color: var(--color-input-bg-disabled);
}

.input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: 0;
    background: none;
    padding: 0;
    color: var(--color-text-input);
    font-family: var(--font-sans);
    font-weight: 300;
    color-scheme: light;
}

/* Empty value shows the format hint in placeholder gray, like the Figma "--------- ----". */
.input.empty {
    color: var(--color-text-disabled);
}

.input::-webkit-calendar-picker-indicator {
    display: none;
}

.input:disabled {
    color: var(--color-text-disabled);
    cursor: not-allowed;
}

.iconButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin: 0;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
}

.iconButton img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}

.iconButton:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.supportText {
    font-size: 10px;
}

.errorField,
.errorField:hover,
.errorField:has(.input:focus) {
    border-width: 1.5px;
    border-color: var(--color-status-error);
}

.errorText {
    color: var(--color-status-error);
}
</style>
