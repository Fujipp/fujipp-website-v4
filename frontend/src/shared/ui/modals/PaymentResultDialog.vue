<script setup lang="ts">
import { computed, onMounted } from "vue";
import { PrimaryButton } from "@/shared/ui/buttons";
import { icons } from "@/config";
import BaseDialog from "./BaseDialog.vue";

type PaymentResultStatus = "success" | "fail";

interface Props {
    closeLabel?: string;
    message?: string;
    playSound?: boolean;
    status: PaymentResultStatus;
    title?: string;
}

const props = withDefaults(defineProps<Props>(), {
    closeLabel: "Close",
    message: "",
    playSound: true,
    title: "",
});

const emit = defineEmits<{
    close: [];
}>();

const resolvedTitle = computed(() => props.title || (props.status === "success" ? "Top up successful" : "Top up failed"));
const resolvedMessage = computed(() => props.message || (
    props.status === "success"
        ? "Your wallet balance has been updated successfully."
        : "We could not complete this top up. Please check the payment slip and try again."
));
const statusIcon = computed(() => props.status === "success" ? icons.success : icons.error);

function playTone(
    frequency: number,
    startAt: number,
    duration: number,
    context: AudioContext,
    gain: GainNode,
    type: OscillatorType = "sine",
): void {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.connect(gain);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration);
}

function playFeedbackSound(): void {
    if (!props.playSound || typeof AudioContext === "undefined") return;

    try {
        const context = new AudioContext();
        void context.resume().catch(() => undefined);
        const now = context.currentTime;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
        gain.connect(context.destination);

        if (props.status === "success") {
            playTone(523.25, now, 0.16, context, gain);
            playTone(659.25, now + 0.14, 0.18, context, gain);
            playTone(783.99, now + 0.28, 0.24, context, gain);
        } else {
            playTone(392, now, 0.2, context, gain, "triangle");
            playTone(293.66, now + 0.18, 0.32, context, gain, "triangle");
        }

        window.setTimeout(() => void context.close(), 650);
    } catch {
        // Sound feedback is optional; the dialog remains fully usable if audio is blocked.
    }
}

onMounted(() => {
    playFeedbackSound();
});
</script>

<template>
    <BaseDialog
        size="small"
        aria-labelled-by="payment-result-title"
        aria-described-by="payment-result-message"
        @close="emit('close')"
    >
        <div :class="[$style.layout, $style[status]]">
            <img :class="$style.statusIcon" :src="statusIcon" alt="" aria-hidden="true">
            <div :class="$style.content">
                <h2 id="payment-result-title" :class="$style.title">{{ resolvedTitle }}</h2>
                <p id="payment-result-message" :class="$style.message">{{ resolvedMessage }}</p>
            </div>
            <PrimaryButton width-mode="fill" @click="emit('close')">{{ closeLabel }}</PrimaryButton>
        </div>
    </BaseDialog>
</template>

<style module>
.layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-5);
    text-align: center;
}

.statusIcon {
    width: var(--spacing-space-16);
    height: var(--spacing-space-16);
    flex-shrink: 0;
    animation: payment-result-icon 360ms ease-out;
}

.content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.title,
.message {
    margin: 0;
}

.title {
    font-size: var(--type-size-h3-card-title);
    font-weight: 800;
}

.message {
    color: var(--color-dialog-text-secondary);
    font-size: var(--type-size-caption);
    font-weight: 300;
    line-height: 1.5;
}

.success .title {
    color: var(--color-status-success);
}

.fail .title {
    color: var(--color-status-error);
}

@keyframes payment-result-icon {
    from {
        opacity: 0;
        transform: scale(0.7);
    }

    65% { transform: scale(1.08); }
}

@media (prefers-reduced-motion: reduce) {
    .statusIcon {
        animation: none;
    }
}
</style>
