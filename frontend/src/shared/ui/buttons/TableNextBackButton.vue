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
</script>

<template>
    <button
        type="button"
        :class="$style.tableButton"
        :disabled="disabled"
        :aria-label="label"
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
    cursor: pointer;
    transition:
        border-color 220ms ease,
        box-shadow 220ms ease,
        opacity 220ms ease,
        transform 220ms ease;
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
            color-mix(in srgb, var(--color-neutral-50) 38%, transparent) 0%,
            transparent 60%
        );
    opacity: 0.7;
    pointer-events: none;
}

.tableButton:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-neutral-50) 26%, transparent);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 55%, transparent),
        inset 0 -8px 16px color-mix(in srgb, var(--color-neutral-900) 30%, transparent),
        0 8px 22px color-mix(in srgb, var(--color-neutral-900) 40%, transparent);
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
    filter: brightness(0) invert(1);
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
