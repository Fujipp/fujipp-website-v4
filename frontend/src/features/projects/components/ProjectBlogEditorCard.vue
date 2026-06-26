<script setup lang="ts">
import { ActionButton } from "@/shared/ui/buttons";

interface Props {
    content?: string;
    heading?: string;
    title?: string;
}

withDefaults(defineProps<Props>(), {
    content: "",
    heading: "Challenge 1",
    title: "",
});

const emit = defineEmits<{
    delete: [];
    "update:content": [value: string];
    "update:title": [value: string];
}>();
</script>

<template>
    <article :class="$style.blogCard">
        <header :class="$style.cardHeader">
            <h3 :class="$style.heading">{{ heading }}</h3>
            <ActionButton variant="delete" aria-label="Delete blog item" @click="emit('delete')" />
        </header>
        <label :class="$style.fieldGroup">
            <span :class="$style.label">Title</span>
            <input
                :class="$style.input"
                :value="title"
                placeholder="Placeholder"
                @input="emit('update:title', ($event.target as HTMLInputElement).value)"
            >
        </label>
        <label :class="[$style.fieldGroup, $style.areaGroup]">
            <span :class="$style.label">Content</span>
            <textarea
                :class="$style.textarea"
                :value="content"
                placeholder="Placeholder"
                @input="emit('update:content', ($event.target as HTMLTextAreaElement).value)"
            />
        </label>
    </article>
</template>

<style module>
.blogCard {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, 380px);
    padding: 10px;
    gap: 10px;
    overflow: hidden;
    border: 2px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-neutral-50);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
}

:global(.dark) .blogCard,
:global([data-theme="dark"]) .blogCard {
    border-color: var(--color-main-border);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.cardHeader {
    display: flex;
    align-items: center;
    gap: 10px;
}

.heading {
    flex: 1;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    line-height: normal;
}

.fieldGroup {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.areaGroup {
    height: 199px;
}

.label {
    font-size: 0.875rem;
    font-weight: 300;
}

.input,
.textarea {
    box-sizing: border-box;
    width: 100%;
    border: 1px solid var(--color-input-placeholder);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font-family: var(--font-sans);
    font-size: 1.125rem;
    font-weight: 300;
}

.input {
    height: 48px;
    padding: 12px 16px;
    border-radius: var(--radius-lg);
}

.textarea {
    flex: 1;
    min-height: 0;
    padding: 12px 16px;
    border-radius: var(--radius-xl);
    resize: none;
}
</style>
