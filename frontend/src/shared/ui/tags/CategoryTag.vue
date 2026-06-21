<script setup lang="ts">
import { computed } from "vue";

interface Props {
    label: string;
}

const props = defineProps<Props>();

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
    <span :class="$style.categoryTag">
        {{ displayLabel }}
    </span>
</template>

<style module>
.categoryTag {
    --category-tag-bg: color-mix(in srgb, var(--projects-card-bg, var(--color-neutral-50)) 86%, var(--color-main-background) 14%);
    --category-tag-border: var(--projects-card-border, var(--color-input-border));
    --category-tag-text: var(--projects-card-text, var(--color-text-primary));

    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    max-width: 100%;
    height: 44px;
    padding: 10px;
    overflow: hidden;
    border: 1px solid var(--category-tag-border);
    border-radius: 20px;
    background-color: var(--category-tag-bg);
    color: var(--category-tag-text);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: normal;
    letter-spacing: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
    box-shadow: 0 8px 22px color-mix(in srgb, var(--color-neutral-900) 8%, transparent);
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease, box-shadow 300ms ease;
}

/* :global(.dark) .categoryTag,
:global([data-theme="dark"]) .categoryTag {
    --category-tag-bg: var(--color-main-surface);
    --category-tag-border: var(--color-main-border);
    --category-tag-text: var(--color-text-secondary);

    box-shadow: 0 8px 24px -10px rgb(121 135 172 / 70%);
} */
</style>
