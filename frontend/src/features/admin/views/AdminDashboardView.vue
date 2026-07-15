<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
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

const menuItems = [
    { label: "Users config", icon: icons.user, to: { name: "admin-users" } },
    { label: "Package config", icon: icons.package, to: { name: "admin-pricing" } },
    { label: "Bot config", icon: icons.shopBot, to: { name: "admin-bots" } },
    { label: "Runtime config", icon: icons.shopServer, to: { name: "admin-vps" } },
] as const;

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
        { label: "Runtime", value: `${d.vpsSlotsUsed}/${d.vpsSlotsTotal}`, hint: `${d.vpsNodes} servers`, icon: icons.shopServer },
        { label: "Revenue 1m", value: baht(d.salesRevenueSatang30d), hint: "paid sales in 30 days", icon: icons.shopBank },
        { label: "Total of sale", value: String(d.packagesSold), hint: "paid packages", icon: icons.package },
        { label: "Sum of sale", value: baht(d.totalSalesSatang), hint: "all paid orders", icon: icons.shopRenew },
        { label: "Money in system", value: baht(d.totalWalletBalanceSatang), hint: `${d.walletCount} wallets`, icon: icons.wallet },
    ] satisfies MetricCard[];
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
    <AdminLayout title="Admin dashboard">
        <div :class="$style.dashboard">
            <section :class="$style.menuSection" aria-labelledby="admin-menu-title">
                <h2 id="admin-menu-title" class="type-h2-section-title-sb" :class="$style.heading">Menu</h2>
                <div :class="$style.menuGrid">
                    <RouterLink v-for="item in menuItems" :key="item.label" :to="item.to" :class="$style.menuCard">
                        <span :class="$style.menuIcon" :style="iconMaskStyle(item.icon)" aria-hidden="true"></span>
                        <span class="type-button-r">{{ item.label }}</span>
                    </RouterLink>
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

            <section v-if="data" :class="$style.metricsBand" aria-label="Platform metrics">
                <div :class="$style.cards">
                    <article v-for="card in cards" :key="card.label" :class="$style.card">
                        <div :class="$style.cardTop">
                            <span class="type-overline-sb" :class="$style.cardLabel">{{ card.label }}</span>
                            <span :class="$style.cardIcon" :style="iconMaskStyle(card.icon)" aria-hidden="true"></span>
                        </div>
                        <strong class="type-h3-card-title-sb" :class="$style.cardValue">{{ card.value }}</strong>
                        <span class="type-caption-r" :class="$style.cardHint">{{ card.hint }}</span>
                    </article>
                </div>
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

.menuSection {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-5);
}

.menuGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, var(--spacing-space-32)));
    gap: var(--spacing-space-8);
}

.menuCard {
    display: flex;
    min-height: var(--spacing-space-32);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-space-3);
    box-sizing: border-box;
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    text-align: center;
    text-decoration: none;
    transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
}

.menuCard:hover {
    border-color: var(--color-main-primary);
    background: var(--color-table-row-hover);
    transform: translateY(calc(var(--spacing-space-1) * -1));
}

.menuCard:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.menuIcon {
    display: inline-block;
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    background-color: currentColor;
    mask: var(--admin-dashboard-icon) center / contain no-repeat;
    -webkit-mask: var(--admin-dashboard-icon) center / contain no-repeat;
}

.cardHint,
.td,
.note {
    color: var(--color-text-secondary);
}

.heading,
.note,
.error {
    margin: 0;
}

.cardLabel,
.cardValue,
.heading,
.actionCell {
    color: var(--color-text-primary);
}

.metricsBand {
    box-sizing: border-box;
    width: 100vw;
    margin-left: calc(50% - 50vw);
    padding: var(--spacing-space-16) var(--spacing-space-4);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.cards {
    display: grid;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
    grid-template-columns: repeat(auto-fit, minmax(var(--spacing-space-64), 1fr));
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
    background: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.cards .cardLabel,
.cards .cardValue,
.cards .cardHint {
    color: var(--color-text-secondary);
}

.cards .cardIcon {
    background-color: var(--color-text-secondary);
}

.cardTop {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
}

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
    .cards {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 760px) {
    .dashboard {
        gap: var(--spacing-space-5);
    }

    .cards,
    .menuGrid {
        grid-template-columns: 1fr;
    }

    .metricsBand {
        padding: var(--spacing-space-8) var(--spacing-space-4);
    }

    .sectionHeader,
    .activityControls,
    .controlField,
    .limitField {
        inline-size: 100%;
    }
}
</style>
