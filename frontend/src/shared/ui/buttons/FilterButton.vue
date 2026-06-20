<script setup lang="ts">
interface Props {
    label?: string;
    open?: boolean;
}

withDefaults(defineProps<Props>(), {
    label: "Filter",
    open: false,
});

const emit = defineEmits<{
    click: [];
}>();
</script>

<template>
    <button
        type="button"
        :class="$style.filterButton"
        :aria-expanded="open"
        @click="emit('click')"
    >
        <span :class="$style.title">
            <img
                :class="$style.filterIcon"
                src="/images/icons/common/filter.svg"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
            <span class="type-button-r">{{ label }}</span>
        </span>
        <img
            :class="[$style.arrowIcon, { [$style.arrowOpen]: open }]"
            src="/images/icons/navbar/theme/slide.svg"
            alt=""
            aria-hidden="true"
            draggable="false"
        >
    </button>
</template>

<style module>
.filterButton {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    height: 36px;
    padding: 8px 8px 8px 12px;
    gap: 12px;
    overflow: hidden;
    isolation: isolate;
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 16%, transparent);
    border-radius: var(--radius-xl);
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
        border-color 220ms ease,
        box-shadow 220ms ease,
        transform 220ms ease;
}

.filterButton::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background:
        radial-gradient(
            120% 80% at 50% -20%,
            color-mix(in srgb, var(--color-neutral-50) 38%, transparent) 0%,
            transparent 60%
        );
    opacity: 0.7;
    pointer-events: none;
}

.filterButton:hover {
    border-color: color-mix(in srgb, var(--color-neutral-50) 26%, transparent);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 55%, transparent),
        inset 0 -8px 16px color-mix(in srgb, var(--color-neutral-900) 30%, transparent),
        0 8px 22px color-mix(in srgb, var(--color-neutral-900) 40%, transparent);
}

.filterButton:active {
    transform: scale(0.97);
}

.filterButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.filterIcon {
    width: 12px;
    height: 12px;
    filter: brightness(0) invert(1);
    object-fit: contain;
    -webkit-user-drag: none;
}

.arrowIcon {
    width: 10px;
    height: 10px;
    filter: brightness(0) invert(1);
    object-fit: contain;
    transform: rotate(-90deg);
    transition: transform 160ms ease;
    -webkit-user-drag: none;
}

.arrowOpen {
    transform: rotate(90deg);
}
</style>
