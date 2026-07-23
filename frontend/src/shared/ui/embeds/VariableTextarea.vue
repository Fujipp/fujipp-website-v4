<script setup lang="ts">
import { computed, nextTick, ref } from "vue";

export interface VariableSuggestion {
    description: string;
    insertText?: string;
    label?: string;
    name: string;
}

const props = withDefaults(defineProps<{
    ariaLabel?: string;
    compact?: boolean;
    label?: string;
    modelValue?: string;
    placeholder?: string;
    rows?: number;
    singleLine?: boolean;
    suggestions?: VariableSuggestion[];
}>(), {
    ariaLabel: "",
    compact: false,
    label: "",
    modelValue: "",
    placeholder: "",
    rows: 4,
    singleLine: false,
    suggestions: () => [],
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

type VariableInputElement = HTMLInputElement | HTMLTextAreaElement;
const textarea = ref<VariableInputElement | null>(null);
const query = ref("");
const tokenStart = ref(-1);
const activeIndex = ref(0);
const open = ref(false);

const filteredSuggestions = computed(() => {
    const needle = query.value.toLowerCase();
    return props.suggestions
        .filter((item) => !needle || `${item.name} ${item.label ?? ""}`.toLowerCase().includes(needle));
});

function variableToken(name: string): string {
    return `{{${name}}}`;
}

function syncAutocomplete(target: VariableInputElement): void {
    const beforeCaret = target.value.slice(0, target.selectionStart ?? target.value.length);
    const match = beforeCaret.match(/\{\{([a-zA-Z0-9_]*)$/);
    if (!match) {
        open.value = false;
        tokenStart.value = -1;
        return;
    }

    query.value = match[1] ?? "";
    tokenStart.value = beforeCaret.length - match[0].length;
    activeIndex.value = 0;
    open.value = filteredSuggestions.value.length > 0;
}

function onInput(event: Event): void {
    const target = event.target as VariableInputElement;
    emit("update:modelValue", target.value);
    syncAutocomplete(target);
}

function onCursorEvent(event: Event): void {
    syncAutocomplete(event.target as VariableInputElement);
}

async function choose(item: VariableSuggestion): Promise<void> {
    const target = textarea.value;
    if (!target || tokenStart.value < 0) return;

    const caret = target.selectionStart ?? props.modelValue.length;
    const token = item.insertText || variableToken(item.name);
    const currentValue = target.value;
    const nextValue = `${currentValue.slice(0, tokenStart.value)}${token}${currentValue.slice(caret)}`;
    const nextCaret = tokenStart.value + token.length;

    emit("update:modelValue", nextValue);
    open.value = false;
    await nextTick();
    target.focus();
    target.setSelectionRange(nextCaret, nextCaret);
}

function onKeydown(event: KeyboardEvent): void {
    if (!open.value || !filteredSuggestions.value.length) return;
    if (event.key === "ArrowDown") {
        event.preventDefault();
        activeIndex.value = (activeIndex.value + 1) % filteredSuggestions.value.length;
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex.value = (activeIndex.value - 1 + filteredSuggestions.value.length) % filteredSuggestions.value.length;
    } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const item = filteredSuggestions.value[activeIndex.value];
        if (item) void choose(item);
    } else if (event.key === "Escape") {
        event.preventDefault();
        open.value = false;
    }
}

function closeAfterPointerEvent(): void {
    window.setTimeout(() => {
        open.value = false;
    }, 120);
}
</script>

<template>
    <label :class="$style.wrapper">
        <span v-if="label" :class="$style.label">{{ label }}</span>
        <input
            v-if="singleLine"
            ref="textarea"
            :class="[$style.field, $style.compact]"
            type="text"
            :value="modelValue"
            :placeholder="placeholder"
            :aria-label="ariaLabel"
            aria-autocomplete="list"
            :aria-expanded="open"
            @input="onInput"
            @click="onCursorEvent"
            @keyup="onCursorEvent"
            @keydown="onKeydown"
            @blur="closeAfterPointerEvent"
        />
        <textarea
            v-else
            ref="textarea"
            :class="[$style.field, compact ? $style.compact : '']"
            :value="modelValue"
            :rows="rows"
            :placeholder="placeholder"
            :aria-label="ariaLabel"
            aria-autocomplete="list"
            :aria-expanded="open"
            @input="onInput"
            @click="onCursorEvent"
            @keyup="onCursorEvent"
            @keydown="onKeydown"
            @blur="closeAfterPointerEvent"
        />
        <div v-if="open" :class="$style.menu" role="listbox">
            <button
                v-for="(item, index) in filteredSuggestions"
                :key="item.name"
                type="button"
                :class="[$style.option, index === activeIndex ? $style.active : '']"
                role="option"
                :aria-selected="index === activeIndex"
                @mousedown.prevent="choose(item)"
            >
                <code>{{ item.label || variableToken(item.name) }}</code>
                <span>{{ item.description }}</span>
            </button>
        </div>
    </label>
</template>

<style module>
.wrapper { position: relative; display: flex; width: 100%; flex-direction: column; gap: 8px; }
.label { color: var(--color-input-title); font-size: 14px; font-weight: 600; }
.field { box-sizing: border-box; width: 100%; min-height: 120px; padding: 12px 16px; resize: vertical; border: 1px solid var(--color-input-border); border-radius: var(--radius-lg); outline: 0; background: var(--color-input-bg); color: var(--color-text-input); font: inherit; line-height: 1.5; }
.field:hover { border-color: var(--color-input-border-hover); }
.field:focus { border-color: var(--color-input-border-focus); }
.field::placeholder { color: var(--color-text-disabled); }
.compact { min-height: 48px; resize: none; }
.menu { position: absolute; z-index: 20; top: calc(100% - 2px); right: 0; left: 0; overflow: auto; max-height: 280px; padding: 6px; border: 1px solid var(--color-input-border); border-radius: var(--radius-lg); background: var(--color-input-bg); box-shadow: 0 16px 40px rgb(0 0 0 / 18%); }
.option { display: grid; width: 100%; grid-template-columns: minmax(140px, auto) 1fr; align-items: center; gap: 14px; padding: 10px 12px; border: 0; border-radius: var(--radius-md); background: transparent; color: var(--color-text-primary); cursor: pointer; text-align: left; }
.option code { color: var(--color-text-primary); font-size: 13px; font-weight: 700; }
.option span { color: var(--color-text-secondary); font-size: 12px; }
.option:hover, .active { background: var(--color-surface-hover, rgb(127 127 127 / 12%)); }
</style>
