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
    grid-template-columns: minmax(0, 992px) 191px;
    align-items: stretch;
    justify-content: center;
    width: 100%;
    gap: var(--spacing-space-5);
}

.mainImage,
.mainImageButton {
    width: 100%;
    height: 542px;
    border-radius: var(--radius-2xl);
}

.mainImage {
    background-color: var(--color-main-surface);
    object-fit: contain;
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
    justify-content: space-between;
    gap: var(--spacing-space-5);
}

.thumbnailButton {
    display: block;
    width: 100%;
    height: 104px;
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

@media (min-width: 768px) and (max-width: 1023px) {
    .gallery {
        grid-template-columns: minmax(0, 565px) 124px;
    }

    .mainImage,
    .mainImageButton {
        height: 308px;
    }

    .thumbnailButton {
        height: 68px;
    }
}

@media (max-width: 767px) {
    .gallery {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-space-5);
    }

    .mainImage,
    .mainImageButton {
        width: min(100%, 341px);
        height: 186px;
    }

    .thumbnailList {
        display: flex;
        flex-direction: row;
        justify-content: center;
        width: min(100%, 341px);
        gap: 24px;
    }

    .thumbnailButton {
        width: 67px;
        height: 37px;
        border-radius: var(--radius-md);
    }
}
</style>
