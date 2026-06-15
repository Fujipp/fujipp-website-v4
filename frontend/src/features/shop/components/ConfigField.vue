<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { TextField, TextareaField, SelectField, type SelectFieldOption } from "@/shared/ui";
import type { FeatureConfigField } from "@/features/shop/config/featureConfig";

interface Props {
    field: FeatureConfigField;
    modelValue?: string;
    error?: string;
    // choices for CHANNEL_ID / ROLE_ID (fetched from Discord once the bot is in the guild)
    options?: readonly SelectFieldOption[];
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: "",
    error: "",
    options: () => [],
    disabled: false,
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const update = (value: string) => emit("update:modelValue", value);

const labelText = computed(() => (props.field.isRequired ? `${props.field.label} *` : props.field.label));
const placeholder = computed(() => props.field.defaultValue ?? "");

const booleanOptions: SelectFieldOption[] = [
    { label: "เปิด", value: "true" },
    { label: "ปิด", value: "false" },
];

// Resolve which widget to render. CHANNEL_ID/ROLE_ID fall back to a text input
// when no options are available yet (bot not invited to the server).
const widget = computed(() => {
    switch (props.field.valueType) {
        case "TEXT":
            return "textarea";
        case "JSON":
            return "json";
        case "STRING_LIST":
            return "list";
        case "NUMBER":
            return "number";
        case "BOOLEAN":
            return "boolean";
        case "SECRET":
            return "secret";
        case "CHANNEL_ID":
        case "ROLE_ID":
            return props.options.length ? "select" : "text";
        default:
            return "text"; // STRING, USER_ID
    }
});

const textType = computed(() => (widget.value === "secret" ? "password" : widget.value === "number" ? "number" : "text"));

// STRING_LIST is stored as a JSON string array but edited as one input box per item
// (add / remove rows). The user never types brackets, quotes, or commas.
const items = ref<string[]>([]);
let lastEmitted = "";

function parseList(raw?: string): string[] {
    const s = (raw ?? "").trim();
    if (!s) return [];
    try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    } catch {
        // legacy plain value — treat as a single item
    }
    return [s];
}

watch(() => props.modelValue, (v) => {
    // Ignore the echo of our own emit so in-progress edits / empty rows aren't wiped.
    if (v === lastEmitted) return;
    items.value = parseList(v);
}, { immediate: true });

function emitItems(): void {
    const cleaned = items.value.map((item) => item.trim()).filter(Boolean);
    lastEmitted = cleaned.length ? JSON.stringify(cleaned) : "";
    update(lastEmitted);
}

function setItem(index: number, value: string): void {
    items.value[index] = value;
    emitItems();
}

function addItem(): void {
    items.value.push(""); // empty row to type into — not emitted until it has text
}

function removeItem(index: number): void {
    items.value.splice(index, 1);
    emitItems();
}
</script>

<template>
    <div :class="$style.field">
        <div v-if="widget === 'list'" :class="$style.list">
            <span :class="$style.listLabel">{{ labelText }}</span>
            <div v-for="(item, index) in items" :key="index" :class="$style.listRow">
                <input
                    :value="item"
                    type="text"
                    :class="$style.listInput"
                    :placeholder="`รายการที่ ${index + 1}`"
                    :disabled="disabled"
                    @input="setItem(index, ($event.target as HTMLInputElement).value)"
                >
                <button
                    type="button"
                    :class="$style.removeBtn"
                    :disabled="disabled"
                    aria-label="ลบรายการ"
                    @click="removeItem(index)"
                >×</button>
            </div>
            <button type="button" :class="$style.addBtn" :disabled="disabled" @click="addItem">+ เพิ่มรายการ</button>
            <p v-if="error" :class="$style.listError">{{ error }}</p>
        </div>
        <TextareaField
            v-else-if="widget === 'textarea' || widget === 'json'"
            :label="labelText"
            :model-value="modelValue"
            :rows="widget === 'json' ? 6 : 4"
            :error="error"
            :placeholder="placeholder"
            :disabled="disabled"
            @update:model-value="update"
        />
        <SelectField
            v-else-if="widget === 'boolean'"
            :label="labelText"
            :model-value="modelValue"
            :options="booleanOptions"
            :error="error"
            :disabled="disabled"
            @update:model-value="update"
        />
        <SelectField
            v-else-if="widget === 'select'"
            :label="labelText"
            :model-value="modelValue"
            :options="options"
            placeholder="เลือก…"
            :error="error"
            :disabled="disabled"
            @update:model-value="update"
        />
        <TextField
            v-else
            :label="labelText"
            :model-value="modelValue"
            :type="textType"
            :error="error"
            :placeholder="placeholder"
            :disabled="disabled"
            @update:model-value="update"
        />
        <p v-if="field.description" :class="$style.hint" class="type-overline-r">{{ field.description }}</p>
    </div>
</template>

<style module>
.field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-1);
    width: 100%;
}

.hint {
    color: var(--color-text-disabled);
    margin: 0;
}

.list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
    width: 100%;
}

.listLabel {
    color: var(--color-text-primary);
    font-size: 14px;
}

.listRow {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-2);
}

.listInput {
    flex: 1;
    min-width: 0;
    height: 40px;
    box-sizing: border-box;
    padding: 0 12px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    font: inherit;
}

.listInput:focus-visible {
    outline: none;
    border-color: var(--color-main-primary);
}

.removeBtn {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-md);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
}

.removeBtn:hover:not(:disabled) {
    border-color: var(--color-status-error);
    color: var(--color-status-error);
}

.removeBtn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.addBtn {
    align-self: flex-start;
    padding: 7px 14px;
    border: 1px dashed var(--color-input-border);
    border-radius: var(--radius-full);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s ease;
}

.addBtn:hover:not(:disabled) {
    border-color: var(--color-main-primary);
}

.addBtn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.listError {
    margin: 0;
    color: var(--color-status-error);
    font-size: 12px;
}
</style>
