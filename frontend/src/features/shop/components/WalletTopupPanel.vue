<script setup lang="ts">
import { SecondaryButton } from "@/shared/ui/buttons";
import { icons } from "@/config";

interface Props {
    amountError?: string;
    canGenerate?: boolean;
    canVerify?: boolean;
    customAmount: string;
    dragActive?: boolean;
    fileName?: string;
    generating?: boolean;
    quickAmounts: readonly number[];
    qrImageUrl?: string;
    selectedAmount?: number | null;
    topupAmount: string;
    verifying?: boolean;
    // Bank account name shown in the instructions.
    payeeName?: string;
    supportText?: string;
}

withDefaults(defineProps<Props>(), {
    amountError: "",
    canGenerate: false,
    canVerify: false,
    dragActive: false,
    fileName: "",
    generating: false,
    qrImageUrl: "",
    selectedAmount: null,
    verifying: false,
    payeeName: "อนวัตร กรุดธูป",
    supportText: "โอนตามยอดของ QR แล้วแนบสลิปด้านขวา",
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
    <article :class="$style.panel">
        <p :class="$style.instructions">
            <strong>วิธีการชำระเงิน</strong><br>
            1) เข้าแอพธนาคาร ชำระเงินด้วย QR CODE ที่สร้างขึ้น ชื่อ {{ payeeName }}<br>
            2) เมื่อโอนเงินเสร็จแล้ว โปรดนำสลิปที่ได้จากการโอนเงินมาแนบในเว็บ
        </p>

        <div :class="$style.row">
            <div :class="$style.col">
                <button
                    v-if="!qrImageUrl"
                    type="button"
                    :class="[$style.qrBox, $style.qrButton]"
                    :disabled="!canGenerate"
                    @click="emit('generate')"
                >
                    <span :class="$style.qrHint">
                        {{ generating ? "กำลังสร้าง QR…" : (canGenerate ? "กดเพื่อสร้าง QR" : "กรอกจำนวนก่อน") }}
                    </span>
                </button>
                <div v-else :class="$style.qrBox">
                    <img :class="$style.qrImage" :src="qrImageUrl" :alt="`QR Code ${topupAmount} บาท`">
                </div>

                <div :class="$style.fieldWrap">
                    <label :class="$style.fieldLabel" for="wallet-topup-amount">ระบุจำนวนเงินที่ต้องการเติม</label>
                    <div :class="[$style.field, amountError ? $style.fieldError : '']">
                        <span :class="$style.unit">฿</span>
                        <input
                            id="wallet-topup-amount"
                            :value="customAmount"
                            inputmode="numeric"
                            autocomplete="off"
                            placeholder="ขั้นต่ำ 50 บาท"
                            :class="$style.input"
                            :aria-invalid="!!amountError"
                            aria-describedby="wallet-topup-support"
                            @input="emit('inputAmount', $event)"
                        >
                    </div>
                    <span
                        id="wallet-topup-support"
                        :class="[$style.supportText, amountError ? $style.errorText : '']"
                    >
                        {{ amountError || supportText }}
                    </span>

                </div>
            </div>

            <div :class="$style.col">
                <label
                    :class="[$style.uploadBox, dragActive ? $style.uploadActive : '']"
                    for="wallet-slip-file"
                    @dragenter.prevent="emit('dragActiveChange', true)"
                    @dragover.prevent="emit('dragActiveChange', true)"
                    @dragleave.prevent="emit('dragActiveChange', false)"
                    @drop.prevent="emit('dropFile', $event)"
                >
                    <img :class="$style.uploadIcon" :src="icons.upload" alt="" aria-hidden="true">
                    <span :class="$style.uploadText">{{ fileName || "อัปโหลดสลิป" }}</span>
                    <input
                        id="wallet-slip-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        :class="$style.fileInput"
                        @change="emit('fileChange', $event)"
                    >
                </label>

                <SecondaryButton
                    width-mode="fill"
                    :disabled="verifying || !canVerify"
                    @click="emit('verify')"
                >
                    {{ verifying ? "กำลังยืนยัน…" : "ยืนยัน" }}
                </SecondaryButton>
            </div>
        </div>
    </article>
</template>

<style module>
.panel {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    width: 100%;
    padding: 12px;
    gap: 12px;
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-primary));
    text-align: left;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.instructions {
    align-self: stretch;
    margin: 0;
    font-size: 16px;
    font-weight: 300;
    line-height: 1.6;
}

.instructions strong {
    font-size: 20px;
    font-weight: 600;
}

.row {
    align-self: stretch;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 12px;
}

.col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.qrBox {
    display: flex;
    width: 100%;
    aspect-ratio: 1 / 1;
    min-height: 320px;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    overflow: hidden;
    border-radius: var(--radius-2xl);
    background-color: var(--color-neutral-50);
}

.qrButton {
    border: 1px dashed var(--shop-card-border, var(--color-main-border));
    color: var(--shop-card-muted, var(--color-text-secondary));
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease, opacity 160ms ease;
}

.qrButton:hover:not(:disabled) {
    border-color: var(--color-main-primary);
    background-color: color-mix(in srgb, var(--color-main-primary) 8%, var(--color-neutral-50));
}

.qrButton:disabled {
    cursor: not-allowed;
    opacity: 0.7;
}

.qrHint {
    padding: 0 16px;
    text-align: center;
}

.qrImage {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.fieldWrap {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    padding: 0;
    box-sizing: border-box;
    gap: 8px;
}

.fieldLabel {
    align-self: stretch;
    font-size: 14px;
    font-weight: 800;
    color: var(--shop-card-muted, var(--color-text-secondary));
}

.field {
    align-self: stretch;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: 48px;
    padding: 12px 16px;
    gap: 8px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    background-color: var(--color-input-bg);
}

.field:focus-within {
    border-color: var(--color-input-border-focus);
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.fieldError {
    border-color: var(--color-status-error);
}

.unit {
    flex-shrink: 0;
    color: var(--color-text-input);
    font-size: 16px;
    line-height: 18px;
}

.input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-input);
    font: inherit;
    font-size: 16px;
    font-weight: 300;
}

.input:focus {
    outline: none;
}

.input::placeholder {
    color: var(--color-input-placeholder);
}

.supportText {
    align-self: stretch;
    font-size: 10px;
    color: var(--shop-card-muted, var(--color-text-secondary));
}

.errorText {
    color: var(--color-status-error);
}

.uploadBox {
    position: relative;
    display: flex;
    width: 100%;
    aspect-ratio: 1 / 1;
    min-height: 320px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    gap: 4px;
    border: 1px dashed var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-2xl);
    color: var(--shop-card-text, var(--color-text-primary));
    font-size: 16px;
    font-weight: 300;
    text-align: center;
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease;
}

.uploadActive {
    border-color: var(--color-main-primary);
    background-color: color-mix(in srgb, var(--color-main-primary) 10%, transparent);
}

.uploadIcon {
    width: 24px;
    height: 24px;
}

.uploadText {
    padding: 0 12px;
    overflow-wrap: anywhere;
}

.fileInput {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
}

@media (max-width: 520px) {
    .row {
        grid-template-columns: minmax(0, 1fr);
    }

    .qrBox,
    .uploadBox,
    .fieldWrap {
        width: 100%;
        min-height: 260px;
    }
}
</style>
