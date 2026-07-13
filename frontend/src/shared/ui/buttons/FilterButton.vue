<script setup lang="ts">
import { computed } from "vue";
import { icons } from "@/config";

type ArrowDirection = "up" | "down" | "left" | "right";

interface Props {
    count?: number;
    arrowDirection?: ArrowDirection;
    icon?: string;
    disabled?: boolean;
    ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    count: 0,
    arrowDirection: "down",
    disabled: false,
    icon: icons.filter,
});

defineEmits<{
    click: [event: MouseEvent];
}>();

/* slide.svg points left; rotate it to the requested direction. */
const arrowRotation: Record<ArrowDirection, string> = {
    left: "0deg",
    up: "90deg",
    right: "180deg",
    down: "270deg",
};

const arrowStyle = computed(() => ({
    "--filter-arrow-src": `url(${icons.slide})`,
    "--filter-arrow-rotation": arrowRotation[props.arrowDirection],
}));

const iconStyle = computed(() => (props.icon ? { "--filter-icon-src": `url(${props.icon})` } : undefined));
</script>

<template>
    <button
        type="button"
        :class="$style.filterButton"
        :disabled="disabled"
        :aria-label="ariaLabel"
        @click="$emit('click', $event)"
    >
        <span :class="$style.title">
            <slot name="icon">
                <span v-if="icon" :class="$style.icon" :style="iconStyle" aria-hidden="true" />
            </slot>
            <span :class="$style.label"><slot>Filter</slot></span>
        </span>
        <span v-if="count > 0" :class="$style.badge">{{ count }}</span>
        <span v-else :class="$style.arrow" :style="arrowStyle" aria-hidden="true" />
    </button>
</template>

<style module>
.filterButton {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    height: 36px;
    gap: 12px;
    border: 0.5px solid var(--color-button-border);
    border-radius: var(--radius-xl);
    background: var(--color-button-text-secondary);
    padding: 8px 8px 8px 12px;
    color: var(--color-button-secondary);
    font-family: var(--font-sans);
    font-size: var(--type-size-button);
    line-height: normal;
    text-align: left;
    cursor: pointer;
    transition:
        border-color 180ms ease,
        background 180ms ease,
        opacity 180ms ease;
}

.filterButton:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-button-text-secondary) 88%, var(--color-button-secondary));
    border-color: color-mix(in srgb, var(--color-button-border) 70%, var(--color-button-secondary));
}

.filterButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.filterButton:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    background-color: var(--color-button-secondary);
    mask: var(--filter-icon-src) center / contain no-repeat;
    -webkit-mask: var(--filter-icon-src) center / contain no-repeat;
}

.label {
    font-weight: 600;
}

.arrow {
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    background-color: var(--color-button-secondary);
    mask: var(--filter-arrow-src) center / contain no-repeat;
    -webkit-mask: var(--filter-arrow-src) center / contain no-repeat;
    transform: rotate(var(--filter-arrow-rotation));
    transition: transform 180ms ease;
}

.badge {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    background: var(--color-status-error);
    color: var(--color-button-btn-text-danger);
    font-size: 14px;
    font-weight: 300;
    text-align: center;
}
</style>
