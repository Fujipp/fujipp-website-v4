<script setup lang="ts">
import { computed } from "vue";

interface Props {
    label?: string;
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    label: "",
    loading: false,
});

const categoryLabels: Record<string, string> = {
    Client: "Client Project",
    Senior: "Senior Project",
    Internship: "Internship Project",
    Personal: "Personal Project",
    "Open Source": "Open Source",
    Experimental: "Experimental",
    Team: "Team Project",
    Startup: "Startup",
};

const displayLabel = computed(() => categoryLabels[props.label] ?? props.label);
</script>

<template>
    <span v-if="loading" :class="$style.categorySkeleton" role="status" aria-label="Loading project category" />
    <span v-else :class="$style.categoryTag">
        {{ displayLabel }}
    </span>
</template>

<style module>
.categoryTag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    max-width: 100%;
    height: 44px;
    padding: 12px;
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: normal;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.categorySkeleton {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    max-width: 145px;
    height: 44px;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background:
        linear-gradient(
            262.31deg,
            var(--color-button-primary) 0%,
            var(--color-main-surface) 100%
        );
    background-size: 180% 100%;
    animation: categorySkeletonShimmer 1.4s ease-in-out infinite alternate;
}

@keyframes categorySkeletonShimmer {
    from {
        background-position: 0% 50%;
    }

    to {
        background-position: 100% 50%;
    }
}
</style>
