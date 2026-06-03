<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { backend, database, frontend, type ProjectTechStack, type Skills } from "@/config";
import { SecondaryButton } from "../buttons";
import { CategoryTag } from "../tags";

type StackGroup = "frontend" | "backend" | "database";
type StackIconGroup = StackGroup;

interface Props {
    category: string;
    descriptionShort: string;
    projectName: string;
    stackGroups?: readonly StackGroup[];
    techStack?: ProjectTechStack;
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
const stackCatalog: Record<StackIconGroup, readonly Skills[]> = {
    frontend,
    backend,
    database,
};
const featuredStackIcons = computed(() => visibleStackGroups.value.map((group) => {
    const stackName = props.techStack?.[group]?.[0];
    const matchedStack = stackName
        ? stackCatalog[group].find((item) => item.label === stackName)
        : undefined;
    const fallbackStack = stackCatalog[group][0];

    return {
        group,
        icon: matchedStack?.icon ?? fallbackStack?.icon ?? "",
        label: matchedStack?.label ?? fallbackStack?.label ?? group,
    };
}));
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
            <div :class="$style.stackTag" aria-label="Featured project stack">
                <span
                    v-for="item in featuredStackIcons"
                    :key="item.group"
                    :class="$style.stackIconWrap"
                    :title="item.label"
                    tabindex="0"
                >
                    <img
                        :class="$style.stackIcon"
                        :src="item.icon"
                        :alt="item.label"
                        draggable="false"
                    >
                    <span :class="$style.stackTooltip" role="tooltip">{{ item.label }}</span>
                </span>
            </div>
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
                <div :class="$style.stackTag" aria-label="Featured project stack">
                    <span
                        v-for="item in featuredStackIcons"
                        :key="item.group"
                        :class="$style.stackIconWrap"
                        :title="item.label"
                        tabindex="0"
                    >
                        <img
                            :class="$style.stackIcon"
                            :src="item.icon"
                            :alt="item.label"
                            draggable="false"
                        >
                        <span :class="$style.stackTooltip" role="tooltip">{{ item.label }}</span>
                    </span>
                </div>
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
    justify-content: flex-start;
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

.stackTag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 112px;
    height: 44px;
    padding: 10px 18px;
    gap: 14px;
    overflow: visible;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
    background-color: var(--color-main-surface);
}

.stackIconWrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: var(--radius-base);
}

.stackIconWrap:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.stackIcon {
    width: 22px;
    height: 22px;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}

.stackTooltip {
    position: absolute;
    z-index: 2;
    bottom: calc(100% + 10px);
    left: 50%;
    padding: 5px 8px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    font-size: 0.75rem;
    font-weight: 300;
    line-height: 1;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, 4px);
    transition: opacity 120ms ease, transform 120ms ease;
}

.stackTooltip::after {
    position: absolute;
    top: 100%;
    left: 50%;
    width: 8px;
    height: 8px;
    border-right: 1px solid var(--color-main-divider);
    border-bottom: 1px solid var(--color-main-divider);
    background-color: var(--color-main-surface);
    content: "";
    transform: translate(-50%, -4px) rotate(45deg);
}

.stackIconWrap:hover .stackTooltip,
.stackIconWrap:focus-visible .stackTooltip {
    opacity: 1;
    transform: translate(-50%, 0);
}

.content {
    display: flex;
    flex-direction: column;
    align-items: center;
    align-self: stretch;
    min-height: 118px;
    min-width: 0;
    gap: 6px;
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
    min-height: 2.5rem;
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
    margin-top: auto;
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

    .stackTag {
        min-width: 104px;
        padding-inline: 15px;
        gap: 12px;
    }

    .content {
        min-height: 132px;
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
