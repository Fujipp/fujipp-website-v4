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
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    font-size: 16px;
    font-weight: 800;
    line-height: 1;
    text-align: center;
    text-transform: lowercase;
    transition: color 300ms ease, background-color 300ms ease;
}

.online {
    color: var(--color-status-success);
}

.offline {
    color: var(--color-status-error);
}
</style>
