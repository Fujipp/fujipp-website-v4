<script setup lang="ts">
interface Props {
    ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
    ariaLabel: "Loading button",
});
</script>

<template>
    <div :class="$style.buttonSkeleton" role="status" :aria-label="ariaLabel" />
</template>

<style module>
.buttonSkeleton {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    height: 44px;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background:
        linear-gradient(
            262.31deg,
            var(--color-button-primary) 0%,
            var(--color-main-surface) 100%
        );
    background-size: 180% 100%;
    padding: 10px;
    animation: buttonSkeletonShimmer 1.4s ease-in-out infinite alternate;
}

@keyframes buttonSkeletonShimmer {
    from {
        background-position: 0% 50%;
    }

    to {
        background-position: 100% 50%;
    }
}
</style>
