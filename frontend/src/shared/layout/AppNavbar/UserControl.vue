<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useUserStore } from "@/stores";

const POSITION_STORAGE_KEY = "fujipp-admin-profile-control-position";
const DEFAULT_BUTTON_SIZE = 64;
const DRAG_MARGIN = 12;
const CLICK_MOVE_LIMIT = 6;

const route = useRoute();
const router = useRouter();
const store = useUserStore();
const { isAdmin, isAuthenticated, profile, user } = storeToRefs(store);
const controlRef = ref<HTMLElement | null>(null);
const isExpanded = ref(false);
const isDragging = ref(false);
const position = ref({ x: 0, y: 0 });
const pointerId = ref<number | null>(null);
const dragOffset = { x: 0, y: 0 };
const dragStart = { x: 0, y: 0 };
const hasDragged = ref(false);

const isVisible = computed(() => isAuthenticated.value && (isAdmin.value || route.meta.requiresAdmin === true));
const controlStyle = computed(() => ({
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
}));
const actionStyles = computed(() => {
    if (typeof window === "undefined") {
        return getActionStyles(-1, -1);
    }

    const centerX = position.value.x + (DEFAULT_BUTTON_SIZE / 2);
    const centerY = position.value.y + (DEFAULT_BUTTON_SIZE / 2);
    const directionX = centerX > window.innerWidth / 2 ? -1 : 1;
    const directionY = centerY > window.innerHeight / 2 ? -1 : 1;

    return getActionStyles(directionX, directionY);
});

function getActionStyle(x: number, y: number): Record<string, string> {
    return {
        "--menu-x": `${x}px`,
        "--menu-y": `${y}px`,
    };
}

function getActionStyles(directionX: number, directionY: number): Record<string, Record<string, string>> {
    return {
        dashboard: getActionStyle(0, 94 * directionY),
        users: getActionStyle(40 * directionX, 85 * directionY),
        pricing: getActionStyle(72 * directionX, 60 * directionY),
        logout: getActionStyle(91 * directionX, 24 * directionY),
    };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function getControlRect(): { width: number; height: number } {
    const rect = controlRef.value?.getBoundingClientRect();

    return {
        width: rect?.width ?? DEFAULT_BUTTON_SIZE,
        height: rect?.height ?? DEFAULT_BUTTON_SIZE,
    };
}

function getClampedPosition(x: number, y: number): { x: number; y: number } {
    if (typeof window === "undefined") return { x, y };

    const rect = getControlRect();
    const maxX = Math.max(DRAG_MARGIN, window.innerWidth - rect.width - DRAG_MARGIN);
    const maxY = Math.max(DRAG_MARGIN, window.innerHeight - rect.height - DRAG_MARGIN);

    return {
        x: clamp(x, DRAG_MARGIN, maxX),
        y: clamp(y, DRAG_MARGIN, maxY),
    };
}

function savePosition(): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position.value));
}

function placeDefaultPosition(): void {
    if (typeof window === "undefined") return;
    position.value = {
        x: window.innerWidth - DEFAULT_BUTTON_SIZE - 24,
        y: window.innerHeight - DEFAULT_BUTTON_SIZE - 24,
    };
}

function restorePosition(): void {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(POSITION_STORAGE_KEY);

    if (!stored) {
        placeDefaultPosition();
        position.value = getClampedPosition(position.value.x, position.value.y);
        return;
    }

    try {
        const parsed = JSON.parse(stored) as { x?: unknown; y?: unknown };

        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            position.value = getClampedPosition(parsed.x, parsed.y);
            return;
        }
    } catch {
        // Ignore invalid saved positions and fall back to the default corner.
    }

    placeDefaultPosition();
    position.value = getClampedPosition(position.value.x, position.value.y);
}

function clampCurrentPosition(): void {
    position.value = getClampedPosition(position.value.x, position.value.y);
    savePosition();
}

function handleResize(): void {
    void nextTick(clampCurrentPosition);
}

function togglePanel(): void {
    isExpanded.value = !isExpanded.value;
    void nextTick(clampCurrentPosition);
}

function handleFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
        return;
    }

    isExpanded.value = false;
}

function handlePointerDown(event: PointerEvent): void {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.currentTarget as HTMLElement;
    const rect = controlRef.value?.getBoundingClientRect();

    pointerId.value = event.pointerId;
    isDragging.value = true;
    hasDragged.value = false;
    dragStart.x = event.clientX;
    dragStart.y = event.clientY;
    dragOffset.x = event.clientX - (rect?.left ?? position.value.x);
    dragOffset.y = event.clientY - (rect?.top ?? position.value.y);
    target.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent): void {
    if (pointerId.value !== event.pointerId) return;

    const distance = Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y);

    if (distance > CLICK_MOVE_LIMIT) {
        hasDragged.value = true;
    }

    position.value = getClampedPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y);
}

function handlePointerUp(event: PointerEvent): void {
    if (pointerId.value !== event.pointerId) return;

    const target = event.currentTarget as HTMLElement;
    pointerId.value = null;
    isDragging.value = false;
    target.releasePointerCapture(event.pointerId);
    savePosition();

    if (!hasDragged.value) {
        togglePanel();
    }
}

function handlePointerCancel(event: PointerEvent): void {
    if (pointerId.value !== event.pointerId) return;

    const target = event.currentTarget as HTMLElement;
    pointerId.value = null;
    isDragging.value = false;
    target.releasePointerCapture(event.pointerId);
    savePosition();
}

async function handleLogOut(): Promise<void> {
    await store.signOut();
    isExpanded.value = false;
    await router.push({ name: "home" });
}

onMounted(() => {
    restorePosition();
    window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
});
</script>

<template>
    <aside
        v-if="isVisible"
        ref="controlRef"
        :class="[$style.userControl, isExpanded ? $style.expanded : '', isDragging ? $style.dragging : '']"
        :style="controlStyle"
        aria-label="Admin island"
        @focusout="handleFocusOut"
    >
        <button
            :class="$style.profileButton"
            type="button"
            :aria-expanded="isExpanded"
            aria-label="Admin profile control"
            @pointerdown="handlePointerDown"
            @pointermove="handlePointerMove"
            @pointerup="handlePointerUp"
            @pointercancel="handlePointerCancel"
            @keydown.enter.prevent="togglePanel"
            @keydown.space.prevent="togglePanel"
        >
            <img
                v-if="profile?.avatarUrl"
                :class="$style.avatar"
                :src="profile.avatarUrl"
                alt=""
                aria-hidden="true"
                draggable="false"
                @dragstart.prevent
            >
            <span v-else :class="$style.avatarFallback" aria-hidden="true" />
            <span :class="$style.statusDot" aria-hidden="true" />
        </button>

        <nav v-show="isExpanded" :class="$style.actionList" aria-label="Admin quick actions">
            <RouterLink
                :class="[$style.actionButton, $style.actionDashboard]"
                :style="actionStyles.dashboard"
                :to="{ name: 'admin-dashboard' }"
                aria-label="Admin dashboard"
                title="Dashboard"
                @click="isExpanded = false"
            >
                <img :class="$style.actionIcon" src="/icons/navigation/home.svg" alt="" aria-hidden="true" draggable="false">
            </RouterLink>
            <RouterLink
                :class="[$style.actionButton, $style.actionUsers]"
                :style="actionStyles.users"
                :to="{ name: 'admin-users' }"
                aria-label="Admin users"
                title="Users"
                @click="isExpanded = false"
            >
                <img :class="$style.actionIcon" src="/icons/navigation/about.svg" alt="" aria-hidden="true" draggable="false">
            </RouterLink>
            <RouterLink
                :class="[$style.actionButton, $style.actionPricing]"
                :style="actionStyles.pricing"
                :to="{ name: 'admin-pricing' }"
                aria-label="Admin pricing"
                title="Pricing"
                @click="isExpanded = false"
            >
                <img :class="$style.actionIcon" src="/icons/navigation/package.svg" alt="" aria-hidden="true" draggable="false">
            </RouterLink>
            <button
                :class="[$style.actionButton, $style.logOutButton]"
                :style="actionStyles.logout"
                type="button"
                :disabled="store.isLoading"
                aria-label="Log out"
                title="Log out"
                @click="handleLogOut"
            >
                <img :class="$style.actionIcon" src="/icons/navigation/logout.svg" alt="" aria-hidden="true" draggable="false">
            </button>
        </nav>
    </aside>
</template>

<style module>
.userControl {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 80;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    box-sizing: border-box;
    width: 64px;
    min-height: 64px;
    gap: 0;
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    touch-action: none;
    pointer-events: none;
}

.dragging {
    transition-duration: 1ms;
}

.profileButton {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    padding: var(--space-1);
    gap: 0;
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 16%, transparent);
    border-radius: var(--radius-full);
    background:
        linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-neutral-50) 18%, transparent) 0%,
            color-mix(in srgb, var(--color-main-surface) 92%, transparent) 56%,
            color-mix(in srgb, var(--color-main-primary) 28%, var(--color-main-surface)) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 48%, transparent),
        0 16px 38px color-mix(in srgb, var(--color-neutral-900) 36%, transparent);
    color: inherit;
    text-align: left;
    cursor: grab;
    pointer-events: auto;
    touch-action: none;
    user-select: none;
    backdrop-filter: blur(24px) saturate(170%);
    -webkit-backdrop-filter: blur(24px) saturate(170%);
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease, background-color 180ms ease;
}

.profileButton:hover {
    border-color: color-mix(in srgb, var(--color-main-primary) 58%, transparent);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 56%, transparent),
        0 20px 44px color-mix(in srgb, var(--color-neutral-900) 42%, transparent),
        0 0 0 4px color-mix(in srgb, var(--color-main-primary) 14%, transparent);
}

.profileButton:active,
.dragging .profileButton {
    cursor: grabbing;
    transform: scale(0.96);
}

.expanded .profileButton {
    border-color: color-mix(in srgb, var(--color-main-primary) 70%, transparent);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 60%, transparent),
        0 22px 50px color-mix(in srgb, var(--color-neutral-900) 44%, transparent),
        0 0 0 5px color-mix(in srgb, var(--color-main-primary) 18%, transparent);
    transform: scale(1.04);
}

.avatar,
.avatarFallback {
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 20%, transparent);
}

.expanded .avatar,
.expanded .avatarFallback {
    width: 56px;
    height: 56px;
}

.avatar {
    object-fit: cover;
    object-position: center;
    transform: scale(1.14);
    -webkit-user-drag: none;
    user-select: none;
}

.avatarFallback {
    position: relative;
    background:
        radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-neutral-50) 46%, transparent), transparent 34%),
        linear-gradient(135deg, var(--color-main-primary), var(--color-neutral-800));
}

.avatarFallback::after {
    position: absolute;
    inset: 10px;
    border-radius: var(--radius-full);
    background-color: color-mix(in srgb, var(--color-neutral-50) 72%, transparent);
    content: "";
}

.statusDot {
    position: absolute;
    right: 5px;
    bottom: 5px;
    width: 13px;
    height: 13px;
    border: 2px solid var(--color-main-surface);
    border-radius: var(--radius-full);
    background-color: var(--color-status-success);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-status-success) 22%, transparent);
    transition: opacity 160ms ease, transform 160ms ease;
}

.expanded .statusDot {
    transform: scale(0);
    opacity: 0;
}

.actionList {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.actionButton {
    --menu-x: 0px;
    --menu-y: 0px;
    position: absolute;
    left: 6px;
    top: 6px;
    display: inline-flex;
    width: 52px;
    height: 52px;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 18%, transparent);
    border-radius: var(--radius-full);
    background:
        linear-gradient(
            145deg,
            color-mix(in srgb, var(--color-neutral-50) 18%, transparent) 0%,
            color-mix(in srgb, var(--color-main-surface) 94%, transparent) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 42%, transparent),
        0 12px 28px color-mix(in srgb, var(--color-neutral-900) 34%, transparent);
    opacity: 0;
    pointer-events: auto;
    transform: translate(0, 0) scale(0.62);
    transform-origin: center;
    transition:
        opacity 180ms ease,
        transform 260ms cubic-bezier(0.2, 1.3, 0.32, 1),
        border-color 180ms ease,
        box-shadow 180ms ease,
        background-color 180ms ease;
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
}

.expanded .actionButton {
    opacity: 1;
    transform: translate(var(--menu-x), var(--menu-y)) scale(1);
}

.actionButton:hover {
    border-color: color-mix(in srgb, var(--color-main-primary) 62%, transparent);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 52%, transparent),
        0 16px 34px color-mix(in srgb, var(--color-neutral-900) 42%, transparent),
        0 0 0 4px color-mix(in srgb, var(--color-main-primary) 14%, transparent);
}

.expanded .actionButton:hover {
    transform: translate(var(--menu-x), var(--menu-y)) scale(1.08);
}

.actionButton:active {
    transform: translate(var(--menu-x), var(--menu-y)) scale(0.96);
}

.actionDashboard {
    transition-delay: 20ms;
}

.actionUsers {
    transition-delay: 55ms;
}

.actionPricing {
    transition-delay: 90ms;
}

.logOutButton {
    border-color: color-mix(in srgb, var(--color-status-error) 62%, transparent);
    transition-delay: 125ms;
}

.logOutButton:hover {
    border-color: var(--color-button-btn-hover-danger);
    background-color: color-mix(in srgb, var(--color-button-btn-hover-danger) 32%, var(--color-main-surface));
}

.actionIcon {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    filter: brightness(0) invert(1);
    opacity: 0.92;
    pointer-events: none;
    -webkit-user-drag: none;
    user-select: none;
}

.actionButton:focus-visible,
.profileButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 3px;
}

.logOutButton:focus-visible {
    outline-color: var(--color-status-error);
}

.logOutButton:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
    .userControl,
    .profileButton,
    .actionButton,
    .logOutButton {
        animation: none;
        transition-duration: 1ms;
    }
}
</style>
