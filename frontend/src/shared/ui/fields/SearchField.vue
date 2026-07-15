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
        <span :class="$style.searchIcon" aria-hidden="true" />
        <input
            :value="modelValue"
            :class="$style.input"
            class="type-input-label-r"
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
    width: min(311px, 100%);
    height: 48px;
    padding: 12px 16px;
    gap: 16px;
    overflow: hidden;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-3xl);
    background-color: var(--color-input-bg);
    color: var(--color-input-placeholder);
}

.searchText:hover:not(:focus-within) {
    border-color: var(--color-input-border-hover);
}

.searchText:focus-within {
    border-color: var(--color-input-border-focus);
}

.searchIcon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    background-color: var(--color-text-input);
    mask: url("/icons/action/search.svg") center / contain no-repeat;
    -webkit-mask: url("/icons/action/search.svg") center / contain no-repeat;
}

.input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--color-text-input);
    caret-color: var(--color-text-input);
    -webkit-text-fill-color: var(--color-text-input);
}

.input::placeholder {
    color: var(--color-text-disabled);
    -webkit-text-fill-color: var(--color-text-disabled);
}

.input::-webkit-search-cancel-button {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    appearance: none;
    -webkit-appearance: none;
    background-color: var(--color-text-input);
    cursor: pointer;
    mask: linear-gradient(45deg, transparent 43%, black 44% 56%, transparent 57%), linear-gradient(-45deg, transparent 43%, black 44% 56%, transparent 57%);
    -webkit-mask: linear-gradient(45deg, transparent 43%, black 44% 56%, transparent 57%), linear-gradient(-45deg, transparent 43%, black 44% 56%, transparent 57%);
}

@media (max-width: 767px) {
    .searchText {
        width: min(254px, 100%);
        height: 36px;
    }
}
</style>
