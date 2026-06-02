<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { SecondaryButton } from "../buttons";
import { CategoryTag, StackTag } from "../tags";

type StackGroup = "frontend" | "backend" | "database";

interface Props {
    category: string;
    descriptionShort: string;
    projectName: string;
    stackGroups?: readonly StackGroup[];
    thumbnailAlt?: string;
    thumbnailSrc: string;
    to?: RouteLocationRaw;
    viewLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    stackGroups: () => ["frontend", "backend", "database"],
    thumbnailAlt: "",
    viewLabel: "View",
});

const visibleStackGroups = computed(() => props.stackGroups.slice(0, 3));
</script>

<template>
    <article :class="$style.projectFeatured">
        <img
            :class="$style.thumbnail"
            :src="thumbnailSrc"
            :alt="thumbnailAlt || projectName"
            draggable="false"
        >

        <div :class="$style.meta">
            <CategoryTag :label="category" />
            <StackTag :groups="visibleStackGroups" />
        </div>

        <div :class="$style.content">
            <h3 :class="$style.title">{{ projectName }}</h3>
            <p :class="$style.description">{{ descriptionShort }}</p>
        </div>

        <SecondaryButton :class="$style.desktopButton" :to="to">
            {{ viewLabel }}
        </SecondaryButton>

        <div :class="$style.mobileContent">
            <div :class="$style.mobileInfo">
                <h3 :class="$style.mobileTitle">{{ projectName }}</h3>
                <CategoryTag :label="category" />
                <StackTag :groups="visibleStackGroups" />
            </div>
            <SecondaryButton
                :class="$style.mobileButton"
                :to="to"
                variant="icon"
                :aria-label="`${viewLabel} ${projectName}`"
            />
        </div>
    </article>
</template>

<style module>
.projectFeatured {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    width: 100%;
    height: 528px;
    padding: 10px;
    gap: 10px;
    overflow: hidden;
    border-radius: 12px;
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    text-align: left;
}

.thumbnail {
    align-self: stretch;
    width: 100%;
    height: 230px;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 12px;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
}

.meta {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    max-width: 100%;
    gap: 17px;
}

.content {
    display: flex;
    flex-direction: column;
    align-items: center;
    align-self: stretch;
    min-width: 0;
}

.title,
.mobileTitle {
    align-self: stretch;
    margin: 0;
    color: var(--color-text-secondary);
    font-weight: 600;
    line-height: normal;
    letter-spacing: 0;
}

.title {
    font-size: 1.25rem;
}

.description {
    align-self: stretch;
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: 1.125rem;
    font-weight: 300;
    line-height: normal;
    letter-spacing: 0;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
}

.desktopButton {
    flex-shrink: 0;
}

.mobileContent {
    display: none;
}

@media (min-width: 768px) and (max-width: 1023px) {
    .thumbnail {
        height: 208px;
    }

    .meta {
        gap: 11px;
    }
}

@media (max-width: 767px) {
    .projectFeatured {
        flex-direction: row;
        justify-content: flex-start;
        height: 192px;
    }

    .thumbnail {
        align-self: center;
        width: 166px;
        height: 166px;
    }

    .meta,
    .content,
    .desktopButton {
        display: none;
    }

    .mobileContent {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        gap: 10px;
    }

    .mobileInfo {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: flex-start;
        min-width: 0;
        gap: 10px;
    }

    .mobileTitle {
        display: -webkit-box;
        overflow: hidden;
        font-size: 1.25rem;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
    }

    .mobileButton {
        align-self: center;
    }
}

@media (max-width: 430px) {
    .projectFeatured {
        gap: 8px;
    }

    .thumbnail {
        width: 42vw;
        min-width: 132px;
        max-width: 166px;
        height: auto;
        aspect-ratio: 1;
    }
}
</style>
