<script setup lang="ts">
import { ref } from "vue";

interface Props {
    modelValue?: number;
    max?: number;
    readonly?: boolean;
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: 0,
    max: 5,
    readonly: false,
    disabled: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: number];
}>();

const hoverValue = ref(0);

function isFilled(star: number): boolean {
    const activeValue = hoverValue.value > 0 ? hoverValue.value : props.modelValue;

    return star <= activeValue;
}

function selectRating(star: number): void {
    /* Clicking the current rating again clears it. */
    emit("update:modelValue", star === props.modelValue ? 0 : star);
}
</script>

<template>
    <div
        :class="$style.starRating"
        :role="readonly ? 'img' : undefined"
        :aria-label="readonly ? `Rated ${modelValue} out of ${max} stars` : undefined"
    >
        <template v-if="readonly">
            <span
                v-for="star in max"
                :key="star"
                :class="[$style.star, isFilled(star) && $style.filled]"
                aria-hidden="true"
            >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.825 21L7.45 13.975L2 9.25L9.2 8.625L12 2L14.8 8.625L22 9.25L16.55 13.975L18.175 21L12 17.275L5.825 21Z" />
                </svg>
            </span>
        </template>
        <template v-else>
            <button
                v-for="star in max"
                :key="star"
                type="button"
                :class="[$style.star, $style.starButton, isFilled(star) && $style.filled]"
                :disabled="disabled"
                :aria-label="`Rate ${star} of ${max} stars`"
                :aria-pressed="star <= modelValue"
                @click="selectRating(star)"
                @pointerenter="hoverValue = star"
                @pointerleave="hoverValue = 0"
            >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M5.825 21L7.45 13.975L2 9.25L9.2 8.625L12 2L14.8 8.625L22 9.25L16.55 13.975L18.175 21L12 17.275L5.825 21Z" />
                </svg>
            </button>
        </template>
    </div>
</template>

<style module>
.starRating {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.star {
    display: inline-flex;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: var(--color-button-border);
}

.star svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linejoin: round;
    transition:
        fill 180ms ease,
        stroke 180ms ease,
        color 180ms ease;
}

.star.filled {
    color: var(--color-main-brand-secondary);
}

.star.filled svg {
    fill: currentColor;
    stroke: currentColor;
}

.starButton {
    box-sizing: border-box;
    margin: 0;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    transition: transform 180ms ease;
}

.starButton:hover:not(:disabled) {
    transform: scale(1.1);
}

.starButton:focus-visible {
    outline: 2px solid var(--color-main-brand-secondary);
    outline-offset: 2px;
    border-radius: var(--radius-base);
}

.starButton:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}
</style>
