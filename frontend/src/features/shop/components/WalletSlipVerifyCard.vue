<script setup lang="ts">
import { useLocaleText } from "@/i18n";

const text = useLocaleText();
interface Props {
    dragActive?: boolean;
    fileName?: string;
    verifying?: boolean;
}

withDefaults(defineProps<Props>(), {
    dragActive: false,
    fileName: "",
    verifying: false,
});

const emit = defineEmits<{
    dragActiveChange: [value: boolean];
    dropFile: [event: DragEvent];
    fileChange: [event: Event];
    verify: [];
}>();
</script>

<template>
    <article :class="$style.slipCard">
        <label
            :class="[$style.dropZone, dragActive ? $style.dropZoneActive : '']"
            for="wallet-slip-file"
            @dragenter.prevent="emit('dragActiveChange', true)"
            @dragover.prevent="emit('dragActiveChange', true)"
            @dragleave.prevent="emit('dragActiveChange', false)"
            @drop.prevent="emit('dropFile', $event)"
        >
            <span :class="$style.dropTitle">{{ text("Payment slip", "ไฟล์สลิปการโอนเงิน") }}</span>
            <span :class="$style.dropAction">{{ fileName || text("Choose file", "เลือกไฟล์") }}</span>
            <span :class="$style.dropHint">{{ text("or", "หรือ") }}<br>{{ text("drag and drop a file", "ลากแล้วปล่อยไฟล์") }}</span>
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
            :class="$style.primaryButton"
            :disabled="verifying"
            @click="emit('verify')"
        >
            {{ verifying ? text("Confirming…", "กำลังยืนยัน…") : text("Confirm", "ยืนยัน") }}
        </button>
    </article>
</template>

<style module>
.slipCard {
    display: flex;
    align-items: stretch;
    box-sizing: border-box;
    padding: var(--spacing-space-6);
    gap: 20px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
}

.dropZone {
    position: relative;
    display: flex;
    min-height: 180px;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-2);
    border: 1px dashed var(--color-main-border);
    border-radius: var(--radius-lg);
    color: var(--color-text-primary);
    text-align: center;
    cursor: pointer;
}

.dropZoneActive {
    border-color: var(--color-main-primary);
    background-color: var(--color-neutral-50);
}

.dropTitle,
.dropAction,
.dropHint {
    font-size: 20px;
    font-weight: 300;
}

.dropAction {
    font-weight: 600;
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

.primaryButton {
    display: inline-flex;
    min-width: 180px;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    align-self: center;
    padding: var(--spacing-space-3) var(--spacing-space-6);
    border: 0;
    border-radius: var(--radius-md);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font-family: inherit;
    font-size: 16px;
    font-weight: 300;
    cursor: pointer;
    transition: background-color 160ms ease, opacity 160ms ease;
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
.dropZone:focus-within {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

@media (max-width: 760px) {
    .slipCard {
        flex-direction: column;
    }

    .primaryButton {
        width: 100%;
    }
}
</style>
