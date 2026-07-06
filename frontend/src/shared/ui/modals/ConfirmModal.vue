<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { SecondaryButton } from "@/shared/ui/buttons";
import { icons } from "@/config";

type ModalVariant = "default" | "danger" | "close";

interface Props {
    cancelLabel?: string;
    confirmLabel?: string;
    disabled?: boolean;
    reason: string;
    title?: string;
    variant?: ModalVariant;
}

const props = withDefaults(defineProps<Props>(), {
    cancelLabel: "Cancel",
    confirmLabel: "",
    disabled: false,
    title: "Confirm",
    variant: "default",
});

const emit = defineEmits<{
    cancel: [];
    confirm: [];
}>();

const defaultConfirmLabels: Record<ModalVariant, string> = {
    default: "Confirm",
    danger: "Delete",
    close: "Close",
};

function confirmText(): string {
    return props.confirmLabel || defaultConfirmLabels[props.variant];
}

const confirmLeadingIcon = computed<string | undefined>(() =>
    props.variant === "danger" ? icons.delete : undefined,
);

function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") {
        emit("cancel");
    }
}

onMounted(() => {
    window.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
});

onUnmounted(() => {
    window.removeEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "";
});
</script>

<template>
    <Teleport to="body">
        <div :class="$style.backdrop" @click.self="emit('cancel')">
            <section
                :class="$style.modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-modal-title"
                aria-describedby="confirm-modal-reason"
            >
                <h2 id="confirm-modal-title" :class="$style.title">{{ title }}</h2>
                <hr :class="$style.divider">
                <p id="confirm-modal-reason" :class="$style.reason">{{ reason }}</p>
                <div :class="$style.actions">
                    <SecondaryButton
                    v-if="variant !== 'close'"
                        type="button"
                        :class="[$style.button, $style.cancelButton]"
                        @click="emit('cancel')"
                    >
                    {{ cancelLabel }}
                    </SecondaryButton>
                    <SecondaryButton :class="[
                            $style.button,
                            variant === 'danger' ? $style.dangerButton : '',
                            variant === 'default' ? $style.confirmButton : '',
                            variant === 'close' ? $style.cancelButton : '',
                        ]"
                        :disabled="disabled"
                        :leading-icon="confirmLeadingIcon"

                        @click="variant === 'close' ? emit('cancel') : emit('confirm')">
                            {{ confirmText() }}
                    </SecondaryButton>
                </div>
            </section>
        </div>
    </Teleport>
</template>

<style module>
.backdrop {
    position: fixed;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    inset: 0;
    padding: var(--spacing-space-4);
    background-color: rgb(0 0 0 / 60%);
    backdrop-filter: blur(4px);
}

.modal {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    width: min(448px, 100%);
    height: 228px;
    padding: 12px 16px;
    gap: 8px;
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    text-align: left;
}

.title {
    align-self: stretch;
    margin: 0;
    font-size: var(--type-size-h3-card-title);
    font-weight: 600;
}

.divider {
    align-self: stretch;
    height: 1px;
    margin: 0;
    border: 0;
    border-top: 1px solid var(--color-main-divider);
}

.reason {
    display: -webkit-inline-box;
    align-self: stretch;
    flex: 1;
    margin: 0;
    max-height: 112px;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: var(--type-size-subtitle);
    font-weight: 300;
    text-overflow: ellipsis;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
}

.actions {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    align-self: stretch;
    gap: 8px;
}

.button {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 10px;
    overflow: hidden;
    border: 1px solid var(--color-button-border);
    border-radius: var(--radius-xl);
    box-shadow: 0 4px 4px rgb(0 0 0 / 10%);
    color: var(--color-button-text);
    font-family: var(--font-sans);
    font-size: var(--type-size-button);
    font-weight: 600;
    cursor: pointer;
    transition: background-color 180ms ease, border-color 180ms ease, opacity 180ms ease;
}

.button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.button:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.cancelButton {
    background-color: var(--color-button-secondary);
}

.cancelButton:hover:not(:disabled) {
    background-color: color-mix(in srgb, var(--color-button-secondary) 88%, var(--color-button-text));
}

.confirmButton {
    background-color: var(--color-main-primary);
}

.confirmButton:hover:not(:disabled) {
    background-color: color-mix(in srgb, var(--color-main-primary) 88%, var(--color-button-text));
}

.dangerButton {
    background-color: var(--color-status-error);
    color: var(--color-button-btn-text-danger);
}

.dangerButton:hover:not(:disabled) {
    background-color: var(--color-button-btn-hover-danger);
}
</style>
