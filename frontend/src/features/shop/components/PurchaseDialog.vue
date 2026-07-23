<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { computed } from "vue";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { BaseDialog } from "@/shared/ui/modals";
import { thb } from "@/features/shop/config/catalog";

const { t } = useI18n();

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
    <BaseDialog
        v-if="open"
        aria-labelled-by="purchase-title"
        @close="emit('cancel')"
    >
        <div :class="$style.content">
            <header :class="$style.header">
                <h2 id="purchase-title" :class="$style.title">{{ t("shop.purchase.title") }}</h2>
                <p :class="$style.subtitle">
                    {{ t("shop.purchase.subtitle") }}
                </p>
            </header>
            <div :class="$style.divider" />

            <dl :class="$style.paymentSummary">
                <div :class="$style.paymentRow">
                    <dt :class="$style.paymentLabel">{{ t("shop.purchase.item") }}</dt>
                    <dd :class="$style.paymentValue">{{ title }}</dd>
                </div>
                <div :class="$style.paymentRow">
                    <dt :class="$style.paymentLabel">{{ t("shop.purchase.option") }}</dt>
                    <dd :class="$style.paymentValue">{{ optionLabel }}</dd>
                </div>
                <div :class="$style.paymentRow">
                    <dt :class="$style.paymentLabel">{{ t("shop.common.paymentAmount") }}</dt>
                    <dd :class="[$style.paymentValue, $style.paymentAmount]">{{ thb(priceSatang) }}</dd>
                </div>
                <div :class="[$style.paymentRow, $style.paymentDivider]">
                    <dt :class="$style.paymentLabel">{{ t("shop.common.walletBalance") }}</dt>
                    <dd :class="$style.paymentValue">{{ thb(balanceSatang) }}</dd>
                </div>
                <div :class="$style.paymentRow">
                    <dt :class="$style.paymentLabel">{{ t("shop.common.balanceAfterPayment") }}</dt>
                    <dd :class="[$style.paymentValue, insufficient ? $style.paymentNegative : '']">
                        {{ thb(balanceAfter) }}
                    </dd>
                </div>
            </dl>

            <p :class="$style.notice">
                {{ t("shop.purchase.notice") }}
            </p>

            <p v-if="insufficient" :class="$style.paymentWarning">
                {{ t("shop.common.insufficientBalance") }}
            </p>

            <div :class="$style.actions">
                <SecondaryButton width-mode="hug" @click="emit('cancel')">{{ t("shop.common.cancel") }}</SecondaryButton>
                <PrimaryButton v-if="insufficient" width-mode="hug" @click="emit('topup')">
                    {{ t("shop.common.addCredit") }}
                </PrimaryButton>
                <PrimaryButton v-else width-mode="hug" :disabled="submitting" @click="emit('confirm')">
                    {{ t("shop.common.confirmPayment") }}
                </PrimaryButton>
            </div>
        </div>
    </BaseDialog>
</template>

<style module>
.content {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    max-height: min(80vh, 640px);
    gap: var(--spacing-space-4);
    overflow-y: auto;
    padding: var(--spacing-space-6);
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
    color: var(--color-dialog-text-secondary);
    font-size: 14px;
    line-height: 1.5;
}

.divider {
    height: 1px;
    background-color: var(--color-dialog-divider);
}

/* Payment summary rows (label left, value right) — same recipe as the Dashboard modals. */
.paymentSummary {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
    margin: 0;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-md);
    background-color: color-mix(in srgb, var(--color-dialog-text-primary) 4%, var(--color-dialog-background));
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
    border-top: 1px solid var(--color-dialog-divider);
}

.paymentLabel {
    margin: 0;
    color: var(--color-dialog-text-secondary);
    font-size: 14px;
    font-weight: 300;
}

.paymentValue {
    margin: 0;
    color: var(--color-dialog-text-primary);
    font-size: 15px;
    font-weight: 600;
    text-align: right;
}

.paymentAmount {
    color: var(--color-dialog-text-primary);
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
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-lg);
    color: var(--color-dialog-text-secondary);
    font-size: 14px;
    line-height: 1.45;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-space-3);
}
</style>
