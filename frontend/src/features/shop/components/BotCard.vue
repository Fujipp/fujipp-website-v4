<script setup lang="ts">
import { computed } from "vue";
import { ActionButton } from "@/shared/ui/buttons";
import type { ActionButtonVariant } from "@/shared/ui/buttons";
import CountdownTimer from "./CountdownTimer.vue";

export type BotCardMode = "add" | "default" | "skeleton";
export type BotStatus = "offline" | "online";

interface Props {
    image?: string;
    mode?: BotCardMode;
    name?: string;
    renewPrice?: string;
    runtime?: string;
    // When set, the Runtime line shows a live "Xd HH:MM:SS" countdown to this
    // date instead of the static `runtime` string.
    runtimeUntil?: string | null;
    status?: BotStatus;
}

const props = withDefaults(defineProps<Props>(), {
    image: "",
    mode: "default",
    name: "BOT NAME",
    renewPrice: "0.00",
    runtime: "30 Days 24:60:99",
    runtimeUntil: null,
    status: "offline",
});

const emit = defineEmits<{
    action: [action: ActionButtonVariant];
    add: [];
}>();

const actions = ["start", "stop", "restart", "edit"] as const;
const statusLabel = computed(() => props.status === "online" ? "Online" : "Offline");
</script>

<template>
    <article
        :class="[
            $style.botCard,
            mode === 'skeleton' ? $style.skeletonCard : '',
            mode === 'add' ? $style.addCard : '',
        ]"
        :aria-label="mode === 'add' ? 'Add bot' : `${name} bot card`"
    >
        <template v-if="mode === 'skeleton'">
            <div :class="[$style.skeletonBlock, $style.skeletonImage]" />
            <div :class="[$style.skeletonBlock, $style.skeletonTitle]" />
            <div :class="[$style.skeletonBlock, $style.skeletonText]" />
            <div :class="[$style.skeletonBlock, $style.skeletonText]" />
            <div :class="[$style.skeletonBlock, $style.skeletonActions]" />
        </template>

        <ActionButton
            v-else-if="mode === 'add'"
            variant="add"
            aria-label="Add bot"
            @click="emit('add')"
        />

        <template v-else>
            <div :class="$style.botHero">
                <template v-if="image">
                    <img :class="$style.botHeroBg" :src="image" alt="" aria-hidden="true" draggable="false">
                    <span :class="$style.botHeroScrim" aria-hidden="true" />
                    <img :class="$style.botAvatar" :src="image" :alt="name" draggable="false">
                </template>
            </div>

            <div :class="$style.titleRow">
                <h3 :class="$style.botName" class="type-h3-card-title-sb">{{ name }}</h3>
                <span :class="$style.statusBadge">
                    <span
                        :class="[$style.statusDot, status === 'online' ? $style.online : $style.offline]"
                        aria-hidden="true"
                    />
                    <span>{{ statusLabel }}</span>
                </span>
            </div>

            <p :class="$style.detailLine">
                Runtime :
                <strong>
                    <CountdownTimer v-if="runtimeUntil" :until="runtimeUntil" />
                    <template v-else>{{ runtime }}</template>
                </strong>
            </p>
            <p :class="$style.detailLine">
                Re-new :
                <strong>{{ renewPrice }}</strong>
                บาท
            </p>

            <div :class="$style.actionList" aria-label="Bot actions">
                <ActionButton
                    v-for="action in actions"
                    :key="action"
                    :variant="action"
                    :aria-label="`${action} ${name}`"
                    @click="emit('action', action)"
                />
            </div>
        </template>
    </article>
</template>

<style module>
.botCard {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    width: 380px;
    height: 450px;
    padding: 10px;
    overflow: hidden;
    border: 2px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.botHero,
.skeletonImage {
    width: 100%;
    height: 166px;
    flex-shrink: 0;
    border-radius: var(--radius-xl);
}

/* Hero = the bot's avatar as a crisp centered circle over a blurred, dimmed copy
   of itself (so a small/low-res Discord avatar never looks stretched). No image →
   just the brand gradient. */
.botHero {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: var(--gradient-card-highlight);
}

.botHeroBg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scale(1.25);
    filter: blur(20px) brightness(0.6) saturate(1.2);
    user-select: none;
    -webkit-user-drag: none;
}

.botHeroScrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        180deg,
        color-mix(in srgb, #000 28%, transparent) 0%,
        color-mix(in srgb, #000 14%, transparent) 100%
    );
}

.botAvatar {
    position: relative;
    width: 112px;
    height: 112px;
    border-radius: var(--radius-full);
    object-fit: cover;
    box-shadow:
        0 0 0 3px color-mix(in srgb, var(--color-neutral-50) 70%, transparent),
        0 10px 26px color-mix(in srgb, #000 45%, transparent);
    user-select: none;
    -webkit-user-drag: none;
}

.titleRow {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 10px;
}

.botName {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--shop-card-text, var(--color-text-secondary));
    text-overflow: ellipsis;
    white-space: nowrap;
}

.statusBadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 105px;
    height: 36px;
    padding: 10px;
    gap: 10px;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-full);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
    font-size: 20px;
    font-weight: 300;
    line-height: 1;
}

.statusDot {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
}

.online {
    background-color: var(--color-status-success);
}

.offline {
    background-color: var(--color-status-error);
}

.detailLine {
    width: 100%;
    margin: 0;
    color: var(--shop-card-text, var(--color-text-secondary));
    font-size: 20px;
    font-weight: 300;
    line-height: 1.2;
}

.detailLine strong {
    font-weight: 600;
}

/* Frosted glass action bar (card surface is always dark → light translucency). */
.actionList {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    padding: 10px;
    gap: 36px;
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 14%, transparent);
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-neutral-900) 22%, transparent);
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
}

/* Frosted dark-glass tiles for the shared ActionButtons, scoped to this card. Kept
   dark in both themes because the action icons are fixed light (#E4E4E4) — a light
   glass on a light card would hide them. The light border + inset give the sheen. */
.actionList button {
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 18%, transparent);
    background: color-mix(in srgb, var(--color-neutral-800) 62%, transparent);
    box-shadow: inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 22%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

.actionList button:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-neutral-50) 30%, transparent);
    background: color-mix(in srgb, var(--color-neutral-700) 70%, transparent);
}

.actionList button:active:not(:disabled) {
    background: color-mix(in srgb, var(--color-neutral-700) 82%, transparent);
}

.addCard {
    align-items: center;
    justify-content: center;
}

.skeletonCard {
    border-color: transparent;
}

.skeletonBlock {
    flex-shrink: 0;
    border-radius: var(--radius-xl);
    background: linear-gradient(110deg, #151515 0%, #ffffff 48%, #151515 100%);
    background-size: 220% 100%;
    animation: shop-card-shimmer 1800ms ease-in-out infinite;
}

.skeletonTitle {
    width: 100%;
    height: 36px;
}

.skeletonText {
    width: 100%;
    height: 30px;
}

.skeletonActions {
    width: 100%;
    height: 52px;
    border-radius: var(--radius-full);
}

@keyframes shop-card-shimmer {
    0% {
        background-position: 120% 0;
    }

    100% {
        background-position: -120% 0;
    }
}

@media (max-width: 520px) {
    .botCard {
        width: min(100%, 380px);
    }

    .statusBadge {
        min-width: auto;
        font-size: 14px;
    }

    .detailLine {
        font-size: 14px;
    }

    .actionList {
        gap: 22px;
    }
}
</style>
