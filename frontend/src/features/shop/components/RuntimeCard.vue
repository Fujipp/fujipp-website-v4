<script setup lang="ts">
export type RuntimeStatus = "idle" | "usage";

interface Props {
    botName?: string;
    duration: string;
    remaining: string;
    status?: RuntimeStatus;
}

withDefaults(defineProps<Props>(), {
    botName: "",
    status: "idle",
});
</script>

<template>
    <article :class="$style.runtimeCard" :aria-label="`${duration} runtime`">
        <h3 :class="$style.title" class="type-subtitle-r">{{ duration }}</h3>
        <p :class="$style.remaining" class="type-subtitle-r">{{ remaining }}</p>

        <div :class="$style.statusRow">
            <span :class="$style.statusBadge">
                <span
                    :class="[$style.statusDot, status === 'usage' ? $style.usageDot : $style.idleDot]"
                    aria-hidden="true"
                />
                {{ status === "usage" ? "Usage" : "Not use" }}
            </span>
            <span v-if="status === 'usage' && botName" :class="$style.botBadge">
                {{ botName }}
            </span>
        </div>
    </article>
</template>

<style module>
.runtimeCard {
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    width: min(100%, 267px);
    min-height: 137px;
    padding: var(--spacing-space-4);
    gap: var(--spacing-space-3);
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-main-divider);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: center;
}

.title,
.remaining {
    margin: 0;
}

.statusRow {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--spacing-space-2);
}

.statusBadge,
.botBadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: 28px;
    padding: var(--spacing-space-1) var(--spacing-space-3);
    border-radius: var(--radius-full);
    background-color: var(--color-main-secondary);
    color: var(--color-button-secondary-btn-text);
    font-size: 14px;
    font-weight: 300;
    line-height: normal;
}

.statusDot {
    width: 10px;
    height: 10px;
    margin-right: var(--spacing-space-2);
    border-radius: var(--radius-full);
}

.usageDot {
    background-color: var(--color-status-success);
}

.idleDot {
    background-color: var(--color-status-error);
}
</style>
