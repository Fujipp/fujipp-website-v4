<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { backend, database, frontend, type ProjectTechStack, type Skills } from "@/config";
import { ActionButton, PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { CategoryTag, StackTag } from "@/shared/ui/tags";

type StackGroup = "frontend" | "backend" | "database";

interface Props {
    addLabel?: string;
    admin?: boolean;
    category?: string;
    changeLabel?: string;
    descriptionShort?: string;
    imageLoading?: "eager" | "lazy";
    mode?: "loaded" | "skeleton" | "add";
    projectName: string;
    size?: "large" | "showcase" | "small";
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
    imageLoading: "lazy",
    mode: "loaded",
    size: "small",
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
const stackCatalog: Record<StackGroup, readonly Skills[]> = {
    frontend,
    backend,
    database,
};

const featuredStacks = computed(() => {
    const stacks: Partial<Record<StackGroup, Skills>> = {};

    for (const group of props.stackGroups.slice(0, 3)) {
        const stackName = props.techStack?.[group]?.[0];
        const matchedStack = stackName
            ? stackCatalog[group].find((item) => item.label === stackName)
            : undefined;

        if (matchedStack) {
            stacks[group] = matchedStack;
        }
    }

    return stacks;
});

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
            size === 'showcase' ? $style.showcase : size === 'large' ? $style.large : $style.small,
            mode === 'add' ? $style.addCard : '',
        ]"
    >
        <template v-if="mode === 'skeleton'">
            <div :class="[$style.thumbnail, $style.skeletonBlock]" />
            <div :class="$style.meta">
                <CategoryTag loading />
                <StackTag loading />
            </div>
            <div :class="[$style.skeletonTitle, $style.skeletonBlock]" />
            <div :class="[$style.skeletonDescription, $style.skeletonBlock]" />
            <div :class="$style.actions">
                <div :class="[$style.skeletonButton, $style.skeletonBlock]" />
            </div>
        </template>

        <template v-else-if="mode === 'add'">
            <ActionButton
                action="add"
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
                    decoding="async"
                    :fetchpriority="imageLoading === 'eager' ? 'high' : 'auto'"
                    :loading="imageLoading"
                    draggable="false"
                    @load="isThumbnailLoaded = true"
                    @error="isThumbnailLoaded = true"
                >
            </div>

            <div :class="$style.meta">
                <CategoryTag :label="category" />
                <StackTag :stacks="featuredStacks" />
            </div>

            <h3 :class="$style.title">{{ projectName }}</h3>
            <p :class="$style.description">{{ descriptionShort }}</p>

            <div :class="$style.actions">
                <PrimaryButton :class="$style.viewButton" :to="to">
                    {{ viewLabel }}
                </PrimaryButton>
                <SecondaryButton
                    v-if="admin"
                    :class="$style.changeButton"
                    width-mode="hug"
                    @click="emit('change')"
                >
                    {{ changeLabel }}
                </SecondaryButton>
            </div>
        </template>
    </article>
</template>

<style module>
.projectFeatured {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    padding: 12px 16px;
    gap: 8px;
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    text-align: left;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.small {
    width: min(294px, 86vw);
    height: 414px;
}

.large {
    width: min(352px, 92vw);
    height: 496px;
}

.showcase {
    width: 100%;
    height: 580px;
    padding: var(--spacing-space-4);
    gap: var(--spacing-space-3);
    border: 0;
    box-shadow: 0 14px 36px rgb(0 0 0 / 10%);
}

.showcase .title {
    font-size: clamp(26px, 2.3vw, 38px);
}

@media (max-width: 767px) {
    .showcase {
        height: 500px;
    }
}

.thumbnail {
    position: relative;
    align-self: stretch;
    flex: 1;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    transition: background-color 300ms ease;
}

.thumbnailImage,
.thumbnailPlaceholder {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

.thumbnailImage {
    object-fit: cover;
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
    justify-content: space-between;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 12px 20px;
}

.title {
    align-self: stretch;
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h3-card-title);
    font-weight: 600;
    line-height: normal;
}

.description {
    align-self: stretch;
    display: -webkit-box;
    height: 72px;
    flex-shrink: 0;
    margin: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-main);
    font-weight: 300;
    line-height: 1.2;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
}

.actions {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    margin-top: auto;
    gap: 10px;
}

.viewButton {
    flex: 1;
    min-width: 0;
}

.changeButton {
    flex-shrink: 0;
}

.addCard {
    align-items: center;
    justify-content: center;
}

.skeletonBlock {
    border: 0;
    background:
        linear-gradient(
            262.31deg,
            var(--color-button-primary) 0%,
            var(--color-main-surface) 100%
        );
    background-size: 180% 100%;
    animation: featuredSkeletonShimmer 1.4s ease-in-out infinite alternate;
}

.skeletonTitle {
    align-self: stretch;
    height: 30px;
    border-radius: var(--radius-base);
}

.skeletonDescription {
    align-self: stretch;
    height: 72px;
    border-radius: var(--radius-base);
}

.skeletonButton {
    align-self: stretch;
    flex: 1;
    height: 44px;
    border-radius: var(--radius-xl);
}

@keyframes featuredSkeletonShimmer {
    from {
        background-position: 0% 50%;
    }

    to {
        background-position: 100% 50%;
    }
}

</style>
