<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

interface Props {
    disabled?: boolean;
    reason: string;
}

withDefaults(defineProps<Props>(), {
    disabled: false,
});

const emit = defineEmits<{
    cancel: [];
    confirm: [];
}>();

function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") {
        emit("cancel");
    }
}

onMounted(() => window.addEventListener("keydown", closeOnEscape));
onUnmounted(() => window.removeEventListener("keydown", closeOnEscape));
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
                <div :class="$style.heading">
                    <h2 id="confirm-modal-title" :class="$style.title">CONFIRM</h2>
                    <hr :class="$style.divider">
                </div>
                <p id="confirm-modal-reason" :class="$style.reason">{{ reason }}</p>
                <div :class="$style.actions">
                    <button type="button" :class="[$style.button, $style.cancelButton]" @click="emit('cancel')">
                        No
                    </button>
                    <button
                        type="button"
                        :class="[$style.button, $style.confirmButton]"
                        :disabled="disabled"
                        @click="emit('confirm')"
                    >
                        Yes
                    </button>
                </div>
            </section>
        </div>
    </Teleport>
</template>

<style module>
.backdrop {
    position: fixed;
    z-index: 60;
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
    box-sizing: border-box;
    width: min(448px, 100%);
    min-height: 264px;
    padding: 10px;
    gap: 10px;
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
}

.heading {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.title,
.reason {
    margin: 0;
}

.title {
    font-size: 2rem;
    font-weight: 600;
    line-height: normal;
}

.divider {
    width: 100%;
    height: 1px;
    margin: 0;
    border: 0;
    border-top: 1px solid var(--color-main-divider);
}

.reason {
    flex: 1;
    font-size: 1.25rem;
    font-weight: 300;
}

.actions {
    display: flex;
    justify-content: center;
    gap: 10px;
}

.button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 160px;
    height: 48px;
    padding: 12px 16px;
    border: 1px solid transparent;
    border-radius: var(--radius-xl);
    color: var(--color-button-primary-btn-text-active);
    font-family: var(--font-sans);
    font-size: 1rem;
    font-weight: 300;
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease, opacity 160ms ease;
}

.button:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.cancelButton {
    border-color: var(--color-button-secondary-btn-bg);
    background-color: var(--color-button-secondary-btn-bg);
}

.cancelButton:hover {
    border-color: var(--color-button-secondary-btn-hover);
    background-color: var(--color-button-secondary-btn-hover);
}

.cancelButton:active {
    border-color: var(--color-button-secondary-btn-active);
    background-color: var(--color-button-secondary-btn-active);
}

.confirmButton {
    border-color: var(--color-button-primary-btn-bg);
    background-color: var(--color-button-primary-btn-bg);
}

.confirmButton:hover:not(:disabled) {
    border-color: var(--color-button-primary-btn-hover);
    background-color: var(--color-button-primary-btn-hover);
}

.confirmButton:active:not(:disabled) {
    border-color: var(--color-button-primary-btn-active);
    background-color: var(--color-button-primary-btn-active);
}

@media (max-width: 420px) {
    .button {
        width: 100%;
    }

    .actions {
        width: 100%;
    }
}
</style>
