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
            :disabled="previousDisabled"
            aria-label="Previous image"
            @click="emit('previous')"
        >
            <img src="/images/icons/navbar/theme/slide.svg" alt="" aria-hidden="true">
        </button>
        <button
            type="button"
            :class="$style.control"
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
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    flex-shrink: 0;
    width: var(--spacing-space-8);
    height: var(--spacing-space-8);
    padding: 0;
    overflow: hidden;
    isolation: isolate;
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 16%, transparent);
    border-radius: var(--radius-full);
    background:
        linear-gradient(
            150deg,
            color-mix(in srgb, var(--color-neutral-50) 14%, transparent) 0%,
            color-mix(in srgb, var(--color-neutral-50) 4%, transparent) 42%,
            color-mix(in srgb, var(--color-neutral-900) 28%, transparent) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 45%, transparent),
        inset 0 -8px 16px color-mix(in srgb, var(--color-neutral-900) 30%, transparent),
        0 6px 18px color-mix(in srgb, var(--color-neutral-900) 35%, transparent);
    backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    color: var(--color-neutral-50);
    cursor: pointer;
    transition:
        background 220ms ease,
        border-color 220ms ease,
        box-shadow 220ms ease,
        opacity 220ms ease,
        transform 220ms ease;
}

.control::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background:
        radial-gradient(
            120% 80% at 50% -20%,
            color-mix(in srgb, var(--color-neutral-50) 38%, transparent) 0%,
            transparent 60%
        );
    opacity: 0.7;
    pointer-events: none;
    z-index: -1;
}

.control:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-neutral-50) 26%, transparent);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 55%, transparent),
        inset 0 -8px 16px color-mix(in srgb, var(--color-neutral-900) 30%, transparent),
        0 8px 22px color-mix(in srgb, var(--color-neutral-900) 40%, transparent);
}

.control:active:not(:disabled) {
    transform: scale(0.94);
}

.control:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.control:disabled {
    cursor: not-allowed;
    opacity: 0.4;
}

.control img {
    width: 6px;
    height: 9px;
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--color-neutral-50) 30%, transparent));
}

.nextIcon {
    transform: rotate(180deg);
}
</style>
