<script setup lang="ts">
import { PrimaryButton } from "@/shared/ui/buttons";
import BaseDialog from "./BaseDialog.vue";

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
</script>

<template>
    <BaseDialog
        aria-labelled-by="read-more-title"
        aria-described-by="read-more-body"
        @close="emit('close')"
    >
        <div :class="$style.layout">
            <h2 id="read-more-title" :class="$style.title">{{ title }}</h2>
            <hr :class="$style.divider">
            <p id="read-more-body" :class="$style.body">{{ body }}</p>
            <div :class="$style.actions">
                <PrimaryButton width-mode="fill" @click="emit('close')">{{ closeLabel }}</PrimaryButton>
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
    max-height: min(80vh, 640px);
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

.body {
    align-self: stretch;
    flex: 1;
    min-height: 0;
    margin: 0;
    overflow-y: auto;
    color: var(--color-dialog-text-secondary);
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
    gap: var(--spacing-space-2);
}
</style>
