<script setup lang="ts">
import { computed } from "vue";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { thb } from "@/features/shop/config/catalog";

interface Props {
    open?: boolean;
    title: string;
    optionLabel: string;
    priceSatang: number;
    balanceSatang?: number;
    submitting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    open: false,
    balanceSatang: 0,
    submitting: false,
});

// Features are bought into the user's stack (no bot binding here) and assigned
// to a bot later from the Dashboard.
const emit = defineEmits<{ confirm: []; cancel: []; topup: [] }>();

const balanceAfter = computed(() => props.balanceSatang - props.priceSatang);
const insufficient = computed(() => balanceAfter.value < 0);
</script>

<template>
    <Teleport to="body">
        <Transition name="dialog">
            <div v-if="open" :class="$style.backdrop" @click.self="emit('cancel')">
                <section :class="$style.modal" role="dialog" aria-modal="true" aria-labelledby="purchase-title" tabindex="-1" @keydown.esc.stop="emit('cancel')">
                    <header :class="$style.header">
                        <h2 id="purchase-title" :class="$style.title">ยืนยันการสั่งซื้อ</h2>
                        <p :class="$style.subtitle">
                            โปรดตรวจสอบรายละเอียดการชำระเงินก่อนยืนยัน ระบบจะหักยอดจากกระเป๋าเงินของคุณทันที
                        </p>
                    </header>
                    <div :class="$style.divider" />

                    <dl :class="$style.paymentSummary">
                        <div :class="$style.paymentRow">
                            <dt :class="$style.paymentLabel">รายการ</dt>
                            <dd :class="$style.paymentValue">{{ title }}</dd>
                        </div>
                        <div :class="$style.paymentRow">
                            <dt :class="$style.paymentLabel">แบบ</dt>
                            <dd :class="$style.paymentValue">{{ optionLabel }}</dd>
                        </div>
                        <div :class="$style.paymentRow">
                            <dt :class="$style.paymentLabel">ยอดชำระ</dt>
                            <dd :class="[$style.paymentValue, $style.paymentAmount]">{{ thb(priceSatang) }}</dd>
                        </div>
                        <div :class="[$style.paymentRow, $style.paymentDivider]">
                            <dt :class="$style.paymentLabel">ยอดเงินในกระเป๋า</dt>
                            <dd :class="$style.paymentValue">{{ thb(balanceSatang) }}</dd>
                        </div>
                        <div :class="$style.paymentRow">
                            <dt :class="$style.paymentLabel">คงเหลือหลังชำระ</dt>
                            <dd :class="[$style.paymentValue, insufficient ? $style.paymentNegative : '']">
                                {{ thb(balanceAfter) }}
                            </dd>
                        </div>
                    </dl>

                    <p :class="$style.notice">
                        ซื้อเก็บไว้ก่อนได้ — ไปกด Use ที่หน้า Dashboard เมื่อต้องการผูกกับบอท
                    </p>

                    <p v-if="insufficient" :class="$style.paymentWarning">
                        ยอดเงินในกระเป๋าไม่เพียงพอ — กรุณาเติมเงินก่อนทำรายการ
                    </p>

                    <div :class="$style.actions">
                        <SecondaryButton width-mode="hug" @click="emit('cancel')">ยกเลิก</SecondaryButton>
                        <PrimaryButton v-if="insufficient" width-mode="hug" @click="emit('topup')">
                            เติมเงิน
                        </PrimaryButton>
                        <PrimaryButton v-else width-mode="hug" :disabled="submitting" @click="emit('confirm')">
                            ยืนยันชำระเงิน
                        </PrimaryButton>
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
    background: color-mix(in srgb, #000 55%, transparent);
    backdrop-filter: blur(4px);
}

/* Adaptive pairing (matches shared ConfirmModal): main-background + text-primary
   + main-divider flip together in dark mode. */
.modal {
    display: flex;
    width: 100%;
    max-width: 440px;
    flex-direction: column;
    box-sizing: border-box;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-6);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
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
    font-weight: 700;
}

.subtitle {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 14px;
    line-height: 1.5;
}

.divider {
    height: 1px;
    background-color: var(--color-main-divider);
}

/* Payment summary rows (label left, value right) — same recipe as the Dashboard modals. */
.paymentSummary {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
    margin: 0;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-md);
    background-color: color-mix(in srgb, var(--color-text-primary) 4%, var(--color-main-background));
}

.paymentRow {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.paymentDivider {
    margin-top: var(--spacing-space-2);
    padding-top: var(--spacing-space-3);
    border-top: 1px solid var(--color-main-divider);
}

.paymentLabel {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 300;
}

.paymentValue {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 15px;
    font-weight: 600;
    text-align: right;
}

.paymentAmount {
    color: var(--color-text-primary);
    font-size: 18px;
    font-weight: 800;
}

.paymentNegative {
    color: var(--color-status-error);
}

.paymentWarning {
    margin: 0;
    color: var(--color-status-error);
    font-size: 14px;
    font-weight: 600;
}

.notice {
    margin: 0;
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    color: var(--color-text-secondary);
    font-size: 14px;
    line-height: 1.45;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-space-3);
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
