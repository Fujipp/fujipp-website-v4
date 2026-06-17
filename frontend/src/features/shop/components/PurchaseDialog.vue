<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { SelectField, type SelectFieldOption } from "@/shared/ui";
import { thb, type BotOption } from "@/features/shop/config/catalog";

interface Props {
    open?: boolean;
    title: string;
    optionLabel: string;
    priceSatang: number;
    requiresSubject?: boolean;
    bots?: readonly BotOption[];
    balanceSatang?: number;
    submitting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    open: false,
    requiresSubject: false,
    bots: () => [],
    balanceSatang: 0,
    submitting: false,
});

const emit = defineEmits<{ confirm: [botId: string | null]; cancel: [] }>();

const selectedBotId = ref("");
const error = ref("");

watch(
    () => props.open,
    (open) => {
        if (open) {
            selectedBotId.value = props.bots.length === 1 ? (props.bots[0]?.id ?? "") : "";
            error.value = "";
        }
    },
);

const botOptions = computed<SelectFieldOption[]>(() => props.bots.map((b) => ({ label: b.name, value: b.id })));
const insufficient = computed(() => props.balanceSatang < props.priceSatang);
const hasNoBotTarget = computed(() => props.requiresSubject && props.bots.length === 0);
const confirmDisabled = computed(() => props.submitting || hasNoBotTarget.value);
const purchaseNote = computed(() => props.requiresSubject
    ? "รายการนี้จะผูกกับบอทที่เลือกเท่านั้น ถ้ามีหลายบอทต้องซื้อแยกต่อบอท"
    : "รายการนี้จะเพิ่มสิทธิ์ให้บัญชีของคุณทันทีหลังตัดเครดิต");

function confirm(): void {
    if (hasNoBotTarget.value) {
        error.value = "กรุณาสร้างบอทก่อนซื้อรายการนี้";
        return;
    }
    if (props.requiresSubject && !selectedBotId.value) {
        error.value = "กรุณาเลือกบอทปลายทาง";
        return;
    }
    if (insufficient.value) {
        error.value = "ยอดเครดิตไม่พอ กรุณาเติมเงินก่อน";
        return;
    }
    emit("confirm", props.requiresSubject ? selectedBotId.value : null);
}
</script>

<template>
    <Teleport to="body">
        <Transition name="dialog">
            <div v-if="open" :class="$style.backdrop" @click.self="emit('cancel')">
                <section :class="$style.modal" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
                    <header :class="$style.header">
                        <h2 id="purchase-title" :class="$style.title">ยืนยันการสั่งซื้อ</h2>
                        <p :class="$style.subtitle">ตรวจสอบรายการก่อนตัดเครดิต</p>
                    </header>
                    <div :class="$style.divider" />

                    <dl :class="$style.summary">
                        <div :class="$style.row">
                            <dt :class="$style.key">รายการ</dt>
                            <dd :class="$style.value">{{ title }}</dd>
                        </div>
                        <div :class="$style.row">
                            <dt :class="$style.key">แบบ</dt>
                            <dd :class="$style.value">{{ optionLabel }}</dd>
                        </div>
                        <div :class="$style.row">
                            <dt :class="$style.key">เครดิตคงเหลือ</dt>
                            <dd :class="[$style.value, insufficient ? $style.insufficient : '']">{{ thb(balanceSatang) }}</dd>
                        </div>
                        <div :class="[$style.row, $style.priceRow]">
                            <dt :class="$style.priceKey">ยอดชำระ</dt>
                            <dd :class="$style.price">{{ thb(priceSatang) }}</dd>
                        </div>
                    </dl>

                    <p :class="$style.notice">{{ purchaseNote }}</p>
                    <p v-if="hasNoBotTarget" :class="$style.warning">
                        ยังไม่มีบอทให้เลือก กลับไปหน้า Dashboard เพื่อสร้างบอทก่อน
                    </p>

                    <SelectField
                        v-if="requiresSubject && !hasNoBotTarget"
                        v-model="selectedBotId"
                        label="เลือกบอทปลายทาง"
                        placeholder="เลือกบอท…"
                        :options="botOptions"
                    />

                    <p v-if="error" :class="$style.error">{{ error }}</p>

                    <div :class="$style.actions">
                        <button type="button" :class="[$style.button, $style.cancel]" @click="emit('cancel')">ยกเลิก</button>
                        <button type="button" :class="[$style.button, $style.confirm]" :disabled="confirmDisabled" @click="confirm">
                            {{ submitting ? "กำลังสั่งซื้อ…" : "ยืนยันซื้อ" }}
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
    max-width: 440px;
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

.summary {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
    margin: 0;
}

.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
}

.key {
    color: var(--color-text-secondary);
    font-size: 15px;
}

.value {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    text-align: right;
}

.priceRow {
    margin-top: var(--spacing-space-1);
    padding-top: var(--spacing-space-3);
    border-top: 1px solid var(--color-main-divider);
}

.priceKey {
    font-size: 16px;
    font-weight: 600;
}

.price {
    margin: 0;
    font-size: 24px;
    font-weight: 800;
}

.insufficient {
    color: var(--color-status-error);
}

.notice,
.warning {
    margin: 0;
    padding: var(--spacing-space-3);
    border-radius: var(--radius-lg);
    font-size: 14px;
    line-height: 1.45;
}

.notice {
    border: 1px solid var(--color-main-divider);
    color: color-mix(in srgb, var(--color-text-secondary) 82%, transparent);
}

.warning {
    border: 1px solid var(--color-status-warning);
    color: var(--color-status-warning);
}

.error {
    margin: 0;
    color: var(--color-status-error);
    font-size: 14px;
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

:global(.dialog-enter-active),
:global(.dialog-leave-active) {
    transition: opacity 0.18s ease;
}

:global(.dialog-enter-from),
:global(.dialog-leave-to) {
    opacity: 0;
}
</style>
