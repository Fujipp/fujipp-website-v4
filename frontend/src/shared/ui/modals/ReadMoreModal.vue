<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

interface Props {
    title?: string;
    body: string;
    closeLabel?: string;
}

withDefaults(defineProps<Props>(), {
    title: "",
    closeLabel: "Close",
});

const emit = defineEmits<{ close: [] }>();

function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") emit("close");
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
        <div :class="$style.backdrop" @click.self="emit('close')">
            <section
                :class="$style.modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="read-more-title"
                aria-describedby="read-more-body"
            >
                <h2 id="read-more-title" :class="$style.title">{{ title }}</h2>
                <hr :class="$style.divider">
                <p id="read-more-body" :class="$style.body">{{ body }}</p>
                <div :class="$style.actions">
                    <button
                        type="button"
                        :class="[$style.button, $style.closeButton]"
                        @click="emit('close')"
                    >
                        {{ closeLabel }}
                    </button>
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
    max-height: min(70vh, 520px);
    padding: 12px 16px;
    gap: 8px;
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

.body {
    align-self: stretch;
    flex: 1;
    min-height: 0;
    margin: 0;
    overflow-y: auto;
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-small);
    font-weight: 300;
    line-height: 1.5;
    white-space: pre-line;
}

.actions {
    display: flex;
    align-items: center;
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

.button:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.closeButton {
    background-color: var(--color-button-secondary);
}

.closeButton:hover {
    background-color: color-mix(in srgb, var(--color-button-secondary) 88%, var(--color-button-text));
}
</style>
