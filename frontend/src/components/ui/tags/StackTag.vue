<script setup lang="ts">
import { computed } from "vue";
import { backend, database, frontend } from "@/config";

type StackGroup = "frontend" | "backend" | "database";

interface Props {
    groups?: readonly StackGroup[];
}

const props = withDefaults(defineProps<Props>(), {
    groups: () => ["frontend", "backend", "database"],
});

const stackMap = {
    frontend: frontend[0]!,
    backend: backend[0]!,
    database: database[0]!,
} satisfies Record<StackGroup, { label: string; icon: string }>;

const visibleGroups = computed(() => props.groups.slice(0, 3).map((group) => ({
    group,
    ...stackMap[group],
})));
</script>

<template>
    <div :class="$style.stackTag" aria-label="Project stack groups">
        <img
            v-for="stack in visibleGroups"
            :key="stack.group"
            :class="$style.stackIcon"
            :src="stack.icon"
            :alt="stack.label"
            draggable="false"
        >
    </div>
</template>

<style module>
.stackTag {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    height: 44px;
    padding: 10px;
    gap: 10px;
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: 20px;
    background-color: var(--color-main-surface);
}

.stackIcon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}
</style>
