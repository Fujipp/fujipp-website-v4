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
    min-height: var(--spacing-space-80);
    height: 100%;
    justify-content: space-between;
    padding: var(--spacing-space-3);
    gap: var(--spacing-space-3);
    overflow: hidden;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-muted, var(--color-text-secondary));
    text-align: left;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.header {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-space-3);
    padding-top: var(--spacing-space-2);
}

.avatar {
    width: var(--spacing-space-24);
    height: var(--spacing-space-24);
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
    gap: var(--spacing-space-2);
}

.name {
    margin: 0;
    color: var(--color-text-primary);
    text-align: center;
}

.detailLine {
    align-self: stretch;
    margin: 0;
    font-size: var(--type-size-body-small);
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
    padding: var(--spacing-space-1);
    gap: var(--spacing-space-2);
    border-radius: var(--radius-xl);
}

/* Skeleton */
.skeletonBlock {
    flex-shrink: 0;
    border-radius: var(--radius-xl);
    background: linear-gradient(110deg, var(--shop-card-inset, var(--color-main-surface)) 0%, var(--shop-card-bg, var(--color-main-background)) 48%, var(--shop-card-inset, var(--color-main-surface)) 100%);
    background-size: 220% 100%;
    animation: shop-bot-control-shimmer 1800ms ease-in-out infinite;
}

.skeletonAvatar {
    width: var(--spacing-space-24);
    height: var(--spacing-space-24);
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

</style>
