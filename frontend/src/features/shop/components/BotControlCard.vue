<script setup lang="ts">
import { computed } from "vue";
import { ActionButton } from "@/shared/ui/buttons";
import BotStatusBadge, { type BotOnlineStatus } from "./BotStatusBadge.vue";

export type BotControlCardMode = "default" | "skeleton";
// The control the user pressed. `power` toggles between play/pause based on the
// current status; the card only emits intent — the parent runs the action.
export type BotControlAction = "power" | "restart" | "edit";

interface Props {
    mode?: BotControlCardMode;
    name?: string;
    status?: BotOnlineStatus;
    // The bot's round avatar image.
    avatar?: string;
    // Pre-formatted display strings (e.g. "30 Days" / "23:59:60").
    runtimeDays?: string;
    runtimeClock?: string;
    vps?: string | number;
    slot?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
    mode: "default",
    name: "Bot Name",
    status: "offline",
    avatar: "",
    runtimeDays: "30 Days",
    runtimeClock: "23:59:60",
    vps: 1,
    slot: 1,
});

const emit = defineEmits<{ control: [action: BotControlAction] }>();

const powerAction = computed(() => (props.status === "online" ? "pause" : "play"));
</script>

<template>
    <article
        :class="[$style.card, mode === 'skeleton' ? $style.skeletonCard : '']"
        :aria-label="`${name} bot card`"
    >
        <template v-if="mode === 'skeleton'">
            <div :class="[$style.skeletonBlock, $style.skeletonAvatar]" />
            <div :class="[$style.skeletonBlock, $style.skeletonTitle]" />
            <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
            <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
            <div :class="[$style.skeletonBlock, $style.skeletonActions]" />
        </template>

        <template v-else>
            <div :class="$style.header">
                <img
                    v-if="avatar"
                    :class="$style.avatar"
                    :src="avatar"
                    :alt="name"
                    draggable="false"
                >
                <div v-else :class="[$style.avatar, $style.avatarFallback]" aria-hidden="true" />

                <div :class="$style.titleRow">
                    <h3 :class="$style.name" class="type-h3-card-title-eb">{{ name }}</h3>
                    <BotStatusBadge :status="status" />
                </div>
            </div>

            <p :class="$style.detailLine">
                <span :class="$style.detailLabel">Runtime : </span>
                <span :class="$style.detailValue">{{ runtimeDays }}</span>
                <span :class="$style.detailValue"> {{ runtimeClock }}</span>
            </p>
            <p :class="$style.detailLine">
                <span :class="$style.detailLabel">VPS : </span>
                <span :class="$style.detailValue">{{ vps }}</span>
                <span :class="$style.detailLabel"> Slot : </span>
                <span :class="$style.detailValue">{{ slot }}</span>
            </p>

            <div :class="$style.controls" aria-label="Bot controls">
                <ActionButton
                    :action="powerAction"
                    :aria-label="`${powerAction} ${name}`"
                    @click="emit('control', 'power')"
                />
                <ActionButton
                    action="restart"
                    :aria-label="`restart ${name}`"
                    @click="emit('control', 'restart')"
                />
                <ActionButton
                    action="edit"
                    :aria-label="`edit ${name}`"
                    @click="emit('control', 'edit')"
                />
            </div>
        </template>
    </article>
</template>

<style module>
.card {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    padding: 10px;
    gap: 12px;
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-secondary);
    text-align: left;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.header {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding-top: 6px;
}

.avatar {
    width: 100px;
    height: 100px;
    border-radius: var(--radius-full);
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
}

.avatarFallback {
    background: var(--gradient-card-highlight);
}

.titleRow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.name {
    margin: 0;
    color: var(--color-text-primary);
    text-align: center;
}

.detailLine {
    align-self: stretch;
    margin: 0;
    font-size: 18px;
    line-height: 1.3;
}

.detailLabel {
    font-weight: 300;
}

.detailValue {
    font-weight: 600;
}

.controls {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    gap: 10px;
    border-radius: var(--radius-xl);
}

/* Skeleton */
.skeletonBlock {
    flex-shrink: 0;
    border-radius: var(--radius-xl);
    background: linear-gradient(110deg, #151515 0%, #ffffff 48%, #151515 100%);
    background-size: 220% 100%;
    animation: shop-bot-control-shimmer 1800ms ease-in-out infinite;
}

.skeletonAvatar {
    width: 100px;
    height: 100px;
    border-radius: var(--radius-full);
}

.skeletonTitle {
    width: 140px;
    height: 29px;
}

.skeletonLine {
    width: 240px;
    height: 22px;
}

.skeletonActions {
    width: 116px;
    height: 32px;
}

@keyframes shop-bot-control-shimmer {
    0% {
        background-position: 120% 0;
    }

    100% {
        background-position: -120% 0;
    }
}

@media (max-width: 520px) {
    .detailLine {
        font-size: 16px;
    }
}
</style>
