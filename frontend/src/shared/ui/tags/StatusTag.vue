<script setup lang="ts">
export type StatusTagValue = "Active" | "Completed" | "In Progress" | "Archived";

interface Props {
    status: StatusTagValue;
}

defineProps<Props>();

function dotClass(status: StatusTagValue): string {
    return {
        Active: "activeDot",
        Completed: "completedDot",
        "In Progress": "progressDot",
        Archived: "archivedDot",
    }[status];
}
</script>

<template>
    <span :class="$style.tableStatus">
        <span :class="[$style.statusDot, $style[dotClass(status)]]" />
        <span :class="$style.label" class="type-body-main-r">{{ status }}</span>
    </span>
</template>

<style module>
.tableStatus {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    min-width: 143px;
    height: 30px;
    padding: 10px;
    gap: 10px;
    overflow: hidden;
    border-radius: var(--radius-full);
    background: var(--gradient-card-highlight);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    text-align: left;
}

.statusDot {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    border-radius: var(--radius-full);
}

.activeDot {
    background-color: var(--color-status-success);
}

.completedDot {
    background-color: var(--color-status-info);
}

.progressDot {
    background-color: var(--color-status-warning);
}

.archivedDot {
    background-color: var(--color-text-secondary);
}

.label {
    flex-shrink: 0;
}
</style>
