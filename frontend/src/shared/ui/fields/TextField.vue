<script setup lang="ts">
import { useSlots } from "vue";

interface Props {
    autocomplete?: string;
    disabled?: boolean;
    error?: string;
    label?: string;
    modelValue?: string;
    name?: string;
    placeholder?: string;
    supportText?: string;
    type?: "month" | "number" | "password" | "text" | "url";
    unit?: string;
    icon?: string;
    ariaLabel?: string;
    /** Shows a red asterisk after the label (visual required marker). */
    required?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    autocomplete: "off",
    disabled: false,
    error: "",
    modelValue: "",
    name: undefined,
    placeholder: "",
    supportText: "",
    type: "text",
    unit: "",
    icon: "",
    required: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

const slots = useSlots();

/* Unit fields (฿, %, kg, …) accept numbers only: digits and one decimal point. */
function onInput(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (props.unit) {
        const sanitized = target.value
            .replace(/[^0-9.]/g, "")
            .replace(/^([^.]*\.)(.*)$/, (_, head: string, tail: string) => head + tail.replace(/\./g, ""));

        if (sanitized !== target.value) target.value = sanitized;

        emit("update:modelValue", sanitized);
        return;
    }

    emit("update:modelValue", target.value);
}

/* Picker-backed types open the native picker from a click anywhere in the field,
   not just the tiny indicator icon. */
function openPickerOnClick(event: MouseEvent): void {
    const target = event.target as HTMLInputElement;

    if (props.type === "month" && !props.disabled && typeof target.showPicker === "function") {
        try {
            target.showPicker();
        } catch {
            /* showPicker can throw without a user gesture; the field still works normally. */
        }
    }
}
</script>

<template>
    <label :class="$style.textField">
        <span v-if="label" :class="$style.title" class="type-input-label-sb">
            {{ label }}<span v-if="required" :class="$style.requiredMark" aria-hidden="true">*</span>
        </span>
        <span :class="[$style.field, error ? $style.errorField : '']">
            <span v-if="unit" :class="$style.unit" class="type-input-label-r" aria-hidden="true">{{ unit }}</span>
            <input
                :class="$style.input"
                class="type-input-label-r"
                :autocomplete="autocomplete"
                :disabled="disabled"
                :name="name"
                :placeholder="placeholder"
                :type="type"
                :value="modelValue"
                :aria-label="ariaLabel"
                :aria-invalid="Boolean(error) || undefined"
                :inputmode="unit ? 'decimal' : undefined"
                @input="onInput"
                @click="openPickerOnClick"
            >
            <slot name="icon">
                <img v-if="icon" :class="$style.icon" :src="icon" alt="" aria-hidden="true">
            </slot>
        </span>
        <span
            v-if="error || supportText"
            :class="[$style.supportText, error ? $style.errorText : '']"
            class="type-overline-r"
        >{{ error || supportText }}</span>
    </label>
</template>

<style module>
.textField {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8px;
    color: var(--color-neutral-600);
}

:global(.dark) .textField,
:global([data-theme="dark"]) .textField {
    color: var(--color-text-secondary);
}

.title {
    color: var(--color-input-title);
}

.requiredMark {
    color: var(--color-status-error);
}

.field {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    height: 48px;
    gap: 8px;
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

.unit {
    flex-shrink: 0;
    color: var(--color-text-secondary);
    line-height: 18px;
}

.input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: 0;
    background: none;
    padding: 0;
    color: var(--color-text-input);
    /* Fields keep a light surface in dark theme; without this Chrome draws
       native pickers (e.g. the month calendar icon) white-on-white. */
    color-scheme: light;
}

.input[type="month"] {
    cursor: pointer;
}

.input::placeholder {
    color: var(--color-text-disabled);
}

.input:disabled {
    color: var(--color-text-disabled);
    cursor: not-allowed;
}

.icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
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
