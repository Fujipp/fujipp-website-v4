<script setup lang="ts">
import { PrimaryButton } from "@/shared/ui/buttons";
import { TextField } from "@/shared/ui/fields";
import { icons } from "@/config";

interface Props {
    amountError?: string;
    canGenerate?: boolean;
    canVerify?: boolean;
    customAmount: string;
    dragActive?: boolean;
    fileName?: string;
    generating?: boolean;
    qrImageUrl?: string;
    step?: 1 | 2 | 3;
    topupAmount: string;
    verifying?: boolean;
}

withDefaults(defineProps<Props>(), {
    amountError: "",
    canGenerate: false,
    canVerify: false,
    dragActive: false,
    fileName: "",
    generating: false,
    qrImageUrl: "",
    step: 1,
    verifying: false,
});

const emit = defineEmits<{
    back: [];
    dragActiveChange: [value: boolean];
    dropFile: [event: DragEvent];
    fileChange: [event: Event];
    generate: [];
    inputAmount: [value: string];
    next: [];
    verify: [];
}>();
</script>

<template>
    <article :class="$style.panel">
        <nav :class="$style.steps" aria-label="Top up progress">
            <template v-for="stepNumber in 3" :key="stepNumber">
                <span :class="[$style.step, stepNumber <= step && $style.stepActive]" :aria-current="stepNumber === step ? 'step' : undefined">
                    Step {{ stepNumber }}
                </span>
                <span v-if="stepNumber < 3" :class="[$style.chevron, stepNumber < step && $style.stepActive]" aria-hidden="true">&gt;</span>
            </template>
        </nav>

        <div :class="$style.stage" aria-live="polite">
            <Transition name="topup-step" mode="out-in">
                <div v-if="step === 1" key="amount" :class="$style.stepContent">
                    <TextField
                        :model-value="customAmount"
                        label="Top-up amount"
                        unit="฿"
                        placeholder="50"
                        support-text="Minimum 50.00 THB"
                        :error="amountError"
                        @update:model-value="emit('inputAmount', $event)"
                    />
                </div>

                <div v-else-if="step === 2" key="qr" :class="$style.stepContent">
                    <div :class="$style.qrBox">
                        <img v-if="qrImageUrl" :class="$style.qrImage" :src="qrImageUrl" :alt="`QR Code ${topupAmount} THB`">
                        <span v-else :class="$style.qrHint">QR Code is unavailable</span>
                    </div>
                    <p :class="$style.amountLabel">{{ topupAmount }} THB</p>
                </div>

                <div v-else key="upload" :class="$style.stepContent">
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
                </div>
            </Transition>
        </div>

        <div :class="$style.actions">
            <PrimaryButton width-mode="hug" :leading-icon="icons.directionLeft" @click="emit('back')">Back</PrimaryButton>
            <PrimaryButton
                v-if="step === 1"
                width-mode="hug"
                :trailing-icon="icons.directionRight"
                :disabled="!canGenerate || generating"
                @click="emit('generate')"
            >
                {{ generating ? "Generating…" : "Next" }}
            </PrimaryButton>
            <PrimaryButton v-else-if="step === 2" width-mode="hug" :trailing-icon="icons.directionRight" @click="emit('next')">
                Next
            </PrimaryButton>
            <PrimaryButton v-else width-mode="hug" :disabled="verifying || !canVerify" @click="emit('verify')">
                {{ verifying ? "Submitting…" : "Submit" }}
            </PrimaryButton>
        </div>
    </article>
</template>

<style module>
.panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    gap: var(--spacing-space-8);
    color: var(--shop-card-text, var(--color-text-primary));
    text-align: left;
}

.steps {
    align-self: stretch;
    display: flex;
    align-items: center;
    gap: var(--spacing-space-1);
    font-size: var(--type-size-caption);
    font-weight: 600;
}

.step,
.chevron {
    color: var(--color-text-disabled);
    transition: color 180ms ease;
}

.stepActive {
    color: var(--color-text-primary);
}

.stage {
    display: flex;
    align-self: stretch;
    min-height: 329px;
    justify-content: center;
}

.stepContent {
    display: flex;
    width: min(100%, 295px);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-space-3);
}

.qrBox {
    display: flex;
    width: 253px;
    height: 253px;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-2xl);
    background-color: var(--color-neutral-50);
}

.qrHint {
    padding: 0 var(--spacing-space-4);
    color: var(--color-text-secondary);
    text-align: center;
}

.qrImage {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.amountLabel {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-body-main);
    font-weight: 600;
}

.uploadBox {
    position: relative;
    display: flex;
    width: 253px;
    height: 253px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    gap: var(--spacing-space-1);
    border: 1px dashed var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-2xl);
    color: var(--shop-card-text, var(--color-text-primary));
    font-size: var(--type-size-caption);
    font-weight: 300;
    text-align: center;
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease;
}

.actions {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: var(--spacing-space-8);
}

.uploadActive {
    border-color: var(--color-main-primary);
    background-color: color-mix(in srgb, var(--color-main-primary) 10%, transparent);
}

.uploadIcon {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
}

.uploadText {
    padding: 0 var(--spacing-space-3);
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
    .actions {
        width: 100%;
        gap: var(--spacing-space-3);
    }
}

:global(.topup-step-enter-active),
:global(.topup-step-leave-active) {
    transition: opacity 180ms ease, transform 180ms ease;
}

:global(.topup-step-enter-from) {
    opacity: 0;
    transform: translateX(var(--spacing-space-3));
}

:global(.topup-step-leave-to) {
    opacity: 0;
    transform: translateX(calc(var(--spacing-space-3) * -1));
}

@media (prefers-reduced-motion: reduce) {
    :global(.topup-step-enter-active),
    :global(.topup-step-leave-active) {
        transition: none;
    }
}
</style>
