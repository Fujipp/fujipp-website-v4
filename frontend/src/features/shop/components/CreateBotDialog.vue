<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { TextField } from "@/shared/ui";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { BaseDialog } from "@/shared/ui/modals";
import { icons } from "@/config";
import type { RuntimePlan } from "@/features/shop/config/catalog";
import { useLocaleText } from "@/i18n";

const text = useLocaleText();

export interface CreateBotPayload {
    name: string;
    discordToken: string;
    discordApplicationId: string;
    discordGuildId: string;
    discordPublicKey: string;
    discordClientSecret: string;
    // Selected runtime plan to buy on creation ("" = none). Ignored in edit mode.
    runtimePlanId: string;
}

interface Props {
    open?: boolean;
    submitting?: boolean;
    mode?: "create" | "edit";
    initial?: Partial<CreateBotPayload>;
    // Runtime plans to choose from, and how many bot slots are still free.
    runtimePlans?: RuntimePlan[];
    availableSlots?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
    open: false,
    submitting: false,
    mode: "create",
    initial: () => ({}),
    runtimePlans: () => [],
    availableSlots: null,
});

const emit = defineEmits<{ submit: [payload: CreateBotPayload]; cancel: [] }>();

const isEdit = computed(() => props.mode === "edit");

const form = reactive<CreateBotPayload>({
    name: "",
    discordToken: "",
    discordApplicationId: "",
    discordGuildId: "",
    discordPublicKey: "",
    discordClientSecret: "",
    runtimePlanId: "",
});
const error = ref("");

function reset(): void {
    form.name = props.initial.name ?? "";
    form.discordToken = "";
    form.discordApplicationId = props.initial.discordApplicationId ?? "";
    form.discordGuildId = props.initial.discordGuildId ?? "";
    form.discordPublicKey = props.initial.discordPublicKey ?? "";
    form.discordClientSecret = "";
    form.runtimePlanId = "";
    error.value = "";
}

watch(() => props.open, (open) => { if (open) reset(); });

function submit(): void {
    if (!form.name.trim()) { error.value = text("Enter a bot name.", "กรุณาตั้งชื่อบอท"); return; }
    if (!isEdit.value && !form.discordToken.trim()) { error.value = text("Enter the Discord Bot Token.", "กรุณากรอก Discord Bot Token"); return; }
    if (!isEdit.value && !form.discordApplicationId.trim()) { error.value = text("Enter the Application ID (Client ID).", "กรุณากรอก Application ID (Client ID)"); return; }
    error.value = "";
    emit("submit", { ...form });
}
</script>

<template>
    <BaseDialog v-if="open" size="medium" aria-labelled-by="create-bot-title" @close="emit('cancel')">
                <section :class="$style.modalContent">
                    <header :class="$style.header">
                        <h2 id="create-bot-title" :class="$style.title">
                            {{ isEdit ? text("Edit Discord Bot", "แก้ไข Discord Bot") : text("New Discord Bot", "เพิ่ม Discord Bot") }}
                        </h2>
                    </header>
                    <div :class="$style.divider" />

                    <form :class="$style.fields" @submit.prevent="submit">
                        <TextField v-model="form.name" :label="text('Bot Name', 'ชื่อบอท')" required :placeholder="text('Bot name', 'ชื่อบอท')" :disabled="submitting" />
                        <TextField
                            v-model="form.discordToken"
                            :label="isEdit ? text('Bot Token (leave blank to keep current)', 'Bot Token (เว้นว่างเพื่อใช้ค่าเดิม)') : 'Bot Token'"
                            :required="!isEdit"
                            type="password"
                            placeholder="••••••••••••••••••••••"
                            :disabled="submitting"
                        />
                        <TextField
                            v-model="form.discordApplicationId"
                            label="Application ID (Client ID)"
                            :required="!isEdit"
                            :placeholder="text('Numbers only', 'ตัวเลขเท่านั้น')"
                            :disabled="submitting"
                        />
                        <TextField v-model="form.discordGuildId" label="Server ID (Guild)" :placeholder="text('Numbers only', 'ตัวเลขเท่านั้น')" :disabled="submitting" />
                        <TextField v-model="form.discordPublicKey" label="Public Key" :placeholder="text('Optional', 'ไม่บังคับ')" :disabled="submitting" />
                        <TextField
                            v-model="form.discordClientSecret"
                            :label="isEdit ? text('Client Secret (leave blank to keep current)', 'Client Secret (เว้นว่างเพื่อใช้ค่าเดิม)') : 'Client Secret'"
                            type="password"
                            :placeholder="text('Optional', 'ไม่บังคับ')"
                            :disabled="submitting"
                        />

                        <p v-if="error" :class="$style.error">{{ error }}</p>
                    </form>

                    <div :class="$style.divider" />

                    <div :class="$style.actions">
                        <SecondaryButton width-mode="hug" @click="emit('cancel')">{{ text("Close", "ปิด") }}</SecondaryButton>
                        <PrimaryButton
                            width-mode="hug"
                            :leading-icon="icons.add"
                            :disabled="submitting"
                            @click="submit"
                        >
                            {{ submitting ? text("Saving…", "กำลังบันทึก…") : (isEdit ? text("Save", "บันทึก") : text("Add", "เพิ่ม")) }}
                        </PrimaryButton>
                    </div>
                </section>
    </BaseDialog>
</template>

<style module>
.modalContent {
    display: flex;
    width: 100%;
    max-height: min(80vh, 640px);
    flex-direction: column;
    box-sizing: border-box;
    gap: var(--spacing-space-2);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    background-color: var(--color-dialog-background);
    color: var(--color-dialog-text-primary);
}

.header {
    display: flex;
    align-items: center;
    justify-content: center;
}

.title {
    margin: 0;
    color: var(--color-dialog-text-primary);
    font-family: var(--font-sans);
    font-size: 24px;
    font-weight: 600;
}

.divider {
    height: 1px;
    background-color: var(--color-dialog-divider);
}

.fields {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
    overflow-y: auto;
    padding-right: var(--spacing-space-1);
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--color-dialog-text-secondary) 72%, transparent) transparent;
}

.fields::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.fields::-webkit-scrollbar-track {
    background: transparent;
}

.fields::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: var(--radius-full);
    background-color: color-mix(in srgb, var(--color-dialog-text-secondary) 72%, transparent);
    background-clip: content-box;
}

.fields::-webkit-scrollbar-thumb:hover {
    background-color: var(--color-dialog-text-secondary);
}

.error {
    margin: 0;
    color: var(--color-status-error);
    font-size: 14px;
}

.plans {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
    margin: 0;
    padding: 0;
    border: 0;
}

.plansLegend {
    padding: 0;
    margin-bottom: var(--spacing-space-1);
    color: var(--color-dialog-text-secondary);
    font-size: 13px;
}

.plan {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease;
}

.planActive {
    border-color: var(--color-dialog-text-primary);
    background-color: color-mix(in srgb, var(--color-dialog-text-primary) 8%, var(--color-dialog-background));
}

.planRadio {
    accent-color: var(--color-dialog-text-primary);
}

.planName {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
}

.planPrice {
    font-size: 15px;
    font-weight: 600;
}

.actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-space-2);
}
</style>
