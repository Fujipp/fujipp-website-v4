<script setup lang="ts">
export type StatusTagValue = "Active" | "Completed" | "In Progress" | "Archived";

interface Props {
    status: StatusTagValue;
}

defineProps<Props>();

function statusClass(status: StatusTagValue): string {
    return `status${status.replace(/\s+/g, "")}`;
}
</script>

<template>
    <span :class="[$style.statusTag, $style[statusClass(status)]]">
        <span :class="$style.statusDot" />
        <span :class="$style.label">{{ status }}</span>
    </span>
</template>

<style module>
.statusTag {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    width: 148px;
    max-width: 100%;
    height: 30px;
    padding: 0 16px;
    gap: 8px;
    overflow: hidden;
    border: 1px solid var(--status-tag-accent, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--type-size-body-main);
    font-weight: 300;
    text-align: left;
    white-space: nowrap;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.statusDot {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    border-radius: var(--radius-full);
    background-color: var(--status-tag-dot, var(--status-tag-accent, var(--color-main-divider)));
}

.label {
    flex-shrink: 0;
}

.statusActive {
    --status-tag-accent: var(--color-status-success);
}

.statusCompleted {
    --status-tag-accent: var(--color-status-info);
}

.statusInProgress {
    --status-tag-accent: var(--color-status-warning);
}

.statusArchived {
    --status-tag-accent: var(--color-main-divider);
    --status-tag-dot: var(--color-text-disabled);
}
</style>
