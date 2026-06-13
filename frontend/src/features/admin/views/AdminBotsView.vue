<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import type { AdminBot } from "@/features/admin/config";

const router = useRouter();
const adminStore = useAdminStore();

const bots = ref<AdminBot[]>([]);
const isLoading = ref(false);
const loadError = ref("");

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        bots.value = await adminStore.fetchBots();
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load bots";
    } finally {
        isLoading.value = false;
    }
}

function openConfig(bot: AdminBot): void {
    void router.push({ name: "admin-bot-config", params: { botId: bot.id } });
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
}

onMounted(load);
</script>

<template>
    <AdminLayout title="Bots">
        <p v-if="loadError" :class="$style.error" role="alert">{{ loadError }}</p>

        <div :class="$style.panel">
            <table :class="$style.table">
                <thead>
                    <tr>
                        <th :class="$style.th">Name</th>
                        <th :class="$style.th">Owner</th>
                        <th :class="$style.th">Status</th>
                        <th :class="$style.th">Discord app</th>
                        <th :class="$style.th">Token</th>
                        <th :class="$style.th">Created</th>
                        <th :class="$style.th" />
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="bot in bots" :key="bot.id">
                        <td :class="$style.td">{{ bot.name }}</td>
                        <td :class="$style.td">{{ bot.ownerName ?? bot.ownerEmail ?? bot.ownerId.slice(0, 8) }}</td>
                        <td :class="$style.td">{{ bot.status }}</td>
                        <td :class="$style.td">{{ bot.discordApplicationId ?? "—" }}</td>
                        <td :class="$style.td">{{ bot.tokenConfigured ? "✓" : "—" }}</td>
                        <td :class="$style.td">{{ formatDate(bot.createdAt) }}</td>
                        <td :class="$style.td">
                            <button type="button" :class="$style.configBtn" @click="openConfig(bot)">Config</button>
                        </td>
                    </tr>
                    <tr v-if="!isLoading && bots.length === 0"><td :class="$style.empty" colspan="7">No bots.</td></tr>
                    <tr v-if="isLoading"><td :class="$style.empty" colspan="7">Loading…</td></tr>
                </tbody>
            </table>
        </div>
    </AdminLayout>
</template>

<style module>
.panel {
    box-sizing: border-box;
    overflow-x: auto;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.table { width: 100%; border-collapse: collapse; font-size: 14px; }

.th {
    padding: 14px 16px;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-disabled);
    border-bottom: 1px solid var(--color-main-divider);
    white-space: nowrap;
}

.td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-main-divider);
    white-space: nowrap;
}

.configBtn {
    padding: 6px 14px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    cursor: pointer;
    transition: background-color 140ms ease;
}

.configBtn:hover { background-color: var(--color-table-row-hover); }

.empty { padding: 20px 16px; color: var(--color-text-disabled); }
.error { margin: 0; color: var(--color-status-error); }
</style>
