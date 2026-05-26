<script setup lang="ts">
import { computed } from "vue";
import type { Skills } from "@/config";

interface Props {
    items: readonly Skills[];
}

const props = defineProps<Props>();

const heading = computed(() => props.items[0]);
const skillItems = computed(() => props.items.slice(1));

const mobileSecondaryIconLabels = new Set([
    "SQL",
    "SHELL / BASH",
    "SOCKET.IO",
    "LINUX SERVER",
    "GITHUB",
    "CAPCUT",
]);

function usesMobileSecondaryIcon(label: string): boolean {
    return mobileSecondaryIconLabels.has(label);
}
</script>

<template>
    <article
        :class="$style.stack"
        class="rounded-xl bg-main-surface text-text-secondary type-subtitle-sb"
        @dragstart.prevent
    >
        <header v-if="heading" :class="$style.heading">
            <img
                v-if="heading.icon"
                :class="[$style.icon, $style.headingIcon]"
                :src="heading.icon"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
            <h3 class="type-subtitle-sb">{{ heading.label }}</h3>
        </header>
        <ul :class="$style.list">
            <li
                v-if="heading?.icon"
                :class="[$style.skill, $style.mobileCategoryIcon]"
                aria-hidden="true"
            >
                <img
                    :class="$style.icon"
                    :src="heading.icon"
                    alt=""
                    draggable="false"
                >
            </li>
            <li
                v-for="skill in skillItems"
                :key="skill.label"
                :class="$style.skill"
                class="type-body-main-r rounded bg-neutral-800"
            >
                <img
                    v-if="skill.icon"
                    :class="[
                        $style.icon,
                        { [$style.mobileSecondaryIcon]: usesMobileSecondaryIcon(skill.label) },
                    ]"
                    :src="skill.icon"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                >
                <span :class="$style.skillLabel">{{ skill.label }}</span>
            </li>
        </ul>
    </article>
</template>

<style module>
.stack {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 10px;
    gap: 10px;
    overflow: hidden;
    user-select: none;
}

.heading {
    display: flex;
    align-items: center;
    padding: var(--spacing-space-2);
    gap: var(--spacing-space-2);
    border-radius: var(--radius-full);
}

.heading h3 {
    margin: 0;
}

.list {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 0;
    padding: 0;
    gap: 10px;
    list-style: none;
}

.skill {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    height: 33px;
    padding: var(--spacing-space-2);
    gap: var(--spacing-space-2);
}

.icon {
    flex-shrink: 0;
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    -webkit-user-drag: none;
}

.mobileCategoryIcon {
    display: none;
}

@media (max-width: 767px) {
    .stack {
        align-items: center;
        height: auto;
        padding: 0;
        gap: 0;
        overflow: visible;
        background-color: transparent;
        color: var(--color-text-primary);
    }

    .heading {
        padding: 0;
        gap: var(--spacing-space-2);
    }

    .heading h3 {
        font-size: 1rem;
    }

    .headingIcon {
        display: none;
    }

    .list {
        flex-direction: row;
        justify-content: center;
        box-sizing: border-box;
        width: max-content;
        max-width: 100%;
        height: 44px;
        padding: 10px;
        gap: 10px;
        overflow: hidden;
        border: 1px solid var(--color-main-border);
        border-radius: 20px;
        background-color: var(--color-main-surface);
    }

    .skill {
        flex-shrink: 0;
        width: var(--spacing-icon-md);
        height: var(--spacing-icon-md);
        padding: 0;
        background-color: transparent;
    }

    .mobileCategoryIcon {
        display: flex;
    }

    .skillLabel {
        display: none;
    }

    .mobileSecondaryIcon {
        filter: brightness(0) saturate(100%) invert(89.4%);
    }
}
</style>
