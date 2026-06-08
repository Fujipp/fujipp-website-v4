<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { PrimaryButton, type SelectFieldOption } from "@/shared/ui";
import ConfigField from "./ConfigField.vue";
import type { FeatureDefinition } from "@/features/shop/config/featureConfig";

interface Props {
    feature: FeatureDefinition;
    modelValue?: Record<string, string>;
    channelOptions?: readonly SelectFieldOption[];
    roleOptions?: readonly SelectFieldOption[];
    saving?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: () => ({}),
    channelOptions: () => [],
    roleOptions: () => [],
    saving: false,
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
    if (valueType === "ROLE_ID") return props.roleOptions;
    return [];
}

function validate(): boolean {
    let ok = true;
    for (const field of props.feature.fields) {
        // sensitive required fields may stay blank (means "keep the saved secret")
        const needsValue = field.isRequired && !field.isSensitive;
        if (needsValue && !String(form[field.variableKey] ?? "").trim()) {
            errors[field.variableKey] = "จำเป็นต้องกรอก";
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
            <PrimaryButton type="submit" :disabled="saving">
                {{ saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า" }}
            </PrimaryButton>
        </div>
    </form>
</template>

<style module>
.form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    padding: 24px;
    border-radius: 16px;
    background: var(--color-main-secondary);
    color: var(--color-text-primary);
}

.header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
}

.title {
    margin: 0;
}

.code {
    opacity: 0.6;
}

.fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
}

.actions {
    display: flex;
    justify-content: flex-end;
}
</style>
