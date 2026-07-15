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
    --toast-accent: var(--color-status-info);

    position: relative;
    display: flex;
    align-items: flex-start;
    box-sizing: border-box;
    width: 100%;
    min-height: var(--spacing-space-20);
    padding: var(--spacing-space-4);
    gap: var(--spacing-space-3);
    overflow: hidden;
    border-radius: var(--radius-2xl);
    border: 1px solid color-mix(in srgb, var(--toast-accent) 28%, var(--color-dialog-divider));
    background-color: color-mix(in srgb, var(--toast-accent) 3%, var(--color-dialog-background));
    box-shadow:
        0 14px 32px rgb(0 0 0 / 14%),
        inset 0 1px 0 rgb(255 255 255 / 10%);
    color: var(--color-dialog-text-primary);
    font-family: var(--font-sans);
    text-align: left;
}

.statusToast::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--spacing-space-1);
    background-color: var(--toast-accent);
    content: "";
}

.success { --toast-accent: var(--color-status-success); }
.warning { --toast-accent: var(--color-status-warning); }
.error { --toast-accent: var(--color-status-error); }
.info { --toast-accent: var(--color-status-info); }

.iconWell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--spacing-space-10);
    height: var(--spacing-space-10);
    flex-shrink: 0;
    border-radius: var(--radius-xl);
    background-color: color-mix(in srgb, var(--toast-accent) 14%, transparent);
}

.leftIcon {
    flex-shrink: 0;
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
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
    gap: var(--spacing-space-1);
    padding-top: var(--spacing-space-1);
}

.title {
    align-self: stretch;
    overflow-wrap: anywhere;
    color: var(--color-dialog-text-primary);
    font-size: var(--type-size-caption);
    font-weight: 600;
    line-height: 1.3;
}

.description {
    align-self: stretch;
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--color-dialog-text-secondary);
    font-size: var(--type-size-overline);
    font-weight: 300;
    line-height: 1.45;
}

.closeButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--spacing-space-8);
    height: var(--spacing-space-8);
    padding: 0;
    border: 0;
    border-radius: var(--radius-full);
    background-color: transparent;
    cursor: pointer;
    color: var(--color-dialog-text-secondary);
    transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.closeButton:hover {
    background-color: color-mix(in srgb, var(--toast-accent) 12%, transparent);
    color: var(--color-dialog-text-primary);
    transform: scale(1.04);
}

.closeButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
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
