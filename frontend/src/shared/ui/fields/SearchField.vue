<script setup lang="ts">
interface Props {
    ariaLabel?: string;
    modelValue?: string;
    placeholder?: string;
}

withDefaults(defineProps<Props>(), {
    ariaLabel: "Search projects",
    modelValue: "",
    placeholder: "Search",
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();
</script>

<template>
    <label :class="$style.searchText">
        <img
            :class="$style.searchIcon"
            src="/images/icons/common/search.svg"
            alt=""
            aria-hidden="true"
            draggable="false"
        >
        <input
            :value="modelValue"
            :class="$style.input"
            class="type-body-small-r"
            type="search"
            :aria-label="ariaLabel"
            :placeholder="placeholder"
            @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        >
    </label>
</template>

<style module>
.searchText {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 311px;
    height: 48px;
    padding: 12px 16px;
    gap: 16px;
    overflow: hidden;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-3xl);
    background-color: var(--color-input-bg);
    color: var(--color-input-placeholder);
}

.searchText:focus-within {
    border-color: var(--color-input-border-focus);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-input-border-focus) 18%, transparent);
}

.searchIcon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    object-fit: contain;
    -webkit-user-drag: none;
}

.input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--color-text-input);
    caret-color: var(--color-text-input);
    font-family: var(--font-sans);
    -webkit-text-fill-color: var(--color-text-input);
}

.input::placeholder {
    color: var(--color-input-placeholder);
    -webkit-text-fill-color: var(--color-input-placeholder);
}

@media (max-width: 767px) {
    .searchText {
        width: min(254px, 100%);
        height: 36px;
    }
}
</style>
