<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import type { AdminBot, AdminBotLiveStatus, AdminUser } from "@/features/admin/config";
import { SearchField, SecondaryButton, StatusToast } from "@/shared/ui";

const router = useRouter();
const adminStore = useAdminStore();

const bots = ref<AdminBot[]>([]);
const isLoading = ref(false);
const loadError = ref("");

// Transfer dialog state
const transferBotTarget = ref<AdminBot | null>(null);
const users = ref<AdminUser[]>([]);
const targetUserId = ref("");
const query = ref("");
const isTransferring = ref(false);

const filteredUsers = computed<AdminUser[]>(() => {
    const ownerId = transferBotTarget.value?.ownerId;
    const pool = users.value.filter((u) => u.id !== ownerId);
    const q = query.value.trim().toLowerCase();
    const matched = q === ""
        ? pool
        : pool.filter((u) =>
            (u.displayName ?? "").toLowerCase().includes(q)
            || (u.username ?? "").toLowerCase().includes(q)
            || (u.email ?? "").toLowerCase().includes(q)
            || u.id.toLowerCase().includes(q));
    return matched.slice(0, 8);
});

// Per-row runtime action in flight (botId), so its buttons disable while it runs.
const runtimeBusyId = ref<string | null>(null);

// Live pm2 status fetched on-demand per row (botId → status). Empty until refreshed.
const liveStatus = ref<Record<string, AdminBotLiveStatus>>({});
const statusBusyId = ref<string | null>(null);

const STATE_TONE: Record<string, string> = {
    online: "ok",
    stopped: "muted",
    errored: "error",
    stopping: "muted",
    launching: "ok",
};

function stateTone(state: string): string {
    return STATE_TONE[state] ?? "muted";
}

function formatUptime(startedMs: number | null): string {
    if (!startedMs) return "";
    const secs = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

async function refreshStatus(bot: AdminBot): Promise<void> {
    statusBusyId.value = bot.id;
    try {
        const status = await adminStore.botStatus(bot.id);
        liveStatus.value = { ...liveStatus.value, [bot.id]: status };
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Status check failed");
    } finally {
        statusBusyId.value = null;
    }
}

const toast = ref<{ status: "success" | "error"; title: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function showToast(status: "success" | "error", title: string): void {
    toast.value = { status, title };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = null), 2800);
}

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

async function openTransfer(bot: AdminBot): Promise<void> {
    transferBotTarget.value = bot;
    targetUserId.value = "";
    query.value = "";
    if (users.value.length === 0) {
        try {
            users.value = await adminStore.fetchUsers();
        } catch { /* leave empty; the select will just be empty */ }
    }
}

function closeTransfer(): void {
    transferBotTarget.value = null;
    targetUserId.value = "";
}

async function confirmTransfer(): Promise<void> {
    const bot = transferBotTarget.value;
    if (!bot || !targetUserId.value) return;
    isTransferring.value = true;
    try {
        const updated = await adminStore.transferBot(bot.id, targetUserId.value);
        bots.value = bots.value.map((b) => (b.id === updated.id ? updated : b));
        showToast("success", "Bot transferred");
        closeTransfer();
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Transfer failed");
    } finally {
        isTransferring.value = false;
    }
}

async function runRuntimeAction(bot: AdminBot, action: "start" | "stop" | "restart"): Promise<void> {
    runtimeBusyId.value = bot.id;
    try {
        await adminStore.botRuntimeAction(bot.id, action);
        showToast("success", `${bot.name}: ${action} sent`);
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : `${action} failed`);
    } finally {
        runtimeBusyId.value = null;
    }
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
                        <td :class="$style.td">
                            <span :class="$style.botCell">
                                <img
                                    v-if="bot.discordAvatarUrl"
                                    :class="$style.avatar"
                                    :src="bot.discordAvatarUrl"
                                    :alt="`${bot.name} avatar`"
                                    loading="lazy"
                                >
                                <span v-else :class="$style.avatarFallback" aria-hidden="true">{{ bot.name.slice(0, 1).toUpperCase() }}</span>
                                <span>{{ bot.name }}</span>
                            </span>
                        </td>
                        <td :class="$style.td">{{ bot.ownerName ?? bot.ownerEmail ?? bot.ownerId.slice(0, 8) }}</td>
                        <td :class="$style.td">
                            <span :class="$style.statusCell">
                                <template v-if="liveStatus[bot.id]">
                                    <span :class="[$style.badge, $style[`badge--${stateTone(liveStatus[bot.id]?.state ?? '')}`]]">
                                        {{ liveStatus[bot.id]?.state }}
                                    </span>
                                    <span v-if="liveStatus[bot.id]?.state === 'online'" :class="$style.statusMeta">
                                        ↑ {{ formatUptime(liveStatus[bot.id]?.uptime ?? null) }} · ⟳ {{ liveStatus[bot.id]?.restarts ?? 0 }}
                                    </span>
                                </template>
                                <span v-else :class="$style.statusMeta">{{ bot.status }}</span>
                                <SecondaryButton
                                    type="button"
                                    width-mode="hug"
                                    :disabled="statusBusyId === bot.id"
                                    title="Refresh live status"
                                    @click="refreshStatus(bot)"
                                >{{ statusBusyId === bot.id ? "…" : "↻" }}</SecondaryButton>
                            </span>
                        </td>
                        <td :class="$style.td">{{ bot.discordApplicationId ?? "—" }}</td>
                        <td :class="$style.td">{{ bot.tokenConfigured ? "✓" : "—" }}</td>
                        <td :class="$style.td">{{ formatDate(bot.createdAt) }}</td>
                        <td :class="$style.td">
                            <span :class="$style.rowActions">
                                <SecondaryButton type="button" width-mode="hug" :disabled="runtimeBusyId === bot.id" @click="runRuntimeAction(bot, 'start')">Start</SecondaryButton>
                                <SecondaryButton type="button" width-mode="hug" :disabled="runtimeBusyId === bot.id" @click="runRuntimeAction(bot, 'stop')">Stop</SecondaryButton>
                                <SecondaryButton type="button" width-mode="hug" :disabled="runtimeBusyId === bot.id" @click="runRuntimeAction(bot, 'restart')">Restart</SecondaryButton>
                                <SecondaryButton type="button" width-mode="hug" @click="openConfig(bot)">Config</SecondaryButton>
                                <SecondaryButton type="button" width-mode="hug" @click="openTransfer(bot)">Transfer</SecondaryButton>
                            </span>
                        </td>
                    </tr>
                    <tr v-if="!isLoading && bots.length === 0"><td :class="$style.empty" colspan="7">No bots.</td></tr>
                    <tr v-if="isLoading"><td :class="$style.empty" colspan="7">Loading…</td></tr>
                </tbody>
            </table>
        </div>

        <!-- Transfer dialog -->
        <div v-if="transferBotTarget" :class="$style.backdrop" @click.self="closeTransfer">
            <div :class="$style.dialog" role="dialog" aria-modal="true" aria-label="Transfer bot" tabindex="-1" @keydown.esc.stop="closeTransfer">
                <h2 :class="$style.dialogTitle">Transfer "{{ transferBotTarget.name }}"</h2>
                <p :class="$style.dialogHint">
                    Moves the bot + its subscriptions &amp; config to the new owner. Wallet is not moved.
                </p>
                <label :class="$style.label">New owner</label>
                <SearchField
                    :model-value="query"
                    aria-label="Search users"
                    placeholder="ค้นหาผู้ใช้ (ชื่อ / อีเมล / id)"
                    @update:model-value="query = $event"
                />
                <div :class="$style.results">
                    <button
                        v-for="u in filteredUsers"
                        :key="u.id"
                        type="button"
                        :class="[$style.result, targetUserId === u.id ? $style.resultSelected : '']"
                        @click="targetUserId = u.id"
                    >
                        <span :class="$style.resultName">{{ u.displayName || u.username || u.email || u.id.slice(0, 8) }}</span>
                        <span :class="$style.resultId">{{ u.email ?? u.id.slice(0, 8) }}</span>
                    </button>
                    <p v-if="filteredUsers.length === 0" :class="$style.resultEmpty">ไม่พบผู้ใช้</p>
                </div>
                <div :class="$style.dialogActions">
                    <SecondaryButton type="button" width-mode="hug" @click="closeTransfer">Cancel</SecondaryButton>
                    <SecondaryButton type="button" width-mode="hug" :disabled="!targetUserId || isTransferring" @click="confirmTransfer">
                        {{ isTransferring ? "Transferring…" : "Transfer" }}
                    </SecondaryButton>
                </div>
            </div>
        </div>

        <StatusToast v-if="toast" :status="toast.status" :title="toast.title" />
    </AdminLayout>
</template>

<style module>
.panel {
    box-sizing: border-box;
    overflow-x: auto;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-text, var(--color-text-primary));
}

.table { width: 100%; border-collapse: collapse; font-size: 14px; }

.th {
    padding: 14px 16px;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
    white-space: nowrap;
}

.td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
    white-space: nowrap;
}

.rowActions { display: inline-flex; flex-wrap: wrap; gap: var(--spacing-space-2); }

.botCell { display: inline-flex; align-items: center; gap: 10px; }

.avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
}

.avatarFallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--color-input-bg);
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
}

.statusCell { display: inline-flex; align-items: center; gap: 8px; }

.badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: var(--radius-pill, 999px);
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
}
.badge--ok { background-color: color-mix(in srgb, var(--color-status-success) 14%, transparent); color: var(--color-status-success); }
.badge--error { background-color: color-mix(in srgb, var(--color-status-error) 14%, transparent); color: var(--color-status-error); }
.badge--muted { background-color: var(--color-input-bg); color: var(--color-text-secondary); }

.statusMeta { font-size: 12px; color: var(--color-text-secondary); }

.empty { padding: 20px 16px; color: var(--color-text-secondary); }
.error { margin: 0; color: var(--color-text-secondary); }

.backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: color-mix(in srgb, var(--color-text-primary) 45%, transparent);
    padding: 16px;
}

.dialog {
    box-sizing: border-box;
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 22px;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-text, var(--color-text-primary));
}

.dialogTitle { margin: 0; font-size: 17px; font-weight: 600; }
.dialogHint { margin: 0; font-size: 13px; color: var(--color-text-secondary); }
.label { font-size: 13px; color: var(--color-text-secondary); margin-top: 6px; }

.input {
    box-sizing: border-box;
    width: 100%;
    padding: 9px 12px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-input-bg);
    color: var(--color-text-primary);
    font: inherit;
}
.input:focus-visible { outline: none; border-color: var(--color-input-border-focus); }

.results {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 220px;
    overflow-y: auto;
    margin-top: 4px;
}

.result {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    box-sizing: border-box;
    padding: 8px 12px;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    cursor: pointer;
    transition: border-color 140ms ease, background-color 140ms ease;
}
.result:hover { border-color: var(--color-text-secondary); }
.resultSelected { border-color: var(--color-text-primary); background-color: var(--shop-row-hover); }
.resultName { font-size: 14px; font-weight: 500; }
.resultId { font-size: 12px; color: var(--color-text-secondary); }
.resultEmpty { margin: 6px 0; font-size: 13px; color: var(--color-text-secondary); }

.dialogActions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
</style>
