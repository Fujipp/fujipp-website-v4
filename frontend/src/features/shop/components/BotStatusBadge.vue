<script setup lang="ts">
export type BotOnlineStatus = "online" | "offline";

interface Props {
    status?: BotOnlineStatus;
}

withDefaults(defineProps<Props>(), {
    status: "offline",
});
</script>

<template>
    <span
        :class="[$style.badge, status === 'online' ? $style.online : $style.offline]"
        role="status"
    >
        {{ status }}
    </span>
</template>

<style module>
.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: var(--spacing-space-8);
    padding: 0 var(--spacing-space-3);
    border: 1px solid transparent;
    border-radius: var(--radius-xl);
    font-size: var(--type-size-button);
    font-weight: 600;
    line-height: normal;
    text-align: center;
    text-transform: lowercase;
    transition: color 300ms ease, background-color 300ms ease;
}

.online {
    border-color: color-mix(in srgb, var(--color-status-success) 46%, transparent);
    background-color: color-mix(in srgb, var(--color-status-success) 12%, var(--shop-card-bg, var(--color-main-background)));
    color: var(--color-status-success);
}

.offline {
    border-color: color-mix(in srgb, var(--color-status-error) 46%, transparent);
    background-color: color-mix(in srgb, var(--color-status-error) 12%, var(--shop-card-bg, var(--color-main-background)));
    color: var(--color-status-error);
}
</style>
