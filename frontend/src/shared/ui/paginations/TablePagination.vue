<script setup lang="ts">
import { computed } from "vue";
import { ActionButton } from "@/shared/ui/buttons";

interface Props {
    modelValue: number;
    pageCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    "update:modelValue": [page: number];
}>();

/* Skip buttons jump ~10% of the total pages (100 pages → ±10, 90 → ±9, min ±1). */
const skipStep = computed(() => Math.max(1, Math.ceil(props.pageCount / 10)));

const visiblePageNumbers = computed(() => {
    const pages = new Set<number>([props.modelValue]);

    if (props.modelValue > 1) {
        pages.add(props.modelValue - 1);
    }

    if (props.modelValue < props.pageCount) {
        pages.add(props.modelValue + 1);
    }

    return [...pages].sort((left, right) => left - right);
});

function goToPage(page: number): void {
    emit("update:modelValue", Math.min(Math.max(page, 1), props.pageCount));
}
</script>

<template>
    <nav :class="$style.pagination" aria-label="Pagination">
        <ActionButton
            action="skip-back"
            :aria-label="`Back ${skipStep} pages`"
            :disabled="modelValue === 1"
            @click="goToPage(modelValue - skipStep)"
        />
        <button
            v-for="page in visiblePageNumbers"
            :key="page"
            type="button"
            :class="[$style.pageButton, page === modelValue ? $style.currentPage : '']"
            :aria-current="page === modelValue ? 'page' : undefined"
            @click="goToPage(page)"
        >
            {{ page }}
        </button>
        <ActionButton
            action="skip-next"
            :aria-label="`Forward ${skipStep} pages`"
            :disabled="modelValue === pageCount"
            @click="goToPage(modelValue + skipStep)"
        />
    </nav>
</template>

<style module>
.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    flex-wrap: wrap;
    box-sizing: border-box;
    padding: 10px;
    gap: 10px;
    text-align: center;
}

.pageButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-full);
    background-color: var(--color-main-secondary);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    font-size: var(--type-size-caption);
    font-weight: 300;
    cursor: pointer;
    transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
}

.pageButton:hover {
    background-color: color-mix(in srgb, var(--color-main-secondary) 88%, var(--color-button-text));
}

.pageButton:active {
    transform: scale(0.97);
}

.pageButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.currentPage {
    width: 45px;
    background-color: var(--color-main-primary);
    color: var(--color-text-primary);
    font-weight: 600;
}
</style>
