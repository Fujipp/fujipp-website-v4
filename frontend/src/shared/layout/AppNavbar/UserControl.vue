<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { icons } from "@/config";
import { useUserStore } from "@/stores";
import { useLocaleText } from "@/i18n";

const text = useLocaleText();

const POSITION_STORAGE_KEY = "fujipp-admin-profile-control-position";
const DEFAULT_BUTTON_SIZE = 48;
const DRAG_MARGIN = 12;
const CLICK_MOVE_LIMIT = 6;

const route = useRoute();
const router = useRouter();
const store = useUserStore();
const { isAdmin, isAuthenticated, profile } = storeToRefs(store);
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
const panelStyle = computed<Record<string, string>>(() => {
    if (typeof window === "undefined") {
        return { right: "0", bottom: "calc(100% + var(--spacing-space-2))" };
    }

    const opensLeft = position.value.x + (DEFAULT_BUTTON_SIZE / 2) > window.innerWidth / 2;
    const opensUp = position.value.y > 220;

    return {
        [opensLeft ? "right" : "left"]: "0",
        [opensUp ? "bottom" : "top"]: "calc(100% + var(--spacing-space-2))",
    };
});
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
    isExpanded.value = false;
    await router.replace({ name: "home" });
    await store.signOut();
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
        :aria-label="text('Admin tools', 'เครื่องมือผู้ดูแล')"
        @focusout="handleFocusOut"
    >
        <button
            :class="$style.profileButton"
            type="button"
            :aria-expanded="isExpanded"
            :aria-label="text('Open admin tools', 'เปิดเครื่องมือผู้ดูแล')"
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

        <nav v-show="isExpanded" :class="$style.actionList" :style="panelStyle" :aria-label="text('Admin quick actions', 'เมนูลัดผู้ดูแล')">
            <div :class="$style.menuHeader">
                <span :class="$style.menuTitle">{{ text("Admin tools", "เครื่องมือผู้ดูแล") }}</span>
                <span :class="$style.menuStatus">{{ text("Online", "ออนไลน์") }}</span>
            </div>
            <RouterLink
                :class="$style.actionButton"
                :to="{ name: 'admin-dashboard' }"
                :aria-label="text('Admin dashboard', 'แดชบอร์ดผู้ดูแล')"
                @click="isExpanded = false"
            >
                <span :class="$style.actionIcon" :style="{ '--action-icon': `url(${icons.home})` }" aria-hidden="true" />
                <span>{{ text("Dashboard", "แดชบอร์ด") }}</span>
            </RouterLink>
            <RouterLink
                :class="$style.actionButton"
                :to="{ name: 'admin-users' }"
                :aria-label="text('Admin users', 'จัดการผู้ใช้')"
                @click="isExpanded = false"
            >
                <span :class="$style.actionIcon" :style="{ '--action-icon': `url(${icons.user})` }" aria-hidden="true" />
                <span>{{ text("Users", "ผู้ใช้") }}</span>
            </RouterLink>
            <RouterLink
                :class="$style.actionButton"
                :to="{ name: 'admin-pricing' }"
                :aria-label="text('Admin pricing', 'จัดการราคา')"
                @click="isExpanded = false"
            >
                <span :class="$style.actionIcon" :style="{ '--action-icon': `url(${icons.package})` }" aria-hidden="true" />
                <span>{{ text("Pricing", "ราคา") }}</span>
            </RouterLink>
            <RouterLink
                :class="$style.actionButton"
                :to="{ name: 'admin-bots' }"
                :aria-label="text('Admin bots', 'จัดการบอท')"
                @click="isExpanded = false"
            >
                <span :class="$style.actionIcon" :style="{ '--action-icon': `url(${icons.shopBot})` }" aria-hidden="true" />
                <span>{{ text("Bots", "บอท") }}</span>
            </RouterLink>
            <RouterLink
                :class="$style.actionButton"
                :to="{ name: 'admin-vps' }"
                :aria-label="text('Admin VPS', 'จัดการ VPS')"
                @click="isExpanded = false"
            >
                <span :class="$style.actionIcon" :style="{ '--action-icon': `url(${icons.shopServer})` }" aria-hidden="true" />
                <span>VPS</span>
            </RouterLink>
            <button
                :class="[$style.actionButton, $style.logOutButton]"
                type="button"
                :disabled="store.isLoading"
                :aria-label="text('Log out', 'ออกจากระบบ')"
                @click="handleLogOut"
            >
                <span :class="$style.actionIcon" :style="{ '--action-icon': `url(${icons.logout})` }" aria-hidden="true" />
                <span>{{ text("Log out", "ออกจากระบบ") }}</span>
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
    width: 48px;
    height: 48px;
    /* The tools panel intentionally uses the dark surface in every theme, so its
       foreground must be the matching light button token rather than page text. */
    color: var(--color-button-primary);
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
    width: 48px;
    height: 48px;
    padding: var(--spacing-space-1);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-lg);
    background-color: var(--color-main-surface);
    box-shadow: 0 8px 20px color-mix(in srgb, var(--color-neutral-900) 14%, transparent);
    color: inherit;
    cursor: grab;
    pointer-events: auto;
    touch-action: none;
    user-select: none;
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.profileButton:hover {
    border-color: var(--color-main-primary);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--color-neutral-900) 20%, transparent);
}

.profileButton:active,
.dragging .profileButton {
    cursor: grabbing;
    transform: scale(0.96);
}

.expanded .profileButton {
    border-color: var(--color-main-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-main-primary) 14%, transparent);
}

.avatar,
.avatarFallback {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    border: 1px solid var(--color-main-divider);
}

.avatar {
    object-fit: cover;
    object-position: center;
    -webkit-user-drag: none;
    user-select: none;
}

.avatarFallback {
    position: relative;
    background-color: var(--color-main-primary);
}

.avatarFallback::after {
    position: absolute;
    inset: var(--spacing-space-2);
    border-radius: var(--radius-full);
    background-color: var(--color-main-background);
    content: "";
}

.statusDot {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 10px;
    height: 10px;
    border: 2px solid var(--color-main-surface);
    border-radius: var(--radius-full);
    background-color: var(--color-status-success);
    box-shadow: none;
    transition: opacity 160ms ease, transform 160ms ease;
}

.expanded .statusDot {
    transform: scale(0);
    opacity: 0;
}

.actionList {
    position: absolute;
    display: flex;
    width: 184px;
    flex-direction: column;
    gap: var(--spacing-space-1);
    padding: var(--spacing-space-2);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-lg);
    background-color: var(--color-main-surface);
    box-shadow: 0 12px 28px color-mix(in srgb, var(--color-neutral-900) 18%, transparent);
    pointer-events: auto;
}

.actionButton {
    display: flex;
    min-height: 38px;
    align-items: center;
    gap: var(--spacing-space-3);
    width: 100%;
    padding: 0 var(--spacing-space-3);
    border: 0;
    border-radius: var(--radius-md);
    background-color: transparent;
    color: var(--color-button-primary);
    font-size: var(--type-size-caption);
    font-weight: 600;
    line-height: normal;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 160ms ease, color 160ms ease;
}

.actionButton:hover {
    background-color: color-mix(in srgb, var(--color-main-primary) 10%, transparent);
}

.actionButton:active {
    background-color: color-mix(in srgb, var(--color-main-primary) 16%, transparent);
}

.logOutButton {
    margin-top: var(--spacing-space-1);
    padding-top: var(--spacing-space-2);
    border-top: 1px solid var(--color-main-divider);
    border-radius: 0;
    color: var(--color-status-error);
}

.logOutButton:hover {
    background-color: color-mix(in srgb, var(--color-status-error) 10%, transparent);
}

.actionIcon {
    --action-icon: none;
    width: var(--spacing-icon-sm);
    height: var(--spacing-icon-sm);
    flex-shrink: 0;
    background-color: currentColor;
    mask: var(--action-icon) center / contain no-repeat;
    -webkit-mask: var(--action-icon) center / contain no-repeat;
    opacity: 0.72;
    pointer-events: none;
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

.menuHeader {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: var(--spacing-space-2) var(--spacing-space-3) var(--spacing-space-1);
}

.menuTitle {
    color: var(--color-button-primary);
    font-size: var(--type-size-caption);
    font-weight: 600;
}

.menuStatus {
    color: var(--color-status-success);
    font-size: var(--type-size-support);
    font-weight: 600;
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
