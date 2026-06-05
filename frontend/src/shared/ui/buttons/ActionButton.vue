<script setup lang="ts">
import { computed } from "vue";

export type ActionButtonVariant = "add" | "delete" | "edit" | "restart" | "start" | "stop";

interface Props {
    ariaLabel?: string;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    variant: ActionButtonVariant;
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    type: "button",
});

const actionMeta: Record<ActionButtonVariant, { icon: string; label: string }> = {
    add: {
        icon: "/images/icons/actions/add.svg",
        label: "Add",
    },
    delete: {
        icon: "/images/icons/actions/delete.svg",
        label: "Delete",
    },
    edit: {
        icon: "/images/icons/actions/edit.svg",
        label: "Edit",
    },
    restart: {
        icon: "/images/icons/actions/restart.svg",
        label: "Restart",
    },
    start: {
        icon: "/images/icons/actions/start.svg",
        label: "Start",
    },
    stop: {
        icon: "/images/icons/actions/stop.svg",
        label: "Stop",
    },
};

const action = computed(() => actionMeta[props.variant]);
</script>

<template>
    <button
        :class="[$style.actionButton, $style[variant]]"
        :type="type"
        :disabled="disabled"
        :aria-label="ariaLabel ?? action.label"
    >
        <img
            :class="$style.icon"
            :src="action.icon"
            alt=""
            aria-hidden="true"
            draggable="false"
        >
    </button>
</template>

<style module>
.actionButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--color-main-secondary);
    border-radius: var(--radius-full);
    background-color: var(--color-main-secondary);
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease, opacity 160ms ease;
}

.actionButton:hover:not(:disabled) {
    border-color: var(--color-button-secondary-btn-hover);
    background-color: var(--color-button-secondary-btn-hover);
}

.actionButton:active:not(:disabled) {
    border-color: var(--color-button-secondary-btn-active);
    background-color: var(--color-button-secondary-btn-active);
}

.delete:hover:not(:disabled) {
    border-color: var(--color-button-btn-hover-danger);
    background-color: var(--color-button-btn-hover-danger);
}

.delete:active:not(:disabled) {
    border-color: var(--color-button-btn-active-danger);
    background-color: var(--color-button-btn-active-danger);
}

.actionButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.actionButton:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}
</style>
