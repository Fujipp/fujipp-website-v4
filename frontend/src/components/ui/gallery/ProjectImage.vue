<script setup lang="ts">
import { computed, ref, watch } from "vue";

interface Props {
    images: readonly string[];
    projectName: string;
}

const props = defineProps<Props>();
const activeIndex = ref(0);

const visibleImages = computed(() => props.images.slice(0, 5));
const activeImage = computed(() => visibleImages.value[activeIndex.value] ?? "");

watch(visibleImages, (images) => {
    if (activeIndex.value >= images.length) {
        activeIndex.value = 0;
    }
});
</script>

<template>
    <section :class="$style.gallery" :aria-label="`${projectName} gallery`">
        <img
            :class="$style.mainImage"
            :src="activeImage"
            :alt="`${projectName} preview ${activeIndex + 1}`"
            draggable="false"
        >
        <div :class="$style.thumbnailList">
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

.mainImage {
    width: 100%;
    height: 588px;
    border-radius: var(--radius-2xl);
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
}

.thumbnailList {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--spacing-space-10);
}

.thumbnailButton {
    display: block;
    width: 100%;
    height: 117px;
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

    .mainImage {
        height: auto;
        aspect-ratio: 409 / 434;
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
        aspect-ratio: 116 / 72;
    }
}
</style>
