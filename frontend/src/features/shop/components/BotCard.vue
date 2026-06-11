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
            <img
                v-if="image"
                :class="$style.botImage"
                :src="image"
                :alt="name"
                draggable="false"
            >
            <div v-else :class="$style.botImageFallback" aria-hidden="true" />

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
    border: 2px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.botImage,
.botImageFallback,
.skeletonImage {
    width: 100%;
    height: 166px;
    flex-shrink: 0;
    border-radius: var(--radius-xl);
}

.botImage {
    object-fit: cover;
    object-position: center top;
    user-select: none;
    -webkit-user-drag: none;
}

.botImageFallback {
    background: var(--gradient-card-highlight);
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
    color: var(--color-text-secondary);
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
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-full);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
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
    color: var(--color-text-secondary);
    font-size: 20px;
    font-weight: 300;
    line-height: 1.2;
}

.detailLine strong {
    font-weight: 600;
}

.actionList {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    padding: 10px;
    gap: 36px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-full);
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
