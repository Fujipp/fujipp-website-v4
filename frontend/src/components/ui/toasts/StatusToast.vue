<script setup lang="ts">
import { computed } from "vue";

type ToastStatus = "info" | "success" | "warning" | "error";

interface Props {
    closeLabel?: string;
    description?: string;
    dismissible?: boolean;
    status?: ToastStatus;
    title: string;
}

const props = withDefaults(defineProps<Props>(), {
    closeLabel: "Close notification",
    description: "",
    dismissible: true,
    status: "info",
});

const emit = defineEmits<{
    close: [];
}>();

const statusIcon = computed(() => `/images/icons/assets/status/${props.status}.svg`);
</script>

<template>
    <section
        :class="$style.statusToast"
        role="status"
        aria-live="polite"
    >
        <img
            :class="$style.leftIcon"
            :src="statusIcon"
            alt=""
            aria-hidden="true"
            draggable="false"
        >
        <div :class="$style.content">
            <strong :class="$style.title">{{ title }}</strong>
            <p v-if="description" :class="$style.description">{{ description }}</p>
        </div>
        <button
            v-if="dismissible"
            :class="$style.closeButton"
            type="button"
            :aria-label="closeLabel"
            @click="emit('close')"
        >
            <img
                :class="$style.closeIcon"
                src="/images/icons/navbar/close.svg"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
        </button>
    </section>
</template>

<style module>
.statusToast {
    position: relative;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    padding: 16px;
    gap: 16px;
    border-radius: 16px;
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    text-align: left;
}

.leftIcon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}

.content {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    gap: 4px;
}

.title {
    align-self: stretch;
    overflow-wrap: anywhere;
    font-size: 1rem;
    font-weight: 700;
    line-height: normal;
    letter-spacing: 0;
}

.description {
    align-self: stretch;
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 0.875rem;
    font-weight: 300;
    line-height: normal;
    letter-spacing: 0;
}

.closeButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-full);
    background-color: transparent;
    cursor: pointer;
    transition: background-color 160ms ease;
}

.closeButton:hover {
    background-color: rgb(255 255 255 / 10%);
}

.closeButton:active {
    background-color: rgb(255 255 255 / 16%);
}

.closeButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.closeIcon {
    width: 12px;
    height: 12px;
    user-select: none;
    -webkit-user-drag: none;
}
</style>
