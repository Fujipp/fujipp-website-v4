<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { TextField, TextareaField, SelectField, type SelectFieldOption } from "@/shared/ui";
import type { FeatureConfigField, ConfigFieldOption } from "@/features/shop/config/featureConfig";

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
        case "ROLE_TIER_LIST":
            return "tierlist";
        case "ENUM":
            return "enum";
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

// ENUM choices live on the field itself (seeded in the backbone), not fetched from Discord.
// The API sends them as a raw JSON array string; an already-parsed array is tolerated too.
const enumOptions = computed<SelectFieldOption[]>(() => {
    const raw = props.field.options;
    let parsed: ConfigFieldOption[] = [];
    if (typeof raw === "string") {
        try {
            const json = JSON.parse(raw);
            if (Array.isArray(json)) parsed = json;
        } catch {
            parsed = [];
        }
    } else if (Array.isArray(raw)) {
        parsed = raw;
    }
    return parsed.map((o) => ({ label: o.label, value: o.value }));
});

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

// ROLE_TIER_LIST is stored as JSON [{ amount, roleId }] but edited as repeatable
// "amount (บาท) + role" rows. Mirrors the STRING_LIST add/remove flow; the role cell is
// a dropdown of the guild's roles (props.options), falling back to a text input for the
// role id when no roles are loaded yet (bot not in the server).
interface TierRow {
    amount: string;
    roleId: string;
}
const tiers = ref<TierRow[]>([]);
let lastTierEmitted = "";

function parseTiers(raw?: string): TierRow[] {
    const s = (raw ?? "").trim();
    if (!s) return [];
    try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
            return parsed.map((t) => ({
                amount: t?.amount != null ? String(t.amount) : "",
                roleId: t?.roleId != null ? String(t.roleId) : "",
            }));
        }
    } catch {
        // not valid JSON yet — start empty
    }
    return [];
}

watch(() => props.modelValue, (v) => {
    if (props.field.valueType !== "ROLE_TIER_LIST") return;
    if (v === lastTierEmitted) return;
    tiers.value = parseTiers(v);
}, { immediate: true });

function emitTiers(): void {
    const cleaned = tiers.value
        .map((t) => ({ amount: Number(t.amount), roleId: t.roleId.trim() }))
        .filter((t) => Number.isFinite(t.amount) && t.amount > 0 && t.roleId);
    lastTierEmitted = cleaned.length ? JSON.stringify(cleaned) : "";
    update(lastTierEmitted);
}

function setTierAmount(index: number, value: string): void {
    tiers.value[index].amount = value;
    emitTiers();
}

function setTierRole(index: number, value: string): void {
    tiers.value[index].roleId = value;
    emitTiers();
}

function addTier(): void {
    tiers.value.push({ amount: "", roleId: "" });
}

function removeTier(index: number): void {
    tiers.value.splice(index, 1);
    emitTiers();
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
        <div v-else-if="widget === 'tierlist'" :class="$style.list">
            <span :class="$style.listLabel">{{ labelText }}</span>
            <div v-for="(tier, index) in tiers" :key="index" :class="$style.tierRow">
                <input
                    :value="tier.amount"
                    type="number"
                    min="1"
                    :class="[$style.listInput, $style.tierAmount]"
                    placeholder="ยอด (บาท)"
                    aria-label="ยอดสะสม (บาท)"
                    :disabled="disabled"
                    @input="setTierAmount(index, ($event.target as HTMLInputElement).value)"
                >
                <select
                    v-if="options.length"
                    :value="tier.roleId"
                    :class="$style.tierRole"
                    aria-label="ยศ"
                    :disabled="disabled"
                    @change="setTierRole(index, ($event.target as HTMLSelectElement).value)"
                >
                    <option value="">เลือกยศ…</option>
                    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <input
                    v-else
                    :value="tier.roleId"
                    type="text"
                    :class="[$style.listInput, $style.tierRole]"
                    placeholder="Role ID"
                    aria-label="Role ID"
                    :disabled="disabled"
                    @input="setTierRole(index, ($event.target as HTMLInputElement).value)"
                >
                <button
                    type="button"
                    :class="$style.removeBtn"
                    :disabled="disabled"
                    aria-label="ลบยศ"
                    @click="removeTier(index)"
                >×</button>
            </div>
            <button type="button" :class="$style.addBtn" :disabled="disabled" @click="addTier">+ เพิ่มยศตามยอด</button>
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
            v-else-if="widget === 'enum'"
            :label="labelText"
            :model-value="modelValue"
            :options="enumOptions"
            placeholder="เลือก…"
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

.tierRow {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-2);
}

.tierAmount {
    flex: 0 0 120px;
}

.tierRole {
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

.tierRole:focus-visible {
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
