<script setup lang="ts">
import { computed } from "vue";
import type { Ai } from "@/features/projects/config";

interface Props {
    fadeEdges?: boolean;
    items: readonly Ai[];
}

const props = withDefaults(defineProps<Props>(), {
    fadeEdges: false,
});

const marqueeItems = computed(() => Array.from({ length: 8 }, () => props.items).flat());
const secondaryIconNames = new Set(["Copilot", "Gpt"]);

function usesSecondaryIcon(name: string): boolean {
    return secondaryIconNames.has(name);
}
</script>

<template>
    <section
        :class="[$style.aiViewport, { [$style.fadeEdges]: fadeEdges }]"
        aria-label="AI skills"
    >
        <div :class="$style.aiTrack">
            <article
                v-for="(item, index) in marqueeItems"
                :key="`${item.name}-${index}`"
                :class="$style.ai"
            >
                <img
                    v-if="item.src"
                    :class="[
                        $style.icon,
                        { [$style.secondaryIcon]: usesSecondaryIcon(item.name) },
                    ]"
                    :src="item.src"
                    :alt="item.name"
                    draggable="false"
                >
                <div :class="$style.content">
                    <div :class="$style.textGroup">
                        <h3 :class="$style.title" class="type-h3-card-title-sb">{{ item.name }}</h3>
                        <p :class="$style.description" class="type-body-main-r">{{ item.description }}</p>
                    </div>
                </div>
            </article>
        </div>
    </section>
</template>

<style module>
.aiViewport {
    --ai-gap: var(--spacing-space-6);

    position: relative;
    width: 100%;
    box-sizing: border-box;
    padding-inline: var(--spacing-space-6);
    overflow: hidden;
}

.fadeEdges::before,
.fadeEdges::after {
    position: absolute;
    top: 0;
    z-index: 1;
    width: 8vw;
    min-width: 56px;
    height: 100%;
    pointer-events: none;
    content: "";
}

.fadeEdges::before {
    left: 0;
    background: linear-gradient(
        90deg,
        var(--color-main-background) 0%,
        color-mix(in srgb, var(--color-main-background) 68%, transparent) 42%,
        color-mix(in srgb, var(--color-main-background) 24%, transparent) 76%,
        transparent 100%
    );
}

.fadeEdges::after {
    right: 0;
    background: linear-gradient(
        270deg,
        var(--color-main-background) 0%,
        color-mix(in srgb, var(--color-main-background) 68%, transparent) 42%,
        color-mix(in srgb, var(--color-main-background) 24%, transparent) 76%,
        transparent 100%
    );
}

.aiTrack {
    display: flex;
    align-items: center;
    width: max-content;
    gap: var(--ai-gap);
    animation: ai-marquee 72s linear infinite;
}

.aiViewport:hover .aiTrack {
    animation-play-state: paused;
}

.ai {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 400px;
    height: 219px;
    padding: 10px;
    gap: 10px;
    overflow: hidden;
    flex-shrink: 0;
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    text-align: left;
}

.icon {
    flex-shrink: 0;
    width: 100px;
    height: 100px;
    object-fit: contain;
    -webkit-user-drag: none;
}

.secondaryIcon {
    filter: brightness(0) saturate(100%) invert(94%) sepia(7%) saturate(39%) hue-rotate(169deg) brightness(97%) contrast(91%);
}

.content {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    min-width: 0;
}

.textGroup {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 100%;
}

.title,
.description {
    align-self: stretch;
    margin: 0;
}

@keyframes ai-marquee {
    from {
        transform: translateX(0);
    }

    to {
        transform: translateX(calc(-50% - (var(--ai-gap) / 2)));
    }
}

@media (max-width: 767px) {
    .aiViewport {
        --ai-gap: var(--spacing-space-4);

        padding-inline: var(--spacing-space-4);
    }

    .aiTrack {
        animation-duration: 64s;
    }

    .ai {
        width: 400px;
        height: 219px;
    }
}
</style>
