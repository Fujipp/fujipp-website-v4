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
            v-if="activeImage"
            :class="$style.mainImage"
            :src="activeImage"
            :alt="`${projectName} preview ${activeIndex + 1}`"
            decoding="async"
            fetchpriority="high"
            draggable="false"
        >
        <div
            v-else
            :class="[$style.mainImage, $style.placeholder]"
            role="img"
            :aria-label="`${projectName} has no gallery image`"
        >
            <img src="/icons/common/image.svg" alt="" aria-hidden="true">
        </div>
        <div v-if="visibleImages.length > 1" :class="$style.thumbnailList">
            <button
                v-for="(image, index) in visibleImages"
                v-show="index !== activeIndex"
                :key="image"
                type="button"
                :class="$style.thumbnailButton"
                :aria-label="`Show ${projectName} preview ${index + 1}`"
                @click="activeIndex = index"
            >
                <img
                    :class="$style.thumbnail"
                    :src="image"
                    :alt="`${projectName} thumbnail ${index + 1}`"
                    decoding="async"
                    loading="lazy"
                    draggable="false"
                >
            </button>
        </div>
    </section>
</template>

<style module>
.gallery {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(100%, 993px);
    gap: 8px;
}

.mainImage {
    align-self: stretch;
    width: 100%;
    height: 542px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    box-sizing: border-box;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
}

.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
}

.placeholder img {
    width: var(--spacing-space-16);
    height: var(--spacing-space-16);
}

.thumbnailList {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    flex-wrap: wrap;
    padding: 12px 16px;
    gap: 8px;
}

.thumbnailButton {
    display: block;
    width: 201px;
    max-width: 100%;
    aspect-ratio: 201 / 110;
    flex-shrink: 1;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background: var(--color-main-surface);
    cursor: pointer;
    transition: border-color 160ms ease;
}

.thumbnailButton:hover,
.thumbnailButton:focus-visible {
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

@media (max-width: 1023px) {
    .thumbnailButton {
        width: 140px;
    }
}

@media (max-width: 767px) {
    .mainImage {
        height: auto;
        aspect-ratio: 16 / 9;
    }

    .thumbnailButton {
        width: 90px;
        border-radius: var(--radius-lg);
    }

    .thumbnailList {
        padding: 8px 0;
    }
}
</style>
