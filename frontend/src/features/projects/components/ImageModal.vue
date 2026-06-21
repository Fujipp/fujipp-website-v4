<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";

interface Props {
    alt: string;
    src: string;
}

defineProps<Props>();

const emit = defineEmits<{
    close: [];
}>();

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const zoom = ref(1);
const viewport = ref<HTMLDivElement | null>(null);
const isPanning = ref(false);
const zoomPercentage = computed(() => `${Math.round(zoom.value * 100)}%`);
const canPan = computed(() => zoom.value > 1);
const zoomLayerStyle = computed(() => ({
    height: `${Math.max(zoom.value, 1) * 100}%`,
    width: `${Math.max(zoom.value, 1) * 100}%`,
}));
const imageStyle = computed(() => ({
    height: zoom.value < 1 ? `${zoom.value * 100}%` : "100%",
    width: zoom.value < 1 ? `${zoom.value * 100}%` : "100%",
}));
let previousBodyOverflow = "";
let previousPointerX = 0;
let previousPointerY = 0;

function setZoom(nextZoom: number): void {
    const element = viewport.value;
    const normalizedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));

    if (!element || normalizedZoom === zoom.value) {
        zoom.value = normalizedZoom;
        return;
    }

    const centerX = (element.scrollLeft + (element.clientWidth / 2)) / element.scrollWidth;
    const centerY = (element.scrollTop + (element.clientHeight / 2)) / element.scrollHeight;

    zoom.value = normalizedZoom;

    void nextTick(() => {
        element.scrollLeft = (centerX * element.scrollWidth) - (element.clientWidth / 2);
        element.scrollTop = (centerY * element.scrollHeight) - (element.clientHeight / 2);
    });
}

function zoomIn(): void {
    setZoom(zoom.value + ZOOM_STEP);
}

function zoomOut(): void {
    setZoom(zoom.value - ZOOM_STEP);
}

function resetZoom(): void {
    setZoom(1);
}

function startPanning(event: PointerEvent): void {
    if (!canPan.value || !viewport.value || event.button !== 0) return;

    isPanning.value = true;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    viewport.value.setPointerCapture(event.pointerId);
}

function panImage(event: PointerEvent): void {
    if (!isPanning.value || !viewport.value) return;

    viewport.value.scrollLeft -= event.clientX - previousPointerX;
    viewport.value.scrollTop -= event.clientY - previousPointerY;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
}

function stopPanning(event: PointerEvent): void {
    if (!isPanning.value || !viewport.value) return;

    isPanning.value = false;

    if (viewport.value.hasPointerCapture(event.pointerId)) {
        viewport.value.releasePointerCapture(event.pointerId);
    }
}

function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
        emit("close");
    } else if (event.key === "+" || event.key === "=") {
        zoomIn();
    } else if (event.key === "-") {
        zoomOut();
    } else if (event.key === "0") {
        resetZoom();
    }
}

onMounted(() => {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    document.body.style.overflow = previousBodyOverflow;
    window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
    <Teleport to="body">
        <div :class="$style.backdrop" @click.self="emit('close')">
            <section
                :class="$style.modal"
                role="dialog"
                aria-modal="true"
                aria-label="Image preview"
            >
                <div
                    ref="viewport"
                    :class="[$style.viewport, canPan ? $style.pannable : '', isPanning ? $style.panning : '']"
                    @pointerdown="startPanning"
                    @pointermove="panImage"
                    @pointerup="stopPanning"
                    @pointercancel="stopPanning"
                >
                    <div :class="$style.zoomLayer" :style="zoomLayerStyle">
                        <img :class="$style.image" :style="imageStyle" :src="src" :alt="alt" draggable="false">
                    </div>
                </div>

                <div :class="$style.topScrim" aria-hidden="true" />

                <div :class="$style.controls">
                    <div :class="$style.zoomGroup" aria-label="Image zoom controls">
                        <button
                            type="button"
                            :class="$style.controlButton"
                            :disabled="zoom <= MIN_ZOOM"
                            aria-label="Zoom out"
                            @click="zoomOut"
                        >
                            -
                        </button>
                        <button type="button" :class="$style.zoomValue" aria-label="Reset zoom" @click="resetZoom">
                            {{ zoomPercentage }}
                        </button>
                        <button
                            type="button"
                            :class="$style.controlButton"
                            :disabled="zoom >= MAX_ZOOM"
                            aria-label="Zoom in"
                            @click="zoomIn"
                        >
                            +
                        </button>
                    </div>
                    <button type="button" :class="$style.closeButton" aria-label="Close image preview" @click="emit('close')">
                        <img src="/images/icons/navbar/close.svg" alt="" aria-hidden="true">
                    </button>
                </div>
            </section>
        </div>
    </Teleport>
</template>

<style module>
.backdrop {
    position: fixed;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    inset: 0;
    padding: var(--spacing-space-4);
    background-color: rgb(0 0 0 / 84%);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: modal-fade 200ms ease;
}

.modal {
    position: relative;
    width: min(1400px, 100%);
    height: min(900px, calc(100dvh - (var(--spacing-space-4) * 2)));
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
    animation: modal-pop 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modal-fade {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes modal-pop {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: none; }
}

.viewport {
    position: absolute;
    inset: 0;
    overflow: auto;
    background:
        radial-gradient(120% 90% at 50% 0%, #1f2230 0%, var(--color-main-surface) 60%);
}

/* ---------- Floating glass controls ---------- */

.topScrim {
    position: absolute;
    z-index: 1;
    top: 0;
    right: 0;
    left: 0;
    height: 104px;
    background: linear-gradient(180deg, rgb(0 0 0 / 55%) 0%, transparent 100%);
    pointer-events: none;
}

.controls {
    position: absolute;
    z-index: 2;
    top: var(--spacing-space-4);
    right: var(--spacing-space-4);
    left: var(--spacing-space-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    pointer-events: none;
}

.zoomGroup,
.closeButton {
    pointer-events: auto;
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 16%, transparent);
    background:
        linear-gradient(
            150deg,
            color-mix(in srgb, var(--color-neutral-50) 14%, transparent) 0%,
            color-mix(in srgb, var(--color-neutral-50) 4%, transparent) 42%,
            color-mix(in srgb, var(--color-neutral-900) 28%, transparent) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 45%, transparent),
        inset 0 -8px 16px color-mix(in srgb, var(--color-neutral-900) 30%, transparent),
        0 10px 28px color-mix(in srgb, var(--color-neutral-900) 40%, transparent);
    backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
}

.zoomGroup {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: var(--radius-full);
}

.controlButton,
.zoomValue {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    border: 0;
    border-radius: var(--radius-full);
    background-color: transparent;
    color: var(--color-neutral-50);
    cursor: pointer;
    transition: background-color 160ms ease, opacity 160ms ease;
}

.controlButton {
    width: 36px;
    font-size: 1.5rem;
    line-height: 1;
}

.zoomValue {
    min-width: 62px;
    padding: 0 10px;
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 600;
}

.controlButton:hover:not(:disabled),
.zoomValue:hover {
    background-color: color-mix(in srgb, var(--color-neutral-50) 14%, transparent);
}

.controlButton:disabled {
    cursor: not-allowed;
    opacity: 0.4;
}

.closeButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    color: var(--color-neutral-50);
    cursor: pointer;
    transition: border-color 160ms ease, transform 160ms ease;
}

.closeButton:hover {
    border-color: color-mix(in srgb, var(--color-neutral-50) 28%, transparent);
}

.closeButton:active {
    transform: scale(0.95);
}

.closeButton img {
    width: 20px;
    height: 20px;
}

.controlButton:focus-visible,
.zoomValue:focus-visible,
.closeButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
    .backdrop,
    .modal {
        animation: none;
    }
}

.pannable {
    cursor: grab;
    touch-action: none;
}

.panning {
    cursor: grabbing;
}

.zoomLayer {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    min-width: 100%;
    min-height: 100%;
}

.image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}
</style>
