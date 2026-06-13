<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import { satangToBaht, type AdminDashboard } from "@/features/admin/config";

const adminStore = useAdminStore();

const data = ref<AdminDashboard | null>(null);
const isLoading = ref(false);
const loadError = ref("");

function baht(satang: number): string {
    return `฿${(satangToBaht(satang) ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const cards = computed(() => {
    const d = data.value;
    if (!d) return [];
    return [
        { label: "Users", value: String(d.totalUsers), hint: `${d.adminUsers} admin` },
        { label: "Bots", value: String(d.totalBots), hint: `${d.runningBots} running` },
        { label: "VPS slots", value: `${d.vpsSlotsUsed} / ${d.vpsSlotsTotal}`, hint: `${d.vpsNodes} nodes` },
        { label: "Revenue (30d)", value: baht(d.topupRevenueSatang30d), hint: "confirmed top-ups" },
        { label: "Wallet credit", value: baht(d.totalWalletBalanceSatang), hint: `${d.walletCount} wallets` },
    ];
});

function formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
}

function auditSummary(action: string, targetType: string | null): string {
    return targetType ? `${action} · ${targetType}` : action;
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
        <p v-if="loadError" :class="$style.error" role="alert">{{ loadError }}</p>
        <p v-if="isLoading && !data" :class="$style.note">Loading…</p>

        <section v-if="data" :class="$style.cards" aria-label="Platform metrics">
            <article v-for="card in cards" :key="card.label" :class="$style.card">
                <span :class="$style.cardLabel">{{ card.label }}</span>
                <span :class="$style.cardValue">{{ card.value }}</span>
                <span :class="$style.cardHint">{{ card.hint }}</span>
            </article>
        </section>

        <section v-if="data" :class="$style.activity" aria-label="Recent admin activity">
            <h2 :class="$style.heading">Recent admin activity</h2>
            <div :class="$style.panel">
                <table :class="$style.table">
                    <thead>
                        <tr>
                            <th :class="$style.th">When</th>
                            <th :class="$style.th">Action</th>
                            <th :class="$style.th">Target</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="entry in data.recentAudit" :key="entry.id">
                            <td :class="$style.td">{{ formatTime(entry.createdAt) }}</td>
                            <td :class="$style.td">{{ auditSummary(entry.action, entry.targetType) }}</td>
                            <td :class="$style.td">{{ entry.targetId ?? entry.targetUserId ?? "—" }}</td>
                        </tr>
                        <tr v-if="data.recentAudit.length === 0">
                            <td :class="$style.empty" colspan="3">No admin activity yet.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </AdminLayout>
</template>

<style module>
.cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
}

.card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-sizing: border-box;
    padding: 20px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.cardLabel { font-size: 14px; color: var(--color-text-disabled); }
.cardValue { font-size: 26px; font-weight: 600; color: var(--color-text-secondary); }
.cardHint { font-size: 12px; color: var(--color-text-disabled); }

.activity { display: flex; flex-direction: column; gap: 12px; }
.heading { margin: 0; font-size: 18px; font-weight: 600; color: var(--color-text-primary); }

.panel {
    box-sizing: border-box;
    overflow-x: auto;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.table { width: 100%; border-collapse: collapse; font-size: 13px; }

.th {
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-disabled);
    border-bottom: 1px solid var(--color-main-divider);
    white-space: nowrap;
}

.td {
    padding: 10px 16px;
    border-bottom: 1px solid var(--color-main-divider);
    white-space: nowrap;
}

.empty { padding: 16px; color: var(--color-text-disabled); }
.note { margin: 0; color: var(--color-text-disabled); }
.error { margin: 0; color: var(--color-status-error); }
</style>
