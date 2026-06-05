<script setup lang="ts">
interface Props {
    previousDisabled?: boolean;
    nextDisabled?: boolean;
}

withDefaults(defineProps<Props>(), {
    previousDisabled: false,
    nextDisabled: false,
});

const emit = defineEmits<{
    previous: [];
    next: [];
}>();
</script>

<template>
    <div :class="$style.controls">
        <button
            type="button"
            :class="$style.control"
            class="bg-button-secondary-btn-bg transition-colors hover:bg-button-secondary-btn-hover active:bg-button-secondary-btn-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="previousDisabled"
            aria-label="Previous image"
            @click="emit('previous')"
        >
            <img src="/images/icons/navbar/theme/slide.svg" alt="" aria-hidden="true">
        </button>
        <button
            type="button"
            :class="$style.control"
            class="bg-button-secondary-btn-bg transition-colors hover:bg-button-secondary-btn-hover active:bg-button-secondary-btn-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="nextDisabled"
            aria-label="Next image"
            @click="emit('next')"
        >
            <img :class="$style.nextIcon" src="/images/icons/navbar/theme/slide.svg" alt="" aria-hidden="true">
        </button>
    </div>
</template>

<style module>
.controls {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-space-6);
}

.control {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: var(--spacing-space-8);
    height: var(--spacing-space-8);
    padding: 0;
    border: 1px solid var(--color-main-secondary);
    border-radius: var(--radius-full);
    cursor: pointer;
}

.control img {
    width: 6px;
    height: 9px;
}

.nextIcon {
    transform: rotate(180deg);
}
</style>
