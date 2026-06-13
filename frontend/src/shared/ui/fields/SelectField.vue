<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

export interface SelectFieldOption {
    label: string;
    value: string;
}

interface Props {
    disabled?: boolean;
    error?: string;
    label: string;
    modelValue?: string;
    name?: string;
    options: readonly SelectFieldOption[];
    placeholder?: string;
    tone?: "light" | "dark";
}

const emit = defineEmits<{
    select: [value: string];
    "update:modelValue": [value: string];
}>();

const isOpen = ref(false);
const dropdown = ref<HTMLElement | null>(null);
const selectedLabel = computed(() => (
    props.options.find((option) => option.value === props.modelValue)?.label ?? props.placeholder
));

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    error: "",
    modelValue: "",
    name: undefined,
    placeholder: "Placeholder",
    tone: "light",
});

function toggleDropdown(): void {
    if (!props.disabled) {
        isOpen.value = !isOpen.value;
    }
}

function selectOption(value: string): void {
    emit("update:modelValue", value);
    emit("select", value);
    isOpen.value = false;
}

function closeOnOutsideClick(event: MouseEvent): void {
    if (!dropdown.value?.contains(event.target as Node)) {
        isOpen.value = false;
    }
}

function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") {
        isOpen.value = false;
    }
}

onMounted(() => {
    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
});

onUnmounted(() => {
    document.removeEventListener("click", closeOnOutsideClick);
    document.removeEventListener("keydown", closeOnEscape);
});
</script>

<template>
    <div ref="dropdown" :class="[$style.dropdown, tone === 'dark' ? $style.dark : '']">
        <span :class="$style.title" class="type-overline-r">{{ label }}</span>
        <input v-if="name" type="hidden" :name="name" :value="modelValue">
        <button
            type="button"
            :class="[$style.field, error ? $style.errorField : '', isOpen ? $style.openField : '']"
            :disabled="disabled"
            :aria-expanded="isOpen"
            aria-haspopup="listbox"
            @click="toggleDropdown"
        >
            <span
                :class="[$style.selectedText, modelValue ? '' : $style.placeholder]"
                class="type-body-small-r"
            >
                {{ selectedLabel }}
            </span>
            <img
                :class="[$style.icon, isOpen ? $style.openIcon : '']"
                src="/images/icons/navbar/theme/dropdown.svg"
                alt=""
                aria-hidden="true"
            >
        </button>
        <div v-if="isOpen" :class="$style.menu" role="listbox">
            <button
                v-for="option in options"
                :key="option.value"
                type="button"
                :class="[$style.option, option.value === modelValue ? $style.selectedOption : '']"
                class="type-body-small-r"
                role="option"
                :aria-selected="option.value === modelValue"
                @click="selectOption(option.value)"
            >
                {{ option.label }}
            </button>
            <span v-if="options.length === 0" :class="$style.emptyOption" class="type-overline-r">
                No options
            </span>
        </div>
        <span v-if="error" :class="$style.supportText" class="type-overline-r">{{ error }}</span>
    </div>
</template>

<style module>
.dropdown {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8px;
    /* Label sits on the dark main-surface; text-secondary stays legible in both themes. */
    color: var(--color-text-secondary);
}

.title {
    font-family: var(--font-sans);
}

.dark {
    color: var(--color-text-secondary);
}

.dark .field {
    border-color: var(--color-main-border);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.dark .field:hover:not(:disabled) {
    border-color: var(--color-main-primary);
}

.field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    width: 100%;
    height: 48px;
    padding: 0 16px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease;
}

.field:hover:not(:disabled) {
    border-color: var(--color-input-border-hover);
}

.field:focus-visible,
.openField {
    border-width: 1.5px;
    border-color: var(--color-input-border-focus);
    outline: 0;
}

.field:disabled {
    border-color: var(--color-input-border-disabled);
    background-color: var(--color-input-bg-disabled);
    color: var(--color-text-disabled);
    cursor: not-allowed;
}

.selectedText {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.placeholder {
    color: var(--color-text-disabled);
}

.icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    pointer-events: none;
    transition: transform 160ms ease;
}

.openIcon {
    transform: rotate(180deg);
}

.menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    max-height: 240px;
    padding: 6px;
    gap: 2px;
    overflow-y: auto;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    box-shadow: 0 16px 40px color-mix(in srgb, var(--color-text-input) 22%, transparent);
    scrollbar-width: none;
}

.menu::-webkit-scrollbar {
    display: none;
}

.option {
    padding: 8px 10px;
    border: 0;
    border-radius: var(--radius-lg);
    background-color: transparent;
    color: var(--color-text-secondary);
    text-align: left;
    cursor: pointer;
    transition: background-color 160ms ease;
}

.option:hover,
.option:focus-visible,
.selectedOption {
    outline: 0;
    background-color: var(--color-table-row-hover);
}

.emptyOption {
    padding: 8px 10px;
    color: var(--color-text-disabled);
}

.errorField,
.errorField:hover,
.errorField:focus-visible {
    border-width: 1.5px;
    border-color: var(--color-status-error);
}

.supportText {
    color: var(--color-status-error);
}
</style>
