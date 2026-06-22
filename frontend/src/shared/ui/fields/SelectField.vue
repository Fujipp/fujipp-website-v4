<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

export interface SelectFieldOption {
    label: string;
    value: string;
}

interface Props {
    disabled?: boolean;
    error?: string;
    hideLabel?: boolean;
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
const menu = ref<HTMLElement | null>(null);
const menuStyle = ref<Record<string, string>>({});
const selectedLabel = computed(() => (
    props.options.find((option) => option.value === props.modelValue)?.label ?? props.placeholder
));

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    error: "",
    hideLabel: false,
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

function updateMenuPosition(): void {
    const rect = dropdown.value?.getBoundingClientRect();
    if (!rect) return;
    const viewportGap = 12;
    const width = Math.max(rect.width, 180);
    const below = window.innerHeight - rect.bottom - viewportGap;
    const above = rect.top - viewportGap;
    const openUp = below < 180 && above > below;
    const maxHeight = Math.max(140, Math.min(240, openUp ? above - 8 : below - 8));

    menuStyle.value = {
        left: `${Math.min(rect.left, window.innerWidth - width - viewportGap)}px`,
        top: openUp ? "auto" : `${rect.bottom + 8}px`,
        bottom: openUp ? `${window.innerHeight - rect.top + 8}px` : "auto",
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
    };
}

function selectOption(value: string): void {
    emit("update:modelValue", value);
    emit("select", value);
    isOpen.value = false;
}

function closeOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (!dropdown.value?.contains(target) && !menu.value?.contains(target)) {
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
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
});

onUnmounted(() => {
    document.removeEventListener("click", closeOnOutsideClick);
    document.removeEventListener("keydown", closeOnEscape);
    window.removeEventListener("resize", updateMenuPosition);
    window.removeEventListener("scroll", updateMenuPosition, true);
});

watch(isOpen, async (open) => {
    if (!open) return;
    await nextTick();
    updateMenuPosition();
});
</script>

<template>
    <div ref="dropdown" :class="[$style.dropdown, tone === 'dark' ? $style.dark : '']">
        <span :class="[$style.title, hideLabel ? $style.srOnly : '']" class="type-overline-r">{{ label }}</span>
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
        <Teleport to="body">
            <div
                v-if="isOpen"
                ref="menu"
                :class="[$style.menu, tone === 'dark' ? $style.darkMenu : '']"
                :style="menuStyle"
                role="listbox"
            >
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
        </Teleport>
        <span v-if="error" :class="$style.supportText" class="type-overline-r">{{ error }}</span>
    </div>
</template>

<style module>
.dropdown {
    --select-panel: var(--color-input-bg);
    --select-inset: var(--color-neutral-100);
    --select-border: var(--color-input-border);
    --select-text: var(--color-text-input);
    --select-muted: var(--color-neutral-600);
    --select-accent: var(--color-main-primary);

    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8px;
    color: var(--select-muted);
}

:global(.dark) .dropdown,
:global([data-theme="dark"]) .dropdown {
    --select-panel: var(--color-main-surface);
    --select-inset: #1f1f1f;
    --select-border: var(--color-main-divider);
    --select-text: var(--color-text-secondary);
    --select-muted: #9aa6b4;

    color: var(--select-muted);
}

.title {
    font-family: var(--font-sans);
}

.srOnly {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.dark {
    --select-panel: var(--color-main-surface);
    --select-inset: #1f1f1f;
    --select-border: var(--color-main-divider);
    --select-text: var(--color-text-secondary);
    --select-muted: #9aa6b4;

    color: var(--select-muted);
}

.dark .field {
    border-color: var(--select-border);
    background-color: var(--select-panel);
    color: var(--select-text);
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
    border: 1px solid var(--select-border);
    border-radius: var(--radius-xl);
    background-color: var(--select-panel);
    color: var(--select-text);
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease;
}

.field:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--select-accent) 45%, var(--select-border));
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
    position: fixed;
    z-index: 1100;
    --select-panel: var(--color-input-bg);
    --select-inset: var(--color-neutral-100);
    --select-border: var(--color-input-border);
    --select-text: var(--color-text-input);
    --select-accent: var(--color-main-primary);

    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 6px;
    gap: 2px;
    overflow-y: auto;
    border: 1px solid var(--select-border);
    border-radius: var(--radius-xl);
    background-color: var(--select-panel);
    scrollbar-width: none;
}

.menu::-webkit-scrollbar {
    display: none;
}

.menu.darkMenu {
    --select-panel: var(--color-main-surface);
    --select-inset: #1f1f1f;
    --select-border: var(--color-main-divider);
    --select-text: var(--color-text-secondary);

    border-color: var(--select-border);
    background-color: var(--select-panel);
}

.option {
    padding: 8px 10px;
    border: 0;
    border-radius: var(--radius-lg);
    background-color: transparent;
    color: var(--select-text);
    text-align: left;
    cursor: pointer;
    transition: background-color 160ms ease;
}

.option:hover,
.option:focus-visible,
.selectedOption {
    outline: 0;
    background-color: var(--select-inset);
}

.darkMenu .option {
    color: var(--select-text);
}

.darkMenu .option:hover,
.darkMenu .option:focus-visible,
.darkMenu .selectedOption {
    background-color: color-mix(in srgb, var(--select-accent) 14%, var(--select-inset));
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
