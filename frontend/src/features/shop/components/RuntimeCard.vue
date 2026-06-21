<script setup lang="ts">
import CountdownTimer from "./CountdownTimer.vue";

export type RuntimeCardMode = "default" | "skeleton";
export type RuntimeStatus = "idle" | "usage";

interface Props {
    botName?: string;
    duration: string;
    mode?: RuntimeCardMode;
    remaining: string;
    status?: RuntimeStatus;
    // Lifecycle controls — present when this card maps to a real subscription.
    subscriptionId?: string;
    autoRenew?: boolean;
    currentPeriodEnd?: string | null;
    busy?: boolean;
}

withDefaults(defineProps<Props>(), {
    botName: "",
    mode: "default",
    status: "idle",
    subscriptionId: "",
    autoRenew: false,
    currentPeriodEnd: null,
    busy: false,
});

const emit = defineEmits<{ toggleAutoRenew: [value: boolean]; renew: [] }>();
</script>

<template>
    <article
        :class="[$style.runtimeCard, mode === 'skeleton' ? $style.skeletonCard : '']"
        :aria-label="`${duration} runtime`"
    >
        <template v-if="mode === 'skeleton'">
            <div :class="$style.skeletonBlock" />
        </template>

        <template v-else>
            <h3 :class="$style.title">{{ duration }}</h3>
            <p :class="$style.remaining">
                <CountdownTimer v-if="currentPeriodEnd" :until="currentPeriodEnd" />
                <template v-else>{{ remaining }}</template>
            </p>

            <div :class="$style.statusRow">
                <span :class="$style.statusBadge">
                    <span
                        :class="[$style.statusDot, status === 'usage' ? $style.usageDot : $style.idleDot]"
                        aria-hidden="true"
                    />
                    {{ status === "usage" ? "Usage" : "Not use" }}
                </span>
                <span v-if="status === 'usage' && botName" :class="$style.botBadge">
                    {{ botName }}
                </span>
            </div>

            <div v-if="subscriptionId" :class="$style.controls">
                <label :class="$style.autoRenew">
                    <input
                        type="checkbox"
                        :checked="autoRenew"
                        :disabled="busy"
                        @change="emit('toggleAutoRenew', ($event.target as HTMLInputElement).checked)"
                    />
                    <span>ต่ออัตโนมัติ</span>
                </label>
                <button type="button" :class="$style.renewButton" :disabled="busy" @click="emit('renew')">
                    {{ busy ? "…" : "ต่ออายุ" }}
                </button>
            </div>
        </template>
    </article>
</template>

<style module>
.runtimeCard {
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    width: 280px;
    min-height: 160px;
    padding: var(--spacing-space-2);
    gap: 10px;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
    text-align: center;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.title,
.remaining {
    margin: 0;
    color: var(--shop-card-text, var(--color-text-secondary));
}

.title {
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
}

.remaining {
    min-width: 100%;
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
}

.statusRow {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
}

.statusBadge,
.botBadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    height: 36px;
    padding: 10px;
    gap: 10px;
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-full);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
    font-size: 20px;
    font-weight: 300;
    line-height: 1;
    white-space: nowrap;
}

.statusDot {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
}

.usageDot {
    background-color: var(--color-status-success);
}

.idleDot {
    background-color: var(--color-status-warning);
}

.controls {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--spacing-space-3);
    margin-top: 2px;
}

.autoRenew {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--shop-card-text, var(--color-text-secondary));
    font-size: 13px;
    cursor: pointer;
}

.autoRenew input {
    accent-color: var(--color-main-primary);
    cursor: pointer;
}

.renewButton {
    height: 32px;
    padding: 0 var(--spacing-space-4);
    border: 0;
    border-radius: var(--radius-full);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
}

.renewButton:hover:not(:disabled) {
    background-color: var(--color-button-primary-btn-hover);
}

.renewButton:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.skeletonCard {
    border-color: transparent;
    padding: 0;
    overflow: hidden;
}

.skeletonBlock {
    width: 100%;
    height: 100%;
    border-radius: var(--radius-xl);
    background: linear-gradient(110deg, #151515 0%, #ffffff 48%, #151515 100%);
    background-size: 220% 100%;
    animation: shop-runtime-shimmer 1800ms ease-in-out infinite;
}

@keyframes shop-runtime-shimmer {
    0% {
        background-position: 120% 0;
    }

    100% {
        background-position: -120% 0;
    }
}

@media (max-width: 520px) {
    .runtimeCard {
        width: min(100%, 280px);
    }

    .title {
        font-size: 28px;
    }

    .statusBadge,
    .botBadge {
        height: 30px;
        padding: 8px;
        font-size: 16px;
    }
}
</style>
