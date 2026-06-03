<script setup lang="ts">
interface Props {
    label: string;
}

defineProps<Props>();
</script>

<template>
    <span :class="$style.categoryTag">
        {{ label }}
    </span>
</template>

<style module>
.categoryTag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    max-width: 100%;
    height: 44px;
    padding: 10px;
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: 20px;
    background: var(--gradient-card-highlight);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 300;
    line-height: normal;
    letter-spacing: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
}
</style>
