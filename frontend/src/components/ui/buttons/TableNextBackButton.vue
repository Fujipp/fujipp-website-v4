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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--color-main-secondary);
    border-radius: var(--radius-full);
    background-color: var(--color-main-secondary);
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease, opacity 160ms ease;
}

.tableButton:hover:not(:disabled) {
    border-color: var(--color-button-secondary-btn-hover);
    background-color: var(--color-button-secondary-btn-hover);
}

.tableButton:active:not(:disabled) {
    border-color: var(--color-button-secondary-btn-active);
    background-color: var(--color-button-secondary-btn-active);
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
