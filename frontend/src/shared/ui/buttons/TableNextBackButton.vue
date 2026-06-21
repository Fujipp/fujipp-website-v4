<script setup lang="ts">
interface Props {
    disabled?: boolean;
    direction: "previous" | "next";
    label: string;
    step?: "single" | "double";
}

withDefaults(defineProps<Props>(), {
    disabled: false,
    step: "single",
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
        :class="$style.tableButton"
        :disabled="disabled"
        :aria-label="label"
        @pointermove="updateGlassPointer"
        @pointerleave="resetGlassPointer"
        @click="emit('click')"
    >
        <span :class="$style.iconStack" aria-hidden="true">
            <img
                v-for="index in step === 'double' ? 2 : 1"
                :key="index"
                :class="[$style.icon, $style[direction]]"
                src="/images/icons/navbar/theme/slide.svg"
                alt=""
                draggable="false"
            >
        </span>
    </button>
</template>

<style module>
.tableButton {
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
    justify-content: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    padding: 0;
    overflow: hidden;
    isolation: isolate;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-full);
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
    cursor: pointer;
    transition:
        border-color 220ms ease,
        box-shadow 220ms ease,
        opacity 220ms ease,
        transform 220ms ease;
}

:global(.dark) .tableButton,
:global([data-theme="dark"]) .tableButton {
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

.tableButton::before {
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

.tableButton::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background:
        radial-gradient(
            circle 34px at var(--glass-pointer-x) var(--glass-pointer-y),
            var(--glass-pointer-color) 0%,
            transparent 70%
        );
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
}

.tableButton:hover:not(:disabled)::after,
.tableButton:focus-visible::after {
    opacity: 0.82;
}

.tableButton:hover:not(:disabled) {
    border-color: var(--glass-border-hover);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 78%, transparent),
        inset 0 -8px 16px var(--glass-lowlight),
        0 8px 22px var(--glass-shadow-hover);
}

.tableButton:active:not(:disabled) {
    transform: scale(0.97);
}

.tableButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.tableButton:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.iconStack {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0;
}

.icon {
    width: 5.7px;
    height: 8.5px;
    filter: var(--glass-icon-filter);
    object-fit: contain;
    -webkit-user-drag: none;
}

.previous {
    transform: rotate(0deg);
}

.next {
    transform: rotate(180deg);
}
</style>
