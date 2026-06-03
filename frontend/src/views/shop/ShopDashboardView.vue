<script setup lang="ts">
import { computed, ref } from "vue";
import ShopSidebar from "@/components/layout/AppSidebar/ShopSidebar.vue";
import { BotCard, FeatureTable, RuntimeCard } from "@/components";
import type { BotStatus, FeatureTableRow, RuntimeStatus } from "@/components";

const isSidebarOpen = ref(true);

interface OverviewMetric {
    label: string;
    value: number | string;
}

interface BotDashboardItem {
    id: string;
    image?: string;
    name: string;
    status: BotStatus;
}

interface RuntimeDashboardItem {
    botName?: string;
    duration: string;
    id: string;
    remaining: string;
    status: RuntimeStatus;
}

const bots: BotDashboardItem[] = [
];

const features: FeatureTableRow[] = [
];

const runtimes: RuntimeDashboardItem[] = [
];

const overviewMetrics = computed<OverviewMetric[]>(() => {
    const onlineBotCount = bots.filter((bot) => bot.status === "online").length;
    const offlineBotCount = bots.filter((bot) => bot.status === "offline").length;
    const permanentFeatureCount = features.filter((feature) => feature.category === "Permanent Feature").length;
    const rentalFeatureCount = features.filter((feature) => feature.category === "Rental Feature").length;
    const activeRuntimeCount = runtimes.filter((runtime) => runtime.status === "usage").length;

    return [
        { label: "Online Bot", value: onlineBotCount },
        { label: "Offline Bot", value: offlineBotCount },
        { label: "Permanent Feature", value: permanentFeatureCount },
        { label: "Rental Feature", value: rentalFeatureCount },
        { label: "Runtime", value: activeRuntimeCount },
    ];
});
</script>

<template>
    <div :class="$style.shopDashboard">
        <ShopSidebar v-model="isSidebarOpen" />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.titleSection">
                <h1 :class="$style.pageTitle" class="type-h1-page-title-sb">DASHBOARD</h1>
                <div :class="$style.divider" aria-hidden="true" />
            </section>

            <section :class="$style.overviewGrid" aria-label="Shop overview">
                <article
                    v-for="metric in overviewMetrics"
                    :key="metric.label"
                    :class="$style.metricCard"
                >
                    <strong :class="$style.metricValue">{{ metric.value }}</strong>
                    <span :class="$style.metricLabel">{{ metric.label }}</span>
                </article>
            </section>

            <section :class="$style.sectionGroup" aria-labelledby="shop-bot-title">
                <h2 id="shop-bot-title" :class="$style.sectionTitle" class="type-h2-section-title-r">Bot</h2>
                <div :class="$style.botGrid">
                    <BotCard
                        v-for="bot in bots"
                        :key="bot.id"
                        :name="bot.name"
                        :status="bot.status"
                        :image="bot.image"
                    />
                </div>
            </section>

            <section :class="$style.sectionGroup" aria-labelledby="shop-features-title">
                <h2 id="shop-features-title" :class="$style.sectionTitle" class="type-h2-section-title-r">Features</h2>
                <FeatureTable :rows="features" />
            </section>

            <section :class="$style.sectionGroup" aria-labelledby="shop-runtime-title">
                <h2 id="shop-runtime-title" :class="$style.sectionTitle" class="type-h2-section-title-r">Runtime</h2>
                <div :class="$style.runtimeGrid">
                    <RuntimeCard
                        v-for="runtime in runtimes"
                        :key="runtime.id"
                        :duration="runtime.duration"
                        :remaining="runtime.remaining"
                        :status="runtime.status"
                        :bot-name="runtime.botName"
                    />
                </div>
            </section>
        </main>
    </div>
</template>

<style module>
.shopDashboard {
    display: flex;
    min-height: 100vh;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

.content {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-12) var(--spacing-space-6) var(--spacing-space-16);
    gap: var(--spacing-space-5);
    transition: margin-left 180ms ease;
}

.sidebarOpen {
    margin-left: 194px;
}

.sidebarClosed {
    margin-left: 44px;
}

.titleSection {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.pageTitle,
.sectionTitle {
    margin: 0;
}

.divider {
    height: 1px;
    background-color: var(--color-main-divider);
}

.overviewGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--spacing-space-3);
}

.metricCard {
    display: flex;
    min-height: 93px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--spacing-space-2);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background: var(--gradient-card-highlight);
    color: var(--color-text-secondary);
    text-align: center;
}

.metricValue {
    font-size: 36px;
    font-weight: 600;
    line-height: 56px;
}

.metricLabel {
    font-size: 14px;
    font-weight: 600;
    line-height: normal;
}

.sectionGroup {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
}

.botGrid,
.runtimeGrid {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--spacing-space-5);
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-12) var(--spacing-space-3) var(--spacing-space-16);
    }

    .overviewGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .metricCard {
        min-height: 93px;
    }
}
</style>
