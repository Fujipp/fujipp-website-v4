<script setup lang="ts">
import { computed } from "vue";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { icons } from "@/config";
import BaseDialog from "./BaseDialog.vue";

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
</script>

<template>
    <BaseDialog
        aria-labelled-by="confirm-modal-title"
        aria-described-by="confirm-modal-reason"
        @close="emit('cancel')"
    >
        <div :class="$style.layout">
            <h2 id="confirm-modal-title" :class="$style.title">{{ title }}</h2>
            <hr :class="$style.divider">
            <p id="confirm-modal-reason" :class="$style.reason">{{ reason }}</p>
            <div :class="$style.actions">
                <SecondaryButton
                    v-if="variant !== 'close'"
                    type="button"
                    width-mode="fill"
                    @click="emit('cancel')"
                >
                    {{ cancelLabel }}
                </SecondaryButton>
                <PrimaryButton
                    width-mode="fill"
                    :disabled="disabled"
                    :leading-icon="confirmLeadingIcon"
                    @click="variant === 'close' ? emit('cancel') : emit('confirm')"
                >
                    {{ confirmText() }}
                </PrimaryButton>
            </div>
        </div>
    </BaseDialog>
</template>

<style module>
.layout {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    min-height: 228px;
    padding: var(--spacing-space-4);
    gap: var(--spacing-space-2);
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
    border-top: 1px solid var(--color-dialog-divider);
}

.reason {
    display: -webkit-inline-box;
    align-self: stretch;
    flex: 1;
    margin: 0;
    max-height: 112px;
    overflow: hidden;
    color: var(--color-dialog-text-secondary);
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
    gap: var(--spacing-space-2);
}
</style>
