<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useAdminStore } from "@/features/admin/stores";
import {
    bahtToSatang,
    satangToBaht,
    type AdminWallet,
    type AdminWalletTransaction,
} from "@/features/admin/config";
import { SelectField, StatusToast, type SelectFieldOption } from "@/shared/ui";
import { PrimaryButton } from "@/shared/ui/buttons";
import { TablePagination } from "@/shared/ui/paginations";

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
const directionOptions: SelectFieldOption[] = [
    { label: "Add (+)", value: "CREDIT" },
    { label: "Subtract (-)", value: "DEBIT" },
];
const amountBaht = ref<number | null>(null);
const note = ref("");
const isSubmitting = ref(false);

const toast = ref<{ status: "success" | "error"; title: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

// Paginate the ledger so long histories stay scannable (pattern: shop FeatureTable).
const PAGE_SIZE = 10;
const currentPage = ref(1);
const pageCount = computed(() => Math.max(1, Math.ceil(transactions.value.length / PAGE_SIZE)));
const paginatedTransactions = computed(() => {
    const safePage = Math.min(currentPage.value, pageCount.value);
    const start = (safePage - 1) * PAGE_SIZE;
    return transactions.value.slice(start, start + PAGE_SIZE);
});

watch(pageCount, (count) => {
    if (currentPage.value > count) currentPage.value = count;
});

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
        currentPage.value = 1;
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
        currentPage.value = 1;
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
            <SelectField v-model="direction" :class="$style.directionSelect" hide-label label="Direction" :options="directionOptions" />
            <input v-model.number="amountBaht" :class="$style.input" type="number" min="0" step="0.01" placeholder="Amount ฿" aria-label="Amount in baht">
            <input v-model="note" :class="[$style.input, $style.note]" type="text" placeholder="Note (reason)" aria-label="Note">
            <PrimaryButton type="submit" width-mode="hug" :disabled="!canSubmit">
                {{ isSubmitting ? "…" : "Apply" }}
            </PrimaryButton>
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
                    <tr v-for="tx in paginatedTransactions" :key="tx.id">
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

        <footer v-if="pageCount > 1" :class="$style.tableFoot">
            <TablePagination v-model="currentPage" :page-count="pageCount" />
        </footer>

        <StatusToast v-if="toast" :status="toast.status" :title="toast.title" />
    </section>
</template>

<style module>
.wrap { display: flex; flex-direction: column; gap: var(--spacing-space-3); }
.heading { margin: 0; font-size: var(--type-size-h3-card-title); font-weight: 600; color: var(--color-text-primary); }

.balanceCard {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-1);
    box-sizing: border-box;
    width: fit-content;
    min-width: var(--spacing-space-48);
    padding: var(--spacing-space-4) var(--spacing-space-5);
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-text, var(--color-text-primary));
}

.balanceLabel { font-size: var(--type-size-input-label); color: var(--color-text-secondary); }
.balanceValue { font-size: var(--type-size-h3-card-title); font-weight: 600; }

.adjustForm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-space-3);
}

.input {
    box-sizing: border-box;
    min-height: var(--spacing-space-10);
    padding: 0 var(--spacing-space-3);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
}

.note { flex: 1; min-width: 180px; }
.directionSelect { width: 180px; }
.input:focus-visible { outline: none; border-color: var(--color-input-border-focus); }

.panel {
    box-sizing: border-box;
    overflow-x: auto;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-text, var(--color-text-primary));
}

.table { width: 100%; border-collapse: collapse; font-size: var(--type-size-caption); }

.th {
    padding: var(--spacing-space-3);
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
    white-space: nowrap;
}

.td {
    padding: var(--spacing-space-2) var(--spacing-space-3);
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
    white-space: nowrap;
}

.credit { color: var(--color-status-success); font-weight: 700; text-align: center; }
.debit { color: var(--color-status-error); font-weight: 700; text-align: center; }

.empty { padding: 16px 12px; color: var(--color-text-secondary); }
.error { margin: 0; color: var(--color-status-error); }

.tableFoot {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-space-3);
}

.pageButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    border: 1px solid var(--color-main-secondary);
    border-radius: var(--radius-full);
    background-color: var(--color-main-secondary);
    color: var(--color-button-secondary-btn-text);
    font: inherit;
    cursor: pointer;
}

.currentPage {
    border-color: var(--color-main-primary);
    background-color: var(--color-main-primary);
}

.pageButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}
</style>
