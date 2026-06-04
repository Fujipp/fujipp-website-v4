<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { GalleryImage } from "@/features/portfolio/config";
import { NextBackButton } from "@/shared/ui/buttons";

interface Props {
    images: readonly GalleryImage[];
}

const props = defineProps<Props>();
const selectedIndex = ref(0);
const thumbnailTrack = ref<HTMLElement | null>(null);

const selectedImage = computed(() => props.images[selectedIndex.value]);

watch(
    () => props.images.length,
    (length) => {
        if (length === 0) {
            selectedIndex.value = 0;
            return;
        }

        if (selectedIndex.value >= length) {
            selectedIndex.value = length - 1;
            void scrollSelectedThumbnailIntoView();
        }
    },
);

function selectImage(index: number): void {
    selectedIndex.value = index;
    void scrollSelectedThumbnailIntoView();
}

async function scrollSelectedThumbnailIntoView(): Promise<void> {
    await nextTick();

    thumbnailTrack.value
        ?.querySelector<HTMLElement>(`[data-gallery-index="${selectedIndex.value}"]`)
        ?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
        });
}

function wrapIndex(index: number): number {
    const length = props.images.length;

    if (length === 0) {
        return 0;
    }

    return (index + length) % length;
}

function showPreviousImage(): void {
    selectImage(wrapIndex(selectedIndex.value - 1));
}

function showNextImage(): void {
    selectImage(wrapIndex(selectedIndex.value + 1));
}

function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousImage();
    }

    if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextImage();
    }

    if (event.key === "Home") {
        event.preventDefault();
        selectImage(0);
    }

    if (event.key === "End" && props.images.length > 0) {
        event.preventDefault();
        selectImage(props.images.length - 1);
    }
}
</script>

<template>
    <div :class="$style.gallery" tabindex="0" @keydown="handleKeydown">
        <figure :class="$style.featured">
            <img
                v-if="selectedImage?.src"
                :class="$style.featuredImage"
                :src="selectedImage.src"
                :alt="selectedImage.alt"
            >
            <div
                v-else
                :class="$style.placeholder"
                role="img"
                :aria-label="selectedImage?.alt ?? 'No gallery image selected'"
            >
                <img src="/images/icons/common/gallery.svg" alt="" aria-hidden="true">
            </div>
        </figure>

        <nav :class="$style.navigation" aria-label="Gallery controls">
            <ul ref="thumbnailTrack" :class="$style.thumbnails" aria-label="Choose gallery image">
                <li v-for="(image, index) in images" :key="image.id" :class="$style.thumbnailItem">
                    <button
                        type="button"
                        :data-gallery-index="index"
                        :class="[
                            $style.thumbnail,
                            { [$style.thumbnailSelected]: index === selectedIndex },
                        ]"
                        :aria-label="`View ${image.alt}`"
                        :aria-pressed="index === selectedIndex"
                        @click="selectImage(index)"
                    >
                        <img
                            v-if="image.src"
                            :class="$style.thumbnailImage"
                            :src="image.src"
                            :alt="image.alt"
                            loading="lazy"
                        >
                        <span v-else :class="$style.placeholder">
                            <img src="/images/icons/common/gallery.svg" alt="" aria-hidden="true">
                        </span>
                    </button>
                </li>
            </ul>
            <NextBackButton
                :previous-disabled="images.length < 2"
                :next-disabled="images.length < 2"
                @previous="showPreviousImage"
                @next="showNextImage"
            />
        </nav>
    </div>
</template>

<style module>
.gallery {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: var(--spacing-space-6);
}

.gallery:focus-visible {
    border-radius: var(--radius-2xl);
    outline: 2px solid var(--color-main-primary);
    outline-offset: var(--spacing-space-2);
}

.featured {
    width: 100%;
    height: 528px;
    margin: 0;
    overflow: hidden;
    border-radius: var(--radius-2xl);
}

.featuredImage,
.thumbnailImage {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: var(--color-text-input);
}

.placeholder img {
    width: var(--spacing-space-8);
    height: var(--spacing-space-8);
}

.featured .placeholder img {
    width: var(--spacing-space-16);
    height: var(--spacing-space-16);
}

.navigation {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: var(--spacing-space-6);
}

.thumbnails {
    --visible-items: 5;
    --thumbnail-gap: var(--spacing-space-3);

    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: var(--spacing-space-2);
    gap: var(--thumbnail-gap);
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    scroll-padding-inline: var(--spacing-space-2);
    list-style: none;
    scrollbar-width: none;
}

.thumbnails::-webkit-scrollbar {
    display: none;
}

.thumbnailItem {
    flex: 0 0 calc((100% - ((var(--visible-items) - 1) * var(--thumbnail-gap))) / var(--visible-items));
    scroll-snap-align: start;
}

.thumbnail {
    box-sizing: border-box;
    width: 100%;
    aspect-ratio: 16 / 9;
    padding: 0;
    overflow: hidden;
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    background: transparent;
    cursor: pointer;
    filter: grayscale(90%) opacity(0.5);
    transform: scale(0.93);
    transition:
        border-color 300ms ease,
        filter 300ms ease,
        transform 300ms ease;
}

.thumbnailSelected {
    border-color: var(--color-main-primary);
    filter: none;
    transform: scale(1);
}

.thumbnail:not(.thumbnailSelected):hover {
    filter: none;
    transform: scale(1);
}

.thumbnail:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.thumbnail .placeholder img {
    width: var(--spacing-space-6);
    height: var(--spacing-space-6);
}

@media (max-width: 767px) {
    .featured {
        height: 220px;
    }

    .thumbnails {
        --visible-items: 3;
    }

    .thumbnail {
        aspect-ratio: 16 / 9;
    }
}
</style>
