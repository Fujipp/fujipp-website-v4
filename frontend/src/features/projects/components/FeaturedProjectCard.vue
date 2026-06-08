<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { backend, database, frontend, type ProjectTechStack, type Skills } from "@/config";
import { ActionButton, SecondaryButton } from "@/shared/ui/buttons";
import { CategoryTag } from "@/shared/ui/tags";

type StackGroup = "frontend" | "backend" | "database";
type StackIconGroup = StackGroup;

interface Props {
    addLabel?: string;
    admin?: boolean;
    category?: string;
    changeLabel?: string;
    descriptionShort?: string;
    mode?: "loaded" | "skeleton" | "add";
    projectName: string;
    stackGroups?: readonly StackGroup[];
    techStack?: ProjectTechStack;
    thumbnailAlt?: string;
    thumbnailSrc?: string;
    to?: RouteLocationRaw;
    viewLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    addLabel: "Add featured project",
    admin: false,
    category: "",
    changeLabel: "Change",
    descriptionShort: "",
    mode: "loaded",
    stackGroups: () => ["frontend", "backend", "database"],
    thumbnailAlt: "",
    thumbnailSrc: "",
    viewLabel: "View",
});

const emit = defineEmits<{
    change: [];
}>();

const isThumbnailLoaded = ref(false);
const hasThumbnail = computed(() => props.thumbnailSrc.trim().length > 0);
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

watch(
    () => props.thumbnailSrc,
    () => {
        isThumbnailLoaded.value = false;
    },
);
</script>

<template>
    <article
        :class="[
            $style.projectFeatured,
            mode === 'skeleton' ? $style.skeletonCard : '',
            mode === 'add' ? $style.addCard : '',
        ]"
    >
        <template v-if="mode === 'skeleton'">
            <div :class="[$style.thumbnail, $style.skeletonBlock]" />
            <div :class="$style.meta">
                <div :class="[$style.skeletonTag, $style.skeletonBlock]" />
                <div :class="[$style.skeletonTag, $style.skeletonBlock]" />
            </div>
            <div :class="$style.content">
                <div :class="[$style.skeletonTitle, $style.skeletonBlock]" />
                <div :class="[$style.skeletonDescription, $style.skeletonBlock]" />
            </div>
            <div :class="[$style.skeletonButton, $style.skeletonBlock]" />
        </template>

        <template v-else-if="mode === 'add'">
            <ActionButton
                variant="add"
                :aria-label="addLabel"
                @click="emit('change')"
            />
        </template>

        <template v-else>
            <div :class="$style.thumbnail">
                <div
                    v-if="!isThumbnailLoaded"
                    :class="[$style.thumbnailPlaceholder, $style.skeletonBlock]"
                    aria-hidden="true"
                />
                <img
                    v-if="hasThumbnail"
                    :class="[$style.thumbnailImage, isThumbnailLoaded ? $style.thumbnailImageLoaded : '']"
                    :src="thumbnailSrc"
                    :alt="thumbnailAlt || projectName"
                    draggable="false"
                    @load="isThumbnailLoaded = true"
                    @error="isThumbnailLoaded = true"
                >
            </div>

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

            <div :class="$style.actions">
                <SecondaryButton :class="$style.actionButton" :to="to">
                    {{ viewLabel }}
                </SecondaryButton>
                <button
                    v-if="admin"
                    :class="$style.changeButton"
                    type="button"
                    @click="emit('change')"
                >
                    {{ changeLabel }}
                </button>
            </div>
        </template>
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
    width: min(100%, 380px);
    height: 450px;
    padding: 20px;
    gap: 10px;
    overflow: hidden;
    border: 2px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    text-align: left;
}

.thumbnail {
    position: relative;
    align-self: stretch;
    width: 100%;
    height: 185px;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 16px;
    background-color: var(--color-button-primary-btn-text-active);
}

.thumbnailImage,
.thumbnailPlaceholder {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

.thumbnailImage {
    object-fit: contain;
    opacity: 0;
    transition: opacity 180ms ease;
    user-select: none;
    -webkit-user-drag: none;
}

.thumbnailImageLoaded {
    opacity: 1;
}

.meta {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    max-width: 100%;
    gap: 20px;
}

.stackTag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 112px;
    height: 44px;
    padding: 10px 18px;
    gap: 10px;
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
    width: 24px;
    height: 24px;
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
    min-height: 0;
    min-width: 0;
    gap: 4px;
}

.title {
    align-self: stretch;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 1.25rem;
    font-weight: 600;
    line-height: normal;
    letter-spacing: 0;
}

.description {
    align-self: stretch;
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: 1.125rem;
    font-weight: 300;
    line-height: 1.2;
    letter-spacing: 0;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
}

.actions {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    margin-top: auto;
    gap: 10px;
}

.actionButton,
.changeButton {
    width: 160px;
    height: 48px;
}

.changeButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    flex-shrink: 0;
    padding: 12px 16px;
    border: 1.5px solid var(--color-main-secondary);
    border-radius: 12px;
    background-color: var(--color-main-secondary);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    font-size: 1rem;
    font-weight: 300;
    line-height: normal;
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease;
}

.changeButton:hover {
    border-color: var(--color-button-secondary-btn-hover);
    background-color: var(--color-button-secondary-btn-hover);
}

.changeButton:active {
    border-color: var(--color-button-secondary-btn-active);
    background-color: var(--color-button-secondary-btn-active);
}

.changeButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.addCard {
    align-items: center;
    justify-content: center;
}

.skeletonCard {
    pointer-events: none;
}

.skeletonBlock {
    border: 0;
    background: linear-gradient(
        105deg,
        rgb(255 255 255 / 15%) 0%,
        rgb(255 255 255 / 5%) 38%,
        rgb(21 21 21 / 20%) 74%,
        rgb(255 255 255 / 12%) 100%
    );
    background-size: 220% 100%;
    animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

.skeletonTag {
    width: 112px;
    height: 44px;
    border-radius: 20px;
}

.skeletonTitle {
    align-self: stretch;
    height: 30px;
    border-radius: var(--radius-base);
}

.skeletonDescription {
    align-self: stretch;
    height: 81px;
    border-radius: var(--radius-base);
}

.skeletonButton {
    width: 160px;
    height: 48px;
    border-radius: 12px;
}

@keyframes skeleton-shimmer {
    from {
        background-position: 120% 0;
    }

    to {
        background-position: -120% 0;
    }
}

@media (min-width: 768px) and (max-width: 1023px) {
    .projectFeatured {
        width: min(100%, 350px);
    }
}

@media (max-width: 767px) {
    .projectFeatured {
        width: min(100%, 350px);
    }

    .actionButton,
    .changeButton {
        width: 145px;
    }
}
</style>
