<script setup lang="ts">
interface Props {
    disabled?: boolean;
    error?: string;
    label?: string;
    modelValue?: string;
    name?: string;
    placeholder?: string;
    rows?: number;
    supportText?: string;
    ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
    disabled: false,
    error: "",
    modelValue: "",
    name: undefined,
    placeholder: "",
    rows: 5,
    supportText: "",
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();
</script>

<template>
    <label :class="$style.textArea">
        <span v-if="label" :class="$style.title" class="type-overline-r">{{ label }}</span>
        <textarea
            :class="[$style.field, error ? $style.errorField : '']"
            class="type-body-small-r"
            :disabled="disabled"
            :name="name"
            :placeholder="placeholder"
            :rows="rows"
            :value="modelValue"
            :aria-label="ariaLabel"
            :aria-invalid="Boolean(error) || undefined"
            @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        />
        <span
            v-if="error || supportText"
            :class="[$style.supportText, error ? $style.errorText : '']"
            class="type-overline-r"
        >{{ error || supportText }}</span>
    </label>
</template>

<style module>
.textArea {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8px;
    color: var(--color-neutral-600);
}

:global(.dark) .textArea,
:global([data-theme="dark"]) .textArea {
    color: var(--color-text-secondary);
}

.title {
    color: var(--color-input-title);
    font-family: var(--font-sans);
    font-weight: 800;
}

.field {
    box-sizing: border-box;
    width: 100%;
    min-height: 120px;
    padding: 12px 16px;
    resize: vertical;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    outline: 0;
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font-weight: 300;
    transition: border-color 160ms ease;
}

.field::placeholder {
    color: var(--color-text-disabled);
}

.field:hover {
    border-color: var(--color-input-border-hover);
}

.field:focus {
    border-width: 1.5px;
    border-color: var(--color-input-border-focus);
}

.field:disabled {
    border-color: var(--color-input-border-disabled);
    background-color: var(--color-input-bg-disabled);
    color: var(--color-text-disabled);
    cursor: not-allowed;
}

.errorField,
.errorField:hover,
.errorField:focus {
    border-width: 1.5px;
    border-color: var(--color-status-error);
}

.supportText {
    font-size: 10px;
}

.errorText {
    color: var(--color-status-error);
}
</style>
