<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { PrimaryButton } from "@/shared/ui/buttons";
import { icons } from "@/config";
import BotStatusBadge, { type BotOnlineStatus } from "./BotStatusBadge.vue";

export type BotControlCardMode = "default" | "skeleton";
export type BotControlAction = "power" | "restart" | "edit";

interface Props {
    mode?: BotControlCardMode;
    name?: string;
    status?: BotOnlineStatus;
    avatar?: string;
    runtimeDays?: string;
    runtimeClock?: string;
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    mode: "default",
    name: "Bot Name",
    status: "offline",
    avatar: "",
    runtimeDays: "No Runtime",
    runtimeClock: "",
    disabled: false,
});

const emit = defineEmits<{ control: [action: BotControlAction] }>();
const avatarFailed = ref(false);
const powerLabel = computed(() => (props.status === "online" ? "Stop" : "Start"));
const powerIcon = computed(() => (props.status === "online" ? icons.pause : icons.play));

watch(() => props.avatar, () => { avatarFailed.value = false; });
</script>

<template>
    <article :class="[$style.card, mode === 'skeleton' ? $style.skeletonCard : '']" :aria-label="`${name} bot card`">
        <template v-if="mode === 'skeleton'">
            <div :class="$style.summary">
                <div :class="[$style.skeletonBlock, $style.skeletonAvatar]" />
                <div :class="$style.skeletonCopy">
                    <div :class="[$style.skeletonBlock, $style.skeletonTitle]" />
                    <div :class="[$style.skeletonBlock, $style.skeletonStatus]" />
                    <div :class="[$style.skeletonBlock, $style.skeletonRuntime]" />
                </div>
            </div>
            <div :class="$style.divider" />
            <div :class="[$style.skeletonBlock, $style.skeletonActions]" />
        </template>

        <template v-else>
            <div :class="$style.summary">
                <img v-if="avatar && !avatarFailed" :class="$style.avatar" :src="avatar" :alt="`${name} avatar`" draggable="false" @error="avatarFailed = true">
                <div v-else :class="[$style.avatar, $style.avatarFallback]" aria-hidden="true">
                    <span>{{ name.slice(0, 1).toUpperCase() }}</span>
                </div>

                <div :class="$style.copy">
                    <h3 :class="$style.name" class="type-h3-card-title-eb">{{ name }}</h3>
                    <BotStatusBadge :status="status" />
                    <p :class="$style.runtime" class="type-body-small-r">
                        <strong>{{ runtimeDays }}</strong>
                        <span v-if="runtimeClock"> {{ runtimeClock }}</span>
                    </p>
                </div>
            </div>

            <div :class="$style.divider" />

            <div :class="$style.controls" aria-label="Bot controls">
                <PrimaryButton width-mode="hug" :leading-icon="powerIcon" :disabled="disabled" @click="emit('control', 'power')">
                    {{ powerLabel }}
                </PrimaryButton>
                <PrimaryButton width-mode="hug" :leading-icon="icons.restart" :disabled="disabled" @click="emit('control', 'restart')">
                    Restart
                </PrimaryButton>
                <PrimaryButton width-mode="hug" :leading-icon="icons.setting" :disabled="disabled" @click="emit('control', 'edit')">
                    Setting
                </PrimaryButton>
            </div>
        </template>
    </article>
</template>

<style module>
.card {
    display: flex;
    width: 100%;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-3);
    gap: var(--spacing-space-3);
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

.summary {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: var(--spacing-space-3);
}

.avatar {
    width: 100px;
    height: 100px;
    flex: 0 0 100px;
    border-radius: var(--radius-xl);
    object-fit: cover;
}

.avatarFallback {
    display: grid;
    place-items: center;
    background: var(--gradient-card-highlight);
    color: var(--color-text-primary);
    font-size: var(--type-size-h2-section-title);
    font-weight: 800;
}

.copy,
.skeletonCopy {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-space-2);
}

.name,
.runtime {
    margin: 0;
}

.name {
    max-width: 100%;
    overflow: hidden;
    color: var(--color-text-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.runtime {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-space-1);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.divider {
    align-self: stretch;
    height: 1px;
    background-color: var(--color-main-divider);
}

.controls {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--spacing-space-2);
}

.controls > * {
    flex: 1 1 96px;
}

.skeletonBlock {
    border-radius: var(--radius-xl);
    background: linear-gradient(110deg, var(--color-main-surface) 0%, var(--color-main-background) 48%, var(--color-main-surface) 100%);
    background-size: 220% 100%;
    animation: shimmer 1800ms ease-in-out infinite;
}

.skeletonAvatar { width: 100px; height: 100px; flex: 0 0 100px; }
.skeletonTitle { width: 70%; height: 28px; }
.skeletonStatus { width: 76px; height: 28px; }
.skeletonRuntime { width: 90%; height: 22px; }
.skeletonActions { align-self: stretch; height: 44px; }

@keyframes shimmer {
    from { background-position: 120% 0; }
    to { background-position: -120% 0; }
}

@media (prefers-reduced-motion: reduce) {
    .skeletonBlock { animation: none; }
}
</style>
