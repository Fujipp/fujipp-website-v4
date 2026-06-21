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

function statusClass(status: StatusTagValue): string {
    return `status${status.replace(/\s+/g, "")}`;
}
</script>

<template>
    <span :class="[$style.tableStatus, $style[statusClass(status)]]">
        <span :class="[$style.statusDot, $style[dotClass(status)]]" />
        <span :class="$style.label" class="type-caption-r">{{ status }}</span>
    </span>
</template>

<style module>
.tableStatus {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: fit-content;
    min-width: 0;
    min-height: 30px;
    padding: 5px 14px;
    gap: 7px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--projects-card-border, var(--color-main-border)) 72%, transparent);
    border-radius: var(--radius-full);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    text-align: left;
    box-shadow: 0 8px 24px -12px rgb(121 135 172 / 70%);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease, box-shadow 300ms ease;
}

:global(.dark) .tableStatus,
:global([data-theme="dark"]) .tableStatus {
    border-color: var(--color-main-border);
    background-color: rgb(255 255 255 / 8%);
}

.statusDot {
    position: relative;
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background-color: var(--color-text-disabled);
}

.statusDot::after {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-full);
    background-color: inherit;
    content: "";
    animation: status-ping 1.8s ease-out infinite;
}

.activeDot,
.progressDot {
    background-color: var(--color-status-warning);
}

.completedDot {
    background-color: var(--color-status-success);
}

.archivedDot {
    background-color: var(--color-text-disabled);
}

.statusArchived .statusDot::after {
    animation: none;
}

.label {
    flex-shrink: 0;
    line-height: 1;
}

@keyframes status-ping {
    0% {
        opacity: 0.7;
        transform: scale(1);
    }

    70%,
    100% {
        opacity: 0;
        transform: scale(2.6);
    }
}
</style>
