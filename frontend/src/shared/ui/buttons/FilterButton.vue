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

function updateGlassPointer(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;

    if (!target) return;

    const rect = target.getBoundingClientRect();
    target.style.setProperty("--glass-pointer-x", `${event.clientX - rect.left}px`);
    target.style.setProperty("--glass-pointer-y", `${event.clientY - rect.top}px`);
}

function resetGlassPointer(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;

    if (!target) return;

    target.style.removeProperty("--glass-pointer-x");
    target.style.removeProperty("--glass-pointer-y");
}
</script>

<template>
    <button
        type="button"
        :class="$style.filterButton"
        :aria-expanded="open"
        @pointermove="updateGlassPointer"
        @pointerleave="resetGlassPointer"
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
    --glass-foreground: var(--color-neutral-700);
    --glass-border: color-mix(in srgb, var(--color-neutral-600) 24%, transparent);
    --glass-border-hover: color-mix(in srgb, var(--color-neutral-700) 34%, transparent);
    --glass-highlight: color-mix(in srgb, var(--color-neutral-50) 82%, transparent);
    --glass-highlight-soft: color-mix(in srgb, var(--color-neutral-50) 48%, transparent);
    --glass-lowlight: color-mix(in srgb, var(--color-neutral-400) 40%, transparent);
    --glass-shadow: color-mix(in srgb, var(--color-neutral-900) 22%, transparent);
    --glass-shadow-hover: color-mix(in srgb, var(--color-neutral-900) 26%, transparent);
    --glass-icon-filter: brightness(0) saturate(100%) invert(34%) sepia(12%) saturate(842%) hue-rotate(182deg) brightness(91%) contrast(88%);
    --glass-pointer-color: color-mix(in srgb, var(--color-main-primary) 24%, var(--color-neutral-50) 54%);
    --glass-pointer-x: 50%;
    --glass-pointer-y: 50%;

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
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    background:
        linear-gradient(
            150deg,
            var(--glass-highlight) 0%,
            var(--glass-highlight-soft) 42%,
            var(--glass-lowlight) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 72%, transparent),
        inset 0 -8px 16px var(--glass-lowlight),
        0 6px 18px var(--glass-shadow);
    backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    color: var(--glass-foreground);
    cursor: pointer;
    transition:
        border-color 220ms ease,
        box-shadow 220ms ease,
        transform 220ms ease;
}

:global(.dark) .filterButton,
:global([data-theme="dark"]) .filterButton {
    --glass-foreground: var(--color-neutral-50);
    --glass-border: color-mix(in srgb, var(--color-neutral-50) 16%, transparent);
    --glass-border-hover: color-mix(in srgb, var(--color-neutral-50) 26%, transparent);
    --glass-highlight: color-mix(in srgb, var(--color-neutral-50) 14%, transparent);
    --glass-highlight-soft: color-mix(in srgb, var(--color-neutral-50) 4%, transparent);
    --glass-lowlight: color-mix(in srgb, var(--color-neutral-900) 28%, transparent);
    --glass-shadow: color-mix(in srgb, var(--color-neutral-900) 35%, transparent);
    --glass-shadow-hover: color-mix(in srgb, var(--color-neutral-900) 40%, transparent);
    --glass-icon-filter: brightness(0) invert(1);
    --glass-pointer-color: color-mix(in srgb, var(--color-neutral-50) 36%, var(--color-main-primary) 24%);
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
            color-mix(in srgb, var(--color-neutral-50) 62%, transparent) 0%,
            transparent 60%
        );
    opacity: 0.7;
    pointer-events: none;
}

.filterButton::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background:
        radial-gradient(
            circle 58px at var(--glass-pointer-x) var(--glass-pointer-y),
            var(--glass-pointer-color) 0%,
            transparent 68%
        );
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
}

.filterButton:hover::after,
.filterButton:focus-visible::after {
    opacity: 0.82;
}

.filterButton:hover {
    border-color: var(--glass-border-hover);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 78%, transparent),
        inset 0 -8px 16px var(--glass-lowlight),
        0 8px 22px var(--glass-shadow-hover);
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
    filter: var(--glass-icon-filter);
    object-fit: contain;
    -webkit-user-drag: none;
}

.arrowIcon {
    width: 10px;
    height: 10px;
    filter: var(--glass-icon-filter);
    object-fit: contain;
    transform: rotate(-90deg);
    transition: transform 160ms ease;
    -webkit-user-drag: none;
}

.arrowOpen {
    transform: rotate(90deg);
}
</style>
