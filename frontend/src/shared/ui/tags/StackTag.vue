<script setup lang="ts">
import { computed } from "vue";
import { backend, database, frontend } from "@/config";
import type { Skills } from "@/config";

type StackGroup = "frontend" | "backend" | "database";

interface Props {
    /** Project stacks to show (first stack per group); falls back to the group default icon. */
    stacks?: Partial<Record<StackGroup, Skills>>;
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    stacks: () => ({}),
    loading: false,
});

const defaultStackMap = {
    frontend: frontend[0]!,
    backend: backend[0]!,
    database: database[0]!,
} satisfies Record<StackGroup, Skills>;

const groups: readonly StackGroup[] = ["frontend", "backend", "database"];

const visibleStacks = computed(() => groups.map((group) => {
    const stack = props.stacks[group];

    return {
        group,
        isDefault: !stack,
        ...(stack ?? defaultStackMap[group]),
    };
}));
</script>

<template>
    <div v-if="loading" :class="$style.stackSkeleton" role="status" aria-label="Loading project stack" />
    <div v-else :class="$style.stackTag" aria-label="Project stack groups">
        <template v-for="stack in visibleStacks" :key="stack.group">
            <span
                v-if="stack.isDefault"
                :class="[$style.stackIcon, $style.defaultIcon]"
                :style="{ '--stack-icon-src': `url(${stack.icon})` }"
                role="img"
                :aria-label="stack.label"
            />
            <img
                v-else
                :class="$style.stackIcon"
                :src="stack.icon"
                :alt="stack.label"
                draggable="false"
            >
        </template>
    </div>
</template>

<style module>
.stackTag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    height: 44px;
    padding: 0 12px;
    gap: 8px;
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    transition: background-color 300ms ease, border-color 300ms ease;
}

.stackIcon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}

.defaultIcon {
    display: inline-block;
    background-color: var(--color-main-primary);
    mask: var(--stack-icon-src) center / contain no-repeat;
    -webkit-mask: var(--stack-icon-src) center / contain no-repeat;
}

.stackSkeleton {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    max-width: 105px;
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
    animation: stackSkeletonShimmer 1.4s ease-in-out infinite alternate;
}

@keyframes stackSkeletonShimmer {
    from {
        background-position: 0% 50%;
    }

    to {
        background-position: 100% 50%;
    }
}
</style>
