<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ImageModal from "./ImageModal.vue";

interface Props {
    images: readonly string[];
    projectName: string;
}

const props = defineProps<Props>();
const activeIndex = ref(0);
const isImageModalOpen = ref(false);

const visibleImages = computed(() => props.images.slice(0, 5));
const activeImage = computed(() => visibleImages.value[activeIndex.value] ?? "");

watch(visibleImages, (images) => {
    if (activeIndex.value >= images.length) {
        activeIndex.value = 0;
    }
});
</script>

<template>
    <section
        :class="[$style.gallery, visibleImages.length < 2 ? $style.singleColumnGallery : '']"
        :aria-label="`${projectName} gallery`"
    >
        <button
            v-if="activeImage"
            type="button"
            :class="$style.mainImageButton"
            :aria-label="`Open ${projectName} preview ${activeIndex + 1}`"
            @click="isImageModalOpen = true"
        >
            <img
                :class="$style.mainImage"
                :src="activeImage"
                :alt="`${projectName} preview ${activeIndex + 1}`"
                draggable="false"
            >
        </button>
        <div
            v-else
            :class="[$style.mainImage, $style.placeholder]"
            role="img"
            :aria-label="`${projectName} has no gallery image`"
        >
            <img src="/images/icons/common/gallery.svg" alt="" aria-hidden="true">
        </div>
        <div v-if="visibleImages.length > 1" :class="$style.thumbnailList">
            <button
                v-for="(image, index) in visibleImages"
                v-show="index !== activeIndex"
                :key="image"
                type="button"
                :class="[$style.thumbnailButton, index === activeIndex ? $style.activeThumbnail : '']"
                :aria-label="`Show ${projectName} preview ${index + 1}`"
                @click="activeIndex = index"
            >
                <img
                    :class="$style.thumbnail"
                    :src="image"
                    :alt="`${projectName} thumbnail ${index + 1}`"
                    draggable="false"
                >
            </button>
        </div>
        <ImageModal
            v-if="isImageModalOpen && activeImage"
            :src="activeImage"
            :alt="`${projectName} preview ${activeIndex + 1}`"
            @close="isImageModalOpen = false"
        />
    </section>
</template>

<style module>
.gallery {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 189px;
    align-items: stretch;
    width: 100%;
    gap: var(--spacing-space-6);
}

.mainImage,
.mainImageButton {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    border-radius: var(--radius-2xl);
}

.mainImage {
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
}

.mainImageButton {
    display: block;
    padding: 0;
    overflow: hidden;
    border: 0;
    background-color: transparent;
    cursor: zoom-in;
}

.mainImageButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.singleColumnGallery {
    grid-template-columns: minmax(0, 1fr);
}

.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-main-surface);
}

.placeholder img {
    width: var(--spacing-space-16);
    height: var(--spacing-space-16);
}

.thumbnailList {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--spacing-space-4);
}

.thumbnailButton {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    min-width: 0;
    flex-shrink: 0;
    padding: 0;
    overflow: hidden;
    border: 2px solid transparent;
    border-radius: var(--radius-base);
    background: transparent;
    cursor: pointer;
    transition: border-color 160ms ease, opacity 160ms ease;
}

.thumbnailButton:hover,
.thumbnailButton:focus-visible,
.activeThumbnail {
    border-color: var(--color-main-primary);
}

.thumbnailButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.thumbnail {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
}

@media (max-width: 767px) {
    .gallery {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-space-6);
    }

    .thumbnailList {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        grid-template-rows: auto;
        gap: var(--spacing-space-3);
    }

    .thumbnailButton {
        width: auto;
        height: auto;
    }
}
</style>
