<script setup lang="ts">
interface Props {
    label?: string;
    loading?: boolean;
    value?: number | string;
}

withDefaults(defineProps<Props>(), {
    label: "",
    loading: false,
    value: "",
});
</script>

<template>
    <article :class="[$style.overviewCard, loading ? $style.loading : '']" :aria-busy="loading">
        <template v-if="!loading">
            <strong :class="$style.value">{{ value }}</strong>
            <span :class="$style.label">{{ label }}</span>
        </template>
    </article>
</template>

<style module>
.overviewCard {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: min(100%, 280px);
    height: 160px;
    padding: var(--spacing-space-2);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background: var(--gradient-card-highlight);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    text-align: center;
}

.loading {
    border: 0;
    background: linear-gradient(257deg, rgb(255 255 255 / 90%) 0%, rgb(21 21 21 / 100%) 100%);
}

.value {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1;
}

.label {
    font-size: 0.875rem;
    font-weight: 800;
    line-height: normal;
}

@media (max-width: 1023px) {
    .overviewCard {
        height: 78px;
    }
}
</style>
