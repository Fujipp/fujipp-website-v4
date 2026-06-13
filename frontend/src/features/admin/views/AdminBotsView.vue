<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import type { AdminBot, AdminUser } from "@/features/admin/config";
import { StatusToast } from "@/shared/ui";

const router = useRouter();
const adminStore = useAdminStore();

const bots = ref<AdminBot[]>([]);
const isLoading = ref(false);
const loadError = ref("");

// Transfer dialog state
const transferBotTarget = ref<AdminBot | null>(null);
const users = ref<AdminUser[]>([]);
const targetUserId = ref("");
const isTransferring = ref(false);

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

function userLabel(u: AdminUser): string {
    return `${u.displayName || u.username || u.email || u.id.slice(0, 8)} · ${u.id.slice(0, 8)}`;
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
                            <span :class="$style.rowActions">
                                <button type="button" :class="$style.ghostBtn" @click="openConfig(bot)">Config</button>
                                <button type="button" :class="$style.ghostBtn" @click="openTransfer(bot)">Transfer</button>
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
            <div :class="$style.dialog" role="dialog" aria-label="Transfer bot">
                <h2 :class="$style.dialogTitle">Transfer "{{ transferBotTarget.name }}"</h2>
                <p :class="$style.dialogHint">
                    Moves the bot + its subscriptions &amp; config to the new owner. Wallet is not moved.
                </p>
                <label :class="$style.label">New owner</label>
                <select v-model="targetUserId" :class="$style.input">
                    <option value="" disabled>เลือกผู้ใช้…</option>
                    <option v-for="u in users" :key="u.id" :value="u.id" :disabled="u.id === transferBotTarget.ownerId">
                        {{ userLabel(u) }}{{ u.id === transferBotTarget.ownerId ? " (current owner)" : "" }}
                    </option>
                </select>
                <div :class="$style.dialogActions">
                    <button type="button" :class="$style.ghostBtn" @click="closeTransfer">Cancel</button>
                    <button type="button" :class="$style.primaryBtn" :disabled="!targetUserId || isTransferring" @click="confirmTransfer">
                        {{ isTransferring ? "Transferring…" : "Transfer" }}
                    </button>
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

.rowActions { display: inline-flex; gap: 8px; }

.ghostBtn {
    padding: 6px 14px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    cursor: pointer;
    transition: background-color 140ms ease;
}
.ghostBtn:hover { background-color: var(--color-table-row-hover); }

.primaryBtn {
    padding: 6px 16px;
    border: 0;
    border-radius: var(--radius-md);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
}
.primaryBtn:disabled { cursor: not-allowed; opacity: 0.6; }

.empty { padding: 20px 16px; color: var(--color-text-disabled); }
.error { margin: 0; color: var(--color-status-error); }

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
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.dialogTitle { margin: 0; font-size: 17px; font-weight: 600; }
.dialogHint { margin: 0; font-size: 13px; color: var(--color-text-disabled); }
.label { font-size: 13px; color: var(--color-text-disabled); margin-top: 6px; }

.input {
    box-sizing: border-box;
    width: 100%;
    padding: 9px 12px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
}
.input:focus-visible { outline: none; border-color: var(--color-input-border-focus); }

.dialogActions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
</style>
