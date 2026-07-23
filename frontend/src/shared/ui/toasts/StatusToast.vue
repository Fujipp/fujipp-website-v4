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
const toastRole = computed(() => props.status === "error" ? "alert" : "status");
const liveMode = computed(() => props.status === "error" ? "assertive" : "polite");

const closeStyle = { "--toast-close-src": `url(${icons.hamburgerClose})` };
</script>

<template>
    <section
        :class="[$style.statusToast, $style[status]]"
        :role="toastRole"
        :aria-live="liveMode"
        aria-atomic="true"
    >
        <span :class="$style.iconWell" aria-hidden="true">
            <img :class="$style.leftIcon" :src="statusIcon" alt="" draggable="false">
        </span>
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
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    min-height: var(--spacing-space-14);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    gap: var(--spacing-space-3);
    overflow: hidden;
    border: 0;
    border-radius: var(--radius-full);
    background-color: var(--color-main-surface);
    box-shadow: 0 var(--spacing-space-3) var(--spacing-space-8) color-mix(in srgb, var(--color-main-brand-primary) 22%, transparent);
    color: var(--color-button-primary);
    font-family: var(--font-sans);
    text-align: left;
}

.success, .warning, .error, .info { color: var(--color-button-primary); }

.iconWell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--spacing-space-6);
    height: var(--spacing-space-6);
    flex-shrink: 0;
    border: 0;
    background: transparent;
}

.leftIcon {
    flex-shrink: 0;
    width: var(--spacing-icon-sm);
    height: var(--spacing-icon-sm);
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}

.content {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    flex-direction: row;
    align-items: center;
    min-width: 0;
    justify-content: flex-start;
    min-height: var(--spacing-space-6);
    gap: var(--spacing-space-2);
}

.title {
    overflow-wrap: anywhere;
    color: var(--color-button-primary);
    font-size: var(--type-size-caption);
    font-weight: 600;
    line-height: 1.35;
}

.description {
    margin: 0;
    overflow-wrap: anywhere;
    color: color-mix(in srgb, var(--color-button-primary) 68%, transparent);
    font-size: var(--type-size-input-label);
    font-weight: 400;
    line-height: 1.4;
}

.closeButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--spacing-space-8);
    height: var(--spacing-space-8);
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    background-color: transparent;
    cursor: pointer;
    color: var(--color-button-primary);
    transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.closeButton:hover {
    border-color: color-mix(in srgb, var(--color-button-primary) 24%, transparent);
    background-color: color-mix(in srgb, var(--color-button-primary) 12%, transparent);
    color: var(--color-button-primary);
}

.closeButton:active { transform: scale(.94); }

.closeButton:focus-visible {
    outline: 2px solid var(--color-button-primary);
    outline-offset: 2px;
}

.closeIcon {
    width: var(--spacing-icon-xs);
    height: var(--spacing-icon-xs);
    background-color: currentColor;
    mask: var(--toast-close-src) center / contain no-repeat;
    -webkit-mask: var(--toast-close-src) center / contain no-repeat;
}

@media (prefers-reduced-motion: reduce) {
    .closeButton {
        transition: none;
    }
}
</style>
