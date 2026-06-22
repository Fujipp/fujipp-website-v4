<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { TextField } from "@/shared/ui";
import type { RuntimePlan } from "@/features/shop/config/catalog";

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
    if (!form.name.trim()) { error.value = "กรุณาตั้งชื่อบอท"; return; }
    if (!isEdit.value && !form.discordToken.trim()) { error.value = "กรุณากรอก Discord Bot Token"; return; }
    error.value = "";
    emit("submit", { ...form });
}
</script>

<template>
    <Teleport to="body">
        <Transition name="dialog">
            <div v-if="open" :class="$style.backdrop" @click.self="emit('cancel')">
                <section :class="$style.modal" role="dialog" aria-modal="true" aria-labelledby="create-bot-title">
                    <header :class="$style.header">
                        <h2 id="create-bot-title" :class="$style.title">{{ isEdit ? "แก้ไขบอท" : "เพิ่มบอท" }}</h2>
                        <p :class="$style.subtitle">กรอกข้อมูลบอทจาก Discord Developer Portal — token จะถูกเข้ารหัสก่อนเก็บ</p>
                    </header>
                    <div :class="$style.divider" />

                    <form :class="$style.fields" @submit.prevent="submit">
                        <TextField v-model="form.name" label="ชื่อบอท *" placeholder="เช่น Kanom Shop" :disabled="submitting" />
                        <TextField
                            v-model="form.discordToken"
                            :label="isEdit ? 'Bot Token (เว้นว่าง = คงเดิม)' : 'Bot Token *'"
                            type="password"
                            placeholder="••••••••"
                            :disabled="submitting"
                        />
                        <div :class="$style.grid2">
                            <TextField v-model="form.discordApplicationId" label="Application ID (Client ID)" placeholder="ตัวเลข" :disabled="submitting" />
                            <TextField v-model="form.discordGuildId" label="Server ID (Guild)" placeholder="ตัวเลข" :disabled="submitting" />
                        </div>
                        <TextField v-model="form.discordPublicKey" label="Public Key" placeholder="(ไม่บังคับ)" :disabled="submitting" />
                        <TextField
                            v-model="form.discordClientSecret"
                            :label="isEdit ? 'Client Secret (เว้นว่าง = คงเดิม)' : 'Client Secret'"
                            type="password"
                            placeholder="(ไม่บังคับ)"
                            :disabled="submitting"
                        />

                        <p v-if="!isEdit" :class="$style.slotNote">
                            สร้างบอทใช้ 1 Bot Slot — บอทจะ Offline จนกว่าจะซื้อ Runtime จากหน้า Runtime แล้ว assign ให้บอทตัวนี้
                        </p>

                        <p v-if="error" :class="$style.error">{{ error }}</p>
                    </form>

                    <div :class="$style.actions">
                        <button type="button" :class="[$style.button, $style.cancel]" @click="emit('cancel')">ยกเลิก</button>
                        <button type="button" :class="[$style.button, $style.confirm]" :disabled="submitting" @click="submit">
                            {{ submitting ? "กำลังบันทึก…" : (isEdit ? "บันทึก" : "สร้างบอท") }}
                        </button>
                    </div>
                </section>
            </div>
        </Transition>
    </Teleport>
</template>

<style module>
.backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-space-4);
    background: color-mix(in srgb, var(--color-main-background) 70%, transparent);
    backdrop-filter: blur(4px);
}

.modal {
    display: flex;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    flex-direction: column;
    box-sizing: border-box;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-6);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-1);
}

.title {
    margin: 0;
    font-family: var(--font-sans);
    font-size: 22px;
    font-weight: 600;
}

.subtitle {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 14px;
}

.divider {
    height: 1px;
    background-color: var(--color-main-divider);
}

.fields {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    overflow-y: auto;
    padding-right: var(--spacing-space-1);
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--color-main-primary) 72%, transparent) transparent;
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
    background-color: color-mix(in srgb, var(--color-main-primary) 72%, transparent);
    background-clip: content-box;
}

.fields::-webkit-scrollbar-thumb:hover {
    background-color: var(--color-main-primary);
}

.grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-space-3);
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
    color: var(--color-text-secondary);
    font-size: 13px;
}

.slotNote {
    margin: 0 0 var(--spacing-space-1);
    color: var(--color-text-secondary);
    font-size: 13px;
}

.slotFull {
    color: var(--color-status-error);
}

.plan {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease;
}

.planActive {
    border-color: var(--color-main-primary);
    background-color: color-mix(in srgb, var(--color-main-primary) 8%, transparent);
}

.planRadio {
    accent-color: var(--color-main-primary);
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
    justify-content: flex-end;
    gap: var(--spacing-space-3);
}

.button {
    min-width: 120px;
    height: 46px;
    padding: 0 var(--spacing-space-5);
    border: 0;
    border-radius: var(--radius-xl);
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
}

.cancel {
    background-color: var(--color-button-secondary-btn-bg);
    color: var(--color-button-secondary-btn-text);
}

.cancel:hover {
    background-color: var(--color-button-secondary-btn-hover);
}

.confirm {
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
}

.confirm:hover:not(:disabled) {
    background-color: var(--color-button-primary-btn-hover);
}

.confirm:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.button:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

@media (max-width: 520px) {
    .grid2 {
        grid-template-columns: 1fr;
    }
}
</style>
