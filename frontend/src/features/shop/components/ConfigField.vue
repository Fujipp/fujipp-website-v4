<script setup lang="ts">
import { computed } from "vue";
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
</script>

<template>
    <div :class="$style.field">
        <TextareaField
            v-if="widget === 'textarea' || widget === 'json'"
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
</style>
