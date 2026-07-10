<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { icons } from "@/config";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import { satangToBaht, type AdminDashboard } from "@/features/admin/config";
import { SelectField, type SelectFieldOption } from "@/shared/ui";

interface MetricCard {
    label: string;
    value: string;
    hint: string;
    icon: string;
}

const adminStore = useAdminStore();

const data = ref<AdminDashboard | null>(null);
const isLoading = ref(false);
const loadError = ref("");
const activitySort = ref("newest");
const activityLimit = ref("10");
const activitySortOptions: SelectFieldOption[] = [
    { label: "Newest first", value: "newest" },
    { label: "Oldest first", value: "oldest" },
    { label: "Action", value: "action" },
];
const activityLimitOptions: SelectFieldOption[] = [
    { label: "5", value: "5" },
    { label: "10", value: "10" },
    { label: "20", value: "20" },
    { label: "50", value: "50" },
];

function baht(satang: number): string {
    return `฿${(satangToBaht(satang) ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const cards = computed(() => {
    const d = data.value;
    if (!d) return [];
    return [
        { label: "Users", value: String(d.totalUsers), hint: `${d.adminUsers} admin`, icon: icons.user },
        { label: "Bots", value: String(d.totalBots), hint: `${d.runningBots} running`, icon: icons.shopBot },
        { label: "VPS slots", value: `${d.vpsSlotsUsed} / ${d.vpsSlotsTotal}`, hint: `${d.vpsNodes} nodes`, icon: icons.shopServer },
        { label: "Revenue (30d)", value: baht(d.topupRevenueSatang30d), hint: "confirmed top-ups", icon: icons.shopBank },
        { label: "Wallet credit", value: baht(d.totalWalletBalanceSatang), hint: `${d.walletCount} wallets`, icon: icons.wallet },
    ] satisfies MetricCard[];
});

const summaryCards = computed(() => {
    const d = data.value;
    if (!d) return [];
    return [
        { label: "Active bots", value: `${d.runningBots}/${d.totalBots}`, icon: icons.play },
        { label: "Capacity", value: `${d.vpsSlotsUsed}/${d.vpsSlotsTotal}`, icon: icons.performance },
        { label: "Audit", value: String(d.recentAudit.length), icon: icons.history },
    ];
});

const recentActivity = computed(() => {
    const entries = [...(data.value?.recentAudit ?? [])];
    entries.sort((left, right) => {
        if (activitySort.value === "action") {
            return auditSummary(left.action, left.targetType).localeCompare(auditSummary(right.action, right.targetType));
        }
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();
        return activitySort.value === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
    return entries.slice(0, Number(activityLimit.value));
});

function formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
}

function auditSummary(action: string, targetType: string | null): string {
    return targetType ? `${action} · ${targetType}` : action;
}

function iconMaskStyle(icon: string): Record<string, string> {
    return { "--admin-dashboard-icon": `url(${icon})` };
}

function auditTarget(entry: { targetId: string | null; targetUserId: string | null }): string {
    return entry.targetId ?? entry.targetUserId ?? "—";
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        data.value = await adminStore.fetchDashboard();
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load dashboard";
    } finally {
        isLoading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <AdminLayout title="Dashboard">
        <div :class="$style.dashboard">
            <section :class="$style.hero" aria-labelledby="admin-dashboard-overview">
                <div :class="$style.heroCopy">
                    <span class="type-overline-sb" :class="$style.eyebrow">Admin control</span>
                    <h2 id="admin-dashboard-overview" class="type-h2-section-title-sb" :class="$style.heroTitle">
                        Platform overview
                    </h2>
                    <p class="type-body-small-r" :class="$style.heroText">
                        Users, bots, runtime capacity, wallet credit, and admin actions.
                    </p>
                </div>
                <div v-if="data" :class="$style.summaryGrid" aria-label="Operational summary">
                    <article v-for="item in summaryCards" :key="item.label" :class="$style.summaryItem">
                        <span :class="$style.summaryIcon" :style="iconMaskStyle(item.icon)" aria-hidden="true"></span>
                        <span class="type-overline-sb" :class="$style.summaryLabel">{{ item.label }}</span>
                        <strong class="type-body-small-sb" :class="$style.summaryValue">{{ item.value }}</strong>
                    </article>
                </div>
            </section>

            <section v-if="loadError" :class="$style.statePanel" role="alert">
                <span :class="$style.stateIcon" :style="iconMaskStyle(icons.error)" aria-hidden="true"></span>
                <p class="type-body-small-sb" :class="$style.error">{{ loadError }}</p>
            </section>
            <section v-if="isLoading && !data" :class="$style.statePanel" aria-live="polite">
                <span :class="$style.stateIcon" :style="iconMaskStyle(icons.info)" aria-hidden="true"></span>
                <p class="type-body-small-sb" :class="$style.note">Loading dashboard…</p>
            </section>

            <section v-if="data" :class="$style.cards" aria-label="Platform metrics">
                <article v-for="card in cards" :key="card.label" :class="$style.card">
                    <div :class="$style.cardTop">
                        <span class="type-overline-sb" :class="$style.cardLabel">{{ card.label }}</span>
                        <span :class="$style.cardIcon" :style="iconMaskStyle(card.icon)" aria-hidden="true"></span>
                    </div>
                    <strong class="type-h3-card-title-sb" :class="$style.cardValue">{{ card.value }}</strong>
                    <span class="type-caption-r" :class="$style.cardHint">{{ card.hint }}</span>
                </article>
            </section>

            <section v-if="data" :class="$style.activity" aria-label="Recent admin activity">
                <header :class="$style.sectionHeader">
                    <div :class="$style.sectionTitleGroup">
                        <span :class="$style.sectionIcon" :style="iconMaskStyle(icons.history)" aria-hidden="true"></span>
                        <h2 class="type-subtitle-sb" :class="$style.heading">Recent admin activity</h2>
                    </div>
                    <div :class="$style.activityControls" aria-label="Activity table controls">
                        <SelectField
                            v-model="activitySort"
                            :class="$style.controlField"
                            label="Sort"
                            :options="activitySortOptions"
                        />
                        <SelectField
                            v-model="activityLimit"
                            :class="$style.limitField"
                            label="Show"
                            :options="activityLimitOptions"
                        />
                    </div>
                </header>
                <div :class="$style.panel">
                    <table :class="$style.table">
                        <thead>
                            <tr>
                                <th class="type-caption-sb" :class="$style.th">When</th>
                                <th class="type-caption-sb" :class="$style.th">Action</th>
                                <th class="type-caption-sb" :class="$style.th">Target</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="entry in recentActivity" :key="entry.id" :class="$style.row">
                                <td class="type-caption-r" :class="$style.td">{{ formatTime(entry.createdAt) }}</td>
                                <td class="type-caption-sb" :class="[$style.td, $style.actionCell]">
                                    {{ auditSummary(entry.action, entry.targetType) }}
                                </td>
                                <td class="type-caption-r" :class="$style.td">{{ auditTarget(entry) }}</td>
                            </tr>
                            <tr v-if="recentActivity.length === 0">
                                <td class="type-body-small-r" :class="$style.empty" colspan="3">
                                    No admin activity yet.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    </AdminLayout>
</template>

<style module>
.dashboard {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-6);
    color: var(--color-text-primary);
}

.hero {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: var(--spacing-space-6);
    box-sizing: border-box;
    padding: var(--spacing-space-6);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-2xl);
    background: var(--color-main-background);
}

.heroCopy {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--spacing-space-2);
    min-width: 0;
}

.eyebrow,
.heroText,
.summaryLabel,
.cardHint,
.td,
.note {
    color: var(--color-text-secondary);
}

.heroTitle,
.heroText,
.heading,
.note,
.error {
    margin: 0;
}

.heroTitle,
.summaryValue,
.cardLabel,
.cardValue,
.heading,
.actionCell {
    color: var(--color-text-primary);
}

.summaryGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-space-3);
    inline-size: min(100%, var(--spacing-space-114));
}

.summaryItem {
    display: grid;
    grid-template-columns: var(--spacing-icon-md) 1fr;
    align-items: center;
    gap: var(--spacing-space-1) var(--spacing-space-3);
    box-sizing: border-box;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.summaryIcon {
    grid-row: span 2;
}

.cards {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
    box-sizing: border-box;
    min-block-size: var(--spacing-space-40);
    padding: var(--spacing-space-5);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.cardTop {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
}

.summaryIcon,
.cardIcon,
.sectionIcon,
.stateIcon {
    display: inline-block;
    flex: 0 0 auto;
    inline-size: var(--spacing-icon-md);
    block-size: var(--spacing-icon-md);
    background-color: var(--color-text-primary);
    mask: var(--admin-dashboard-icon) center / contain no-repeat;
}

.cardIcon {
    inline-size: var(--spacing-icon-lg);
    block-size: var(--spacing-icon-lg);
}

.cardValue {
    overflow-wrap: anywhere;
}

.activity {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
}

.sectionHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-space-4);
}

.sectionTitleGroup {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
}

.activityControls {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: var(--spacing-space-3);
}

.controlField {
    inline-size: var(--spacing-space-48);
}

.limitField {
    inline-size: var(--spacing-space-32);
}

.panel {
    box-sizing: border-box;
    overflow-x: auto;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.table {
    inline-size: 100%;
    border-collapse: collapse;
}

.th {
    padding: var(--spacing-space-3) var(--spacing-space-4);
    text-align: left;
    color: var(--color-text-primary);
    border-bottom: 1px solid var(--color-main-divider);
    white-space: nowrap;
}

.td {
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border-bottom: 1px solid var(--color-main-divider);
    white-space: nowrap;
}

.row:last-child .td {
    border-bottom: 0;
}

.empty {
    padding: var(--spacing-space-6);
    color: var(--color-text-secondary);
    text-align: center;
}

.statePanel {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
    box-sizing: border-box;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.error {
    color: var(--color-status-error);
}

@media (max-width: 1180px) {
    .hero {
        flex-direction: column;
    }

    .summaryGrid {
        inline-size: 100%;
    }

    .cards {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 760px) {
    .dashboard {
        gap: var(--spacing-space-5);
    }

    .hero {
        padding: var(--spacing-space-5);
    }

    .summaryGrid,
    .cards {
        grid-template-columns: 1fr;
    }

    .sectionHeader,
    .activityControls,
    .controlField,
    .limitField {
        inline-size: 100%;
    }
}
</style>
