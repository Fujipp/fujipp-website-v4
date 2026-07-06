<script setup lang="ts">
import { computed } from "vue";
import { icons } from "@/config";

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

const statusIcons: Record<ToastStatus, string> = {
    info: icons.info,
    success: icons.success,
    warning: icons.warning,
    error: icons.error,
};

const statusIcon = computed(() => statusIcons[props.status]);

const closeStyle = { "--toast-close-src": `url(${icons.hamburgerClose})` };
</script>

<template>
    <section
        :class="$style.statusToast"
        role="status"
        aria-live="polite"
    >
        <img :class="$style.leftIcon" :src="statusIcon" alt="" aria-hidden="true" draggable="false">
        <div :class="$style.content">
            <b :class="$style.title">{{ title }}</b>
            <p v-if="description" :class="$style.description">{{ description }}</p>
        </div>
        <button
            v-if="dismissible"
            :class="$style.closeButton"
            type="button"
            :aria-label="closeLabel"
            @click="emit('close')"
        >
            <span :class="$style.closeIcon" :style="closeStyle" aria-hidden="true" />
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
    border-radius: var(--radius-2xl);
    border: 1px solid var(--color-main-divider);
    background-color: var(--color-main-background);
    box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
    color: var(--color-text-primary);
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
}

.description {
    align-self: stretch;
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 0.875rem;
    font-weight: 300;
    line-height: normal;
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
    background-color: var(--color-button-secondary);
}

.closeButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.closeIcon {
    width: 12px;
    height: 12px;
    background-color: var(--color-text-primary);
    mask: var(--toast-close-src) center / contain no-repeat;
    -webkit-mask: var(--toast-close-src) center / contain no-repeat;
}
</style>
