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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    max-width: 100%;
    height: 44px;
    padding: 10px;
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: 20px;
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: normal;
    letter-spacing: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
}
</style>
