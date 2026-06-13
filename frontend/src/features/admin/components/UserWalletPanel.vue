<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAdminStore } from "@/features/admin/stores";
import {
    bahtToSatang,
    satangToBaht,
    type AdminWallet,
    type AdminWalletTransaction,
} from "@/features/admin/config";
import { StatusToast } from "@/shared/ui";

interface Props {
    userId: string;
}

const props = defineProps<Props>();
const adminStore = useAdminStore();

const wallet = ref<AdminWallet | null>(null);
const transactions = ref<AdminWalletTransaction[]>([]);
const isLoading = ref(false);
const loadError = ref("");

const direction = ref<"CREDIT" | "DEBIT">("CREDIT");
const amountBaht = ref<number | null>(null);
const note = ref("");
const isSubmitting = ref(false);

const toast = ref<{ status: "success" | "error"; title: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const balanceBaht = computed(() => satangToBaht(wallet.value?.balanceSatang ?? 0) ?? 0);
const canSubmit = computed(() => {
    const satang = bahtToSatang(amountBaht.value);
    return satang !== null && satang > 0 && !isSubmitting.value;
});

function showToast(status: "success" | "error", title: string): void {
    toast.value = { status, title };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = null), 2600);
}

function formatBaht(satang: number): string {
    return (satang / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        const [w, tx] = await Promise.all([
            adminStore.fetchUserWallet(props.userId),
            adminStore.fetchUserWalletTransactions(props.userId),
        ]);
        wallet.value = w;
        transactions.value = tx;
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load wallet";
    } finally {
        isLoading.value = false;
    }
}

async function submit(): Promise<void> {
    const amountSatang = bahtToSatang(amountBaht.value);
    if (amountSatang === null || amountSatang <= 0) return;
    isSubmitting.value = true;
    try {
        wallet.value = await adminStore.adjustUserWallet(props.userId, {
            direction: direction.value,
            amountSatang,
            note: note.value.trim() || undefined,
        });
        transactions.value = await adminStore.fetchUserWalletTransactions(props.userId);
        amountBaht.value = null;
        note.value = "";
        showToast("success", direction.value === "CREDIT" ? "Added credit" : "Subtracted credit");
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Adjustment failed");
    } finally {
        isSubmitting.value = false;
    }
}

onMounted(load);
</script>

<template>
    <section :class="$style.wrap" aria-label="Wallet">
        <h2 :class="$style.heading">Wallet</h2>
        <p v-if="loadError" :class="$style.error" role="alert">{{ loadError }}</p>

        <div :class="$style.balanceCard">
            <span :class="$style.balanceLabel">Balance</span>
            <span :class="$style.balanceValue">฿{{ balanceBaht.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</span>
        </div>

        <form :class="$style.adjustForm" @submit.prevent="submit">
            <select v-model="direction" :class="$style.input" aria-label="Direction">
                <option value="CREDIT">Add (+)</option>
                <option value="DEBIT">Subtract (−)</option>
            </select>
            <input v-model.number="amountBaht" :class="$style.input" type="number" min="0" step="0.01" placeholder="Amount ฿" aria-label="Amount in baht">
            <input v-model="note" :class="[$style.input, $style.note]" type="text" placeholder="Note (reason)" aria-label="Note">
            <button type="submit" :class="$style.applyBtn" :disabled="!canSubmit">
                {{ isSubmitting ? "…" : "Apply" }}
            </button>
        </form>

        <div :class="$style.panel">
            <table :class="$style.table">
                <thead>
                    <tr>
                        <th :class="$style.th">Date</th>
                        <th :class="$style.th">Type</th>
                        <th :class="$style.th">Dir</th>
                        <th :class="$style.th">Amount ฿</th>
                        <th :class="$style.th">Balance ฿</th>
                        <th :class="$style.th">Note</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="tx in transactions" :key="tx.id">
                        <td :class="$style.td">{{ formatDate(tx.createdAt) }}</td>
                        <td :class="$style.td">{{ tx.type }}</td>
                        <td :class="[$style.td, tx.direction === 'CREDIT' ? $style.credit : $style.debit]">
                            {{ tx.direction === "CREDIT" ? "+" : "−" }}
                        </td>
                        <td :class="$style.td">{{ formatBaht(tx.amountSatang) }}</td>
                        <td :class="$style.td">{{ formatBaht(tx.balanceAfterSatang) }}</td>
                        <td :class="$style.td">{{ tx.note ?? "—" }}</td>
                    </tr>
                    <tr v-if="!isLoading && transactions.length === 0">
                        <td :class="$style.empty" colspan="6">No transactions.</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <StatusToast v-if="toast" :status="toast.status" :title="toast.title" />
    </section>
</template>

<style module>
.wrap { display: flex; flex-direction: column; gap: 12px; }
.heading { margin: 0; font-size: 18px; font-weight: 600; color: var(--color-text-primary); }

.balanceCard {
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-sizing: border-box;
    width: fit-content;
    min-width: 200px;
    padding: 16px 20px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.balanceLabel { font-size: 13px; color: var(--color-text-disabled); }
.balanceValue { font-size: 26px; font-weight: 600; }

.adjustForm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
}

.input {
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
}

.note { flex: 1; min-width: 180px; }
.input:focus-visible { outline: none; border-color: var(--color-input-border-focus); }

.applyBtn {
    padding: 9px 18px;
    border: 0;
    border-radius: var(--radius-md);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 140ms ease;
}

.applyBtn:hover { background-color: var(--color-button-primary-btn-hover); }
.applyBtn:disabled { cursor: not-allowed; opacity: 0.6; }

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
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-disabled);
    border-bottom: 1px solid var(--color-main-divider);
    white-space: nowrap;
}

.td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-main-divider);
    white-space: nowrap;
}

.credit { color: var(--color-status-success); font-weight: 700; text-align: center; }
.debit { color: var(--color-status-error); font-weight: 700; text-align: center; }

.empty { padding: 16px 12px; color: var(--color-text-disabled); }
.error { margin: 0; color: var(--color-status-error); }
</style>
