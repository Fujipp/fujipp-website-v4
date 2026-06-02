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
                src="/images/icons/assets/filter.svg"
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
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    height: 36px;
    padding: 8px 8px 8px 12px;
    gap: 12px;
    overflow: hidden;
    border: 0.5px solid var(--color-main-secondary);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-secondary);
    color: var(--color-button-secondary-btn-text);
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease;
}

.filterButton:hover {
    border-color: var(--color-button-secondary-btn-hover);
    background-color: var(--color-button-secondary-btn-hover);
}

.filterButton:active {
    border-color: var(--color-button-secondary-btn-active);
    background-color: var(--color-button-secondary-btn-active);
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
    object-fit: contain;
    -webkit-user-drag: none;
}

.arrowIcon {
    width: 10px;
    height: 10px;
    object-fit: contain;
    transform: rotate(-90deg);
    transition: transform 160ms ease;
    -webkit-user-drag: none;
}

.arrowOpen {
    transform: rotate(90deg);
}
</style>
