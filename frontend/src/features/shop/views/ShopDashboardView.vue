<script setup lang="ts">
import { computed, ref } from "vue";
import { ShopSidebar, BotCard, FeatureTable, RuntimeCard } from "@/features/shop/components";
import type { BotStatus, FeatureTableRow, RuntimeStatus } from "@/features/shop/components";

const isSidebarOpen = ref(false);
const isLoading = ref(false);

interface OverviewMetric {
    label: string;
    value: number | string;
}

interface BotDashboardItem {
    id: string;
    image?: string;
    name: string;
    renewPrice: string;
    runtime: string;
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
    {
        id: "bot-1",
        image: "/images/users/fujipp/mascot-home-mobile.jpg",
        name: "BOT NAME",
        renewPrice: "0.00",
        runtime: "30 Days 24:60:99",
        status: "online",
    },
];

const features: FeatureTableRow[] = [
    {
        id: "roblox-group-auto",
        feature: "Roblox Group Auto",
        category: "Permanent Feature",
        expire: "-",
    },
    {
        id: "review-credit",
        feature: "Review Credit",
        category: "Rental Feature",
        expire: "30 Days 24:60:99",
    },
];

const runtimes: RuntimeDashboardItem[] = [
    {
        id: "runtime-1",
        botName: "Bot #1",
        duration: "1 Month",
        remaining: "30 Days 24:60:99",
        status: "usage",
    },
    {
        id: "runtime-2",
        botName: "Bot #2",
        duration: "2 Month",
        remaining: "61 Days 24:60:99",
        status: "usage",
    },
    {
        id: "runtime-3",
        duration: "3 Month",
        remaining: "92 Days 24:60:99",
        status: "idle",
    },
];

const overviewMetrics = computed<OverviewMetric[]>(() => {
    const onlineBotCount = bots.filter((bot) => bot.status === "online").length;
    const offlineBotCount = bots.filter((bot) => bot.status === "offline").length;

    return [
        { label: "Online Bot", value: onlineBotCount },
        { label: "Offline Bot", value: offlineBotCount },
        { label: "Features", value: features.length },
        { label: "Runtime", value: runtimes.length },
    ];
});
</script>

<template>
    <div :class="$style.shopDashboard">
        <ShopSidebar v-model="isSidebarOpen" />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.dashboardSection" aria-labelledby="shop-dashboard-title">
                <div :class="$style.titleSection">
                    <h1 id="shop-dashboard-title" :class="$style.pageTitle">DASHBOARD</h1>
                    <div :class="$style.divider" aria-hidden="true" />
                </div>

                <div :class="$style.overviewGrid" aria-label="Shop overview">
                    <article
                        v-for="metric in overviewMetrics"
                        :key="metric.label"
                        :class="$style.metricCard"
                    >
                        <strong :class="$style.metricValue">{{ metric.value }}</strong>
                        <span :class="$style.metricLabel">{{ metric.label }}</span>
                    </article>
                </div>
            </section>

            <section :class="$style.sectionGroup" aria-labelledby="shop-bot-title">
                <h2 id="shop-bot-title" :class="$style.sectionTitle">Bot</h2>
                <div :class="$style.botGrid">
                    <template v-if="isLoading">
                        <BotCard
                            mode="skeleton"
                            name="Loading bot"
                        />
                    </template>
                    <template v-else>
                        <BotCard
                            v-for="bot in bots"
                            :key="bot.id"
                            :name="bot.name"
                            :status="bot.status"
                            :image="bot.image"
                            :runtime="bot.runtime"
                            :renew-price="bot.renewPrice"
                        />
                        <BotCard
                            mode="add"
                            name="Add bot"
                        />
                    </template>
                </div>
            </section>

            <section :class="$style.sectionGroup" aria-labelledby="shop-features-title">
                <h2 id="shop-features-title" :class="$style.sectionTitle">Features</h2>
                <FeatureTable :rows="isLoading ? [] : features" />
            </section>

            <section :class="$style.sectionGroup" aria-labelledby="shop-runtime-title">
                <h2 id="shop-runtime-title" :class="$style.sectionTitle">Runtime</h2>
                <div :class="$style.runtimeGrid">
                    <template v-if="isLoading">
                        <RuntimeCard
                            mode="skeleton"
                            duration="Loading runtime"
                            remaining=""
                        />
                    </template>
                    <template v-else>
                        <RuntimeCard
                            v-for="runtime in runtimes"
                            :key="runtime.id"
                            :duration="runtime.duration"
                            :remaining="runtime.remaining"
                            :status="runtime.status"
                            :bot-name="runtime.botName"
                        />
                    </template>
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
    padding: 20px;
    gap: 20px;
    transition: margin-left 180ms ease;
}

.sidebarOpen {
    margin-left: 194px;
}

.sidebarClosed {
    margin-left: 44px;
}

.dashboardSection,
.sectionGroup {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.titleSection {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.pageTitle,
.sectionTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-weight: 600;
    line-height: 1;
}

.pageTitle {
    font-size: 32px;
}

.sectionTitle {
    font-size: 28px;
}

.divider {
    height: 1px;
    background-color: var(--color-main-divider);
}

.overviewGrid {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
    padding-inline: 20px;
}

.metricCard {
    display: flex;
    width: min(100%, 238.869px);
    height: 160px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--spacing-space-2);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background: var(--gradient-card-highlight);
    color: var(--color-text-secondary);
    text-align: center;
}

.metricValue {
    color: var(--color-text-secondary);
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
}

.metricLabel {
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 800;
    line-height: 1;
}

.botGrid,
.runtimeGrid {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 20px;
    padding-inline: 20px;
}

.runtimeGrid {
    gap: 15px;
}

@media (max-width: 920px) {
    .overviewGrid,
    .botGrid,
    .runtimeGrid {
        padding-inline: 0;
    }
}

@media (max-width: 760px) {
    .content {
        padding: 20px;
    }

    .overviewGrid {
        justify-content: center;
    }

    .metricCard {
        width: min(100%, 238.869px);
    }
}
</style>
