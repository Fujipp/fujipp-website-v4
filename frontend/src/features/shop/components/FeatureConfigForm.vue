<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { PrimaryButton, type SelectFieldOption } from "@/shared/ui";
import ConfigField from "./ConfigField.vue";
import type { FeatureDefinition } from "@/features/shop/config/featureConfig";
import { useLocaleText } from "@/i18n";

const text = useLocaleText();

interface Props {
    feature: FeatureDefinition;
    modelValue?: Record<string, string>;
    channelOptions?: readonly SelectFieldOption[];
    roleOptions?: readonly SelectFieldOption[];
    saving?: boolean;
    submitFixedWidth?: string;
    submitIcon?: string;
    submitLabel?: string;
    submitWidthMode?: "fill" | "hug" | "fixed";
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: () => ({}),
    channelOptions: () => [],
    roleOptions: () => [],
    saving: false,
    submitFixedWidth: "160px",
    submitLabel: "Save settings",
    submitWidthMode: "fill",
});

const emit = defineEmits<{ submit: [values: Record<string, string>] }>();

const sortedFields = computed(() => [...props.feature.fields].sort((a, b) => a.sortOrder - b.sortOrder));

const form = reactive<Record<string, string>>({});
const errors = reactive<Record<string, string>>({});

function seed(): void {
    for (const key of Object.keys(form)) delete form[key];
    for (const key of Object.keys(errors)) delete errors[key];
    for (const field of props.feature.fields) {
        form[field.variableKey] = props.modelValue[field.variableKey] ?? field.defaultValue ?? "";
    }
}
watch(() => [props.feature, props.modelValue], seed, { immediate: true, deep: true });

function optionsFor(valueType: string): readonly SelectFieldOption[] {
    if (valueType === "CHANNEL_ID") return props.channelOptions;
    if (valueType === "ROLE_ID" || valueType === "ROLE_TIER_LIST") return props.roleOptions;
    return [];
}

function validate(): boolean {
    let ok = true;
    for (const field of props.feature.fields) {
        // sensitive required fields may stay blank (means "keep the saved secret")
        const needsValue = field.isRequired && !field.isSensitive;
        if (needsValue && !String(form[field.variableKey] ?? "").trim()) {
            errors[field.variableKey] = text("Required", "จำเป็นต้องกรอก");
            ok = false;
        } else {
            errors[field.variableKey] = "";
        }
    }
    return ok;
}

function onSubmit(): void {
    if (!validate()) return;
    emit("submit", { ...form });
}
</script>

<template>
    <form :class="$style.form" @submit.prevent="onSubmit">
        <header :class="$style.header">
            <h2 :class="$style.title" class="type-subtitle-sb">{{ feature.name }}</h2>
            <code :class="$style.code" class="type-overline-r">{{ feature.code }}</code>
        </header>

        <div :class="$style.fields">
            <ConfigField
                v-for="field in sortedFields"
                :key="field.variableKey"
                :field="field"
                v-model="form[field.variableKey]"
                :error="errors[field.variableKey]"
                :options="optionsFor(field.valueType)"
                :disabled="saving"
            />
        </div>

        <div :class="$style.actions">
            <slot name="actions" />
            <PrimaryButton type="submit" :disabled="saving" :fixed-width="submitFixedWidth" :leading-icon="submitIcon" :width-mode="submitWidthMode">
                {{ saving ? text("Saving…", "กำลังบันทึก…") : submitLabel === "Save settings" ? text("Save settings", "บันทึกการตั้งค่า") : submitLabel }}
            </PrimaryButton>
        </div>
    </form>
</template>

<style module>
.form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-5);
    width: 100%;
    color: var(--color-text-primary);
}

.header {
    display: none;
}

.title {
    margin: 0;
}

.code {
    color: var(--color-text-secondary);
}

.fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--spacing-space-5);
}

.actions {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: var(--spacing-space-2);
    overflow: visible;
    padding-top: var(--spacing-space-1);
    padding-bottom: var(--spacing-space-3);
}

@media (max-width: 760px) {
    .actions {
        overflow-x: auto;
        padding-inline: var(--spacing-space-2);
    }

    .fields {
        grid-template-columns: 1fr;
    }
}
</style>
