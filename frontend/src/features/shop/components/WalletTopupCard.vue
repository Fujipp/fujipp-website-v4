<script setup lang="ts">
interface Props {
    amountError?: string;
    canGenerate?: boolean;
    customAmount: string;
    dragActive?: boolean;
    fileName?: string;
    generating?: boolean;
    quickAmounts: readonly number[];
    qrImageUrl?: string;
    selectedAmount?: number | null;
    topupAmount: string;
    topupReference?: string;
    verifying?: boolean;
}

withDefaults(defineProps<Props>(), {
    amountError: "",
    canGenerate: false,
    dragActive: false,
    fileName: "",
    generating: false,
    qrImageUrl: "",
    selectedAmount: null,
    topupReference: "",
    verifying: false,
});

const emit = defineEmits<{
    dragActiveChange: [value: boolean];
    dropFile: [event: DragEvent];
    fileChange: [event: Event];
    generate: [];
    inputAmount: [event: Event];
    selectAmount: [amount: number];
    verify: [];
}>();
</script>

<template>
    <article :class="$style.topupCard">
        <section :class="$style.instructionPanel" aria-label="Payment instructions">
            <p :class="$style.instructionText">
                <strong>วิธีการชำระเงิน</strong><br>
                1) เข้าแอพธนาคาร ชำระเงินด้วย QR CODE ที่สร้างขึ้น ชื่อ นาย อนวัตร กรุดธูป<br>
                2) เมื่อโอนเงินเสร็จแล้ว โปรดนำสลิปที่ได้จากการโอนเงินมาแนบในเว็บ
            </p>
            <span :class="$style.statusDot" aria-hidden="true" />
        </section>

        <section :class="$style.paymentPanel" aria-label="Generate top up QR code">
            <div :class="$style.qrPreview">
                <img
                    v-if="qrImageUrl"
                    :src="qrImageUrl"
                    :alt="`PromptPay QR Code for ${topupAmount} THB`"
                    :class="$style.qrImage"
                >
                <span v-else :class="$style.qrPlaceholder">QR CODE</span>
            </div>

            <div :class="$style.controls">
                <div :class="$style.quickAmountGrid" aria-label="Quick top-up amounts">
                    <button
                        v-for="amount in quickAmounts"
                        :key="amount"
                        type="button"
                        :class="[$style.quickAmount, selectedAmount === amount ? $style.quickAmountActive : '']"
                        @click="emit('selectAmount', amount)"
                    >
                        {{ amount }}
                    </button>
                </div>

                <label :class="$style.fieldGroup" for="wallet-topup-amount">
                    <span :class="$style.fieldLabel">จำนวนขั้นต่ำ: 50</span>
                    <input
                        id="wallet-topup-amount"
                        :value="customAmount"
                        inputmode="numeric"
                        autocomplete="off"
                        :class="$style.input"
                        :aria-invalid="!!amountError"
                        aria-describedby="wallet-topup-error"
                        placeholder="50"
                        @input="emit('inputAmount', $event)"
                    >
                    <span id="wallet-topup-error" :class="$style.errorText">{{ amountError }}</span>
                </label>

                <button
                    type="button"
                    :class="$style.primaryButton"
                    :disabled="!canGenerate"
                    @click="emit('generate')"
                >
                    {{ generating ? "Generating..." : "Generate QR Code" }}
                </button>

                <div v-if="topupReference" :class="$style.referenceBox">
                    <span>Reference</span>
                    <strong>{{ topupReference }}</strong>
                </div>
            </div>
        </section>

        <section :class="$style.slipPanel" aria-label="Slip verification">
            <label
                :class="[$style.dropZone, dragActive ? $style.dropZoneActive : '']"
                for="wallet-slip-file"
                @dragenter.prevent="emit('dragActiveChange', true)"
                @dragover.prevent="emit('dragActiveChange', true)"
                @dragleave.prevent="emit('dragActiveChange', false)"
                @drop.prevent="emit('dropFile', $event)"
            >
                <span>
                    <span :class="$style.dropNormal">ไฟล์สลิปการโอนเงิน<br></span>
                    <span :class="$style.dropStrong">{{ fileName || "เลือกไฟล์" }}<br></span>
                    <span :class="$style.dropNormal">หรือ<br>ลากแล้วปล่อยไฟล์</span>
                </span>
                <input
                    id="wallet-slip-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    :class="$style.fileInput"
                    @change="emit('fileChange', $event)"
                >
            </label>

            <button
                type="button"
                :class="$style.verifyButton"
                :disabled="verifying"
                @click="emit('verify')"
            >
                {{ verifying ? "Confirming..." : "Confirm" }}
            </button>
        </section>
    </article>
</template>

<style module>
.topupCard {
    display: flex;
    width: 100%;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    padding: var(--spacing-space-4);
    gap: var(--spacing-space-4);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: left;
}

.instructionPanel,
.paymentPanel,
.slipPanel {
    box-sizing: border-box;
    width: 100%;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    background-color: var(--color-main-surface);
}

.instructionPanel {
    display: flex;
    align-items: flex-start;
    padding: var(--spacing-space-4);
    gap: var(--spacing-space-3);
    overflow: hidden;
}

.instructionText {
    flex: 1;
    margin: 0;
    color: color-mix(in srgb, var(--color-text-secondary) 82%, transparent);
    font-size: 15px;
    font-weight: 400;
    line-height: 1.6;
}

.instructionText strong {
    font-weight: 600;
}

.statusDot {
    width: 15px;
    height: 15px;
    flex: 0 0 auto;
    border-radius: var(--radius-full);
    background-color: var(--color-status-warning);
}

.paymentPanel {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 20px;
    padding: var(--spacing-space-4);
    color: var(--color-text-secondary);
}

.qrPreview {
    display: flex;
    width: 253px;
    height: 253px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    overflow: hidden;
    border-radius: var(--radius-2xl);
    background-color: var(--color-neutral-50);
}

.qrImage {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.qrPlaceholder {
    color: var(--color-text-disabled);
    font-size: 32px;
    font-weight: 600;
}

.controls {
    display: flex;
    width: min(100%, 360px);
    min-width: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 0 var(--spacing-space-3);
    gap: var(--spacing-space-3);
}

.quickAmountGrid {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-2);
}

.quickAmount,
.primaryButton,
.verifyButton {
    border: 0;
    font-family: inherit;
    cursor: pointer;
    transition:
        background-color 160ms ease,
        border-color 160ms ease,
        color 160ms ease,
        opacity 160ms ease;
}

.quickAmount {
    display: flex;
    flex: 1 1 0;
    height: 44px;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    background-color: var(--color-main-secondary);
    color: var(--color-text-secondary);
    font-size: 15px;
    font-weight: 500;
}

.quickAmount:hover,
.quickAmountActive {
    border-color: var(--color-main-primary);
    background-color: var(--color-main-primary);
    color: var(--color-button-primary-btn-text-active);
    font-weight: 600;
}

.fieldGroup {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
}

.fieldLabel,
.errorText,
.referenceBox {
    font-size: 14px;
    font-weight: 400;
}

.input {
    box-sizing: border-box;
    width: 100%;
    height: 48px;
    padding: 12px 16px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
    font-size: 16px;
    font-weight: 400;
}

.input::placeholder {
    color: var(--color-input-placeholder);
}

.input:hover {
    border-color: var(--color-input-border-hover);
}

.input:focus {
    border-color: var(--color-input-border-focus);
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.errorText {
    color: var(--color-status-error);
}

.primaryButton {
    display: inline-flex;
    align-self: stretch;
    height: 46px;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    border-radius: var(--radius-lg);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font-size: 16px;
    font-weight: 600;
}

.primaryButton:hover:not(:disabled) {
    background-color: var(--color-button-primary-btn-hover);
}

.primaryButton:active:not(:disabled) {
    background-color: var(--color-button-primary-btn-active);
}

.primaryButton:disabled {
    background-color: var(--color-button-primary-btn-disabled);
    cursor: not-allowed;
    opacity: 0.75;
}

.primaryButton:focus-visible,
.quickAmount:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.referenceBox {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-1);
    align-self: stretch;
    padding: var(--spacing-space-2);
    overflow-wrap: anywhere;
    border-radius: var(--radius-md);
    background-color: var(--color-main-secondary);
    color: var(--color-text-secondary);
}

.referenceBox strong {
    font-weight: 600;
}

.slipPanel {
    display: flex;
    align-items: center;
    padding: var(--spacing-space-4);
    gap: var(--spacing-space-3);
    overflow: hidden;
    text-align: center;
}

.dropZone {
    position: relative;
    display: flex;
    height: 218px;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: 1px dashed var(--color-main-border);
    border-radius: var(--radius-2xl);
    color: var(--color-text-secondary);
    cursor: pointer;
}

.dropZoneActive {
    border-color: var(--color-main-primary);
    background-color: var(--color-main-secondary);
}

.dropNormal,
.dropStrong {
    font-size: 15px;
    line-height: 1.6;
}

.dropNormal {
    font-weight: 400;
    color: color-mix(in srgb, var(--color-text-secondary) 82%, transparent);
}

.dropStrong {
    font-weight: 600;
}

.fileInput {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
}

.verifyButton {
    display: inline-flex;
    min-width: 145px;
    height: 46px;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    border-radius: var(--radius-lg);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font-size: 16px;
    font-weight: 600;
}

.verifyButton:hover:not(:disabled) {
    background-color: var(--color-button-primary-btn-hover);
}

.verifyButton:disabled {
    background-color: var(--color-button-primary-btn-disabled);
    cursor: not-allowed;
    opacity: 0.75;
}

@media (max-width: 1120px) {
    .topupCard {
        flex: none;
    }

    .paymentPanel {
        justify-content: center;
    }
}

@media (max-width: 760px) {
    .quickAmountGrid {
        justify-content: center;
        gap: 18px;
    }

    .controls {
        width: 100%;
    }

    .slipPanel {
        flex-direction: column;
    }

    .dropZone,
    .verifyButton {
        width: 100%;
    }
}
</style>
