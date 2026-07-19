<script setup lang="ts">
export type StatusTagValue = "Active" | "Completed" | "In Progress" | "Archived";

interface Props {
    table?: boolean;
    status: StatusTagValue;
}

withDefaults(defineProps<Props>(), {
    table: false,
});

function statusClass(status: StatusTagValue): string {
    return `status${status.replace(/\s+/g, "")}`;
}
</script>

<template>
    <span :class="[$style.statusTag, table ? $style.tableTag : '', $style[statusClass(status)]]">
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
    background-color: color-mix(in srgb, var(--status-tag-accent, var(--color-main-divider)) 10%, var(--color-main-background));
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--type-size-body-main);
    font-weight: 300;
    text-align: left;
    white-space: nowrap;
    transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
}

.statusDot {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: var(--radius-full);
    background-color: var(--status-tag-dot, var(--status-tag-accent, var(--color-main-divider)));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--status-tag-dot, var(--status-tag-accent, var(--color-main-divider))) 18%, transparent);
}

.label {
    flex-shrink: 0;
}

.tableTag {
    position: relative;
    isolation: isolate;
    width: 118px;
    height: 28px;
    justify-content: center;
    padding: 0 10px;
    gap: 8px;
    border-color: transparent;
    border-radius: var(--radius-full);
    background: transparent;
    box-shadow: none;
    color: color-mix(in srgb, var(--status-tag-accent, var(--color-main-divider)) 68%, var(--color-text-primary));
    font-family: var(--font-sans);
    font-size: var(--type-size-caption);
    font-weight: 800;
    letter-spacing: 0.01em;
}

.tableTag .statusDot {
    display: none;
}

@media (min-width: 768px) {
    .tableTag {
        width: 132px;
        height: 34px;
        padding: 0 14px;
        gap: 10px;
        font-family: var(--font-sora);
        font-size: var(--type-size-caption);
    }
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
