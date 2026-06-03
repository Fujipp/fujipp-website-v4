<script setup lang="ts">
interface Props {
    autocomplete?: string;
    disabled?: boolean;
    error?: string;
    label: string;
    modelValue?: string;
    name?: string;
    placeholder?: string;
    type?: "month" | "text" | "url";
}

withDefaults(defineProps<Props>(), {
    autocomplete: "off",
    disabled: false,
    error: "",
    modelValue: "",
    name: undefined,
    placeholder: "Placeholder",
    type: "text",
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();
</script>

<template>
    <label :class="$style.textField">
        <span :class="$style.title" class="type-overline-r">{{ label }}</span>
        <input
            :class="[$style.field, error ? $style.errorField : '']"
            class="type-body-small-r"
            :autocomplete="autocomplete"
            :disabled="disabled"
            :name="name"
            :placeholder="placeholder"
            :type="type"
            :value="modelValue"
            @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        >
        <span v-if="error" :class="$style.supportText" class="type-overline-r">{{ error }}</span>
    </label>
</template>

<style module>
.textField {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8px;
    color: var(--color-text-primary);
}

.title {
    font-family: var(--font-sans);
}

.field {
    box-sizing: border-box;
    width: 100%;
    height: 48px;
    padding: 12px 16px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    outline: 0;
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
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
    color: var(--color-status-error);
}
</style>
