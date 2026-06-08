<script setup lang="ts">
export type RuntimeCardMode = "default" | "skeleton";
export type RuntimeStatus = "idle" | "usage";

interface Props {
    botName?: string;
    duration: string;
    mode?: RuntimeCardMode;
    remaining: string;
    status?: RuntimeStatus;
}

withDefaults(defineProps<Props>(), {
    botName: "",
    mode: "default",
    status: "idle",
});
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
            <p :class="$style.remaining">{{ remaining }}</p>

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
    height: 160px;
    padding: var(--spacing-space-2);
    gap: 10px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: center;
}

.title,
.remaining {
    margin: 0;
    color: var(--color-text-secondary);
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
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
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
