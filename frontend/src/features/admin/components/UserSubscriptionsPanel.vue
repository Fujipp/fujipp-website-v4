<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAdminStore } from "@/features/admin/stores";
import {
    bahtToSatang,
    satangToBaht,
    SUBSCRIPTION_STATUSES,
    type AdminFeatureSubscription,
    type AdminRuntimeSubscription,
    type UpdateFeatureSubscriptionPayload,
    type UpdateRuntimeSubscriptionPayload,
} from "@/features/admin/config";
import { StatusToast } from "@/shared/ui";

interface Props {
    userId: string;
}

const props = defineProps<Props>();
const adminStore = useAdminStore();

interface Draft {
    renewBaht: number | null;
    periodEnd: string;
    status: string;
    autoRenew: boolean;
}

// Pair each subscription with its editable draft so the template iterates defined
// objects (no Record index access — keeps noUncheckedIndexedAccess happy).
// `extend` is the per-row "extend by" choice (months 1–5, or permanent).
interface RuntimeRow { sub: AdminRuntimeSubscription; draft: Draft; extend: string }
interface FeatureRow { sub: AdminFeatureSubscription; draft: Draft }

// Quick-extend options for runtime. "permanent" maps to a far-future period end —
// runtime current_period_end is NOT NULL, so permanent is expressed as a date far
// enough out that it never lapses.
const MONTH_OPTIONS = [1, 2, 3, 4, 5] as const;
const PERMANENT_PERIOD_END = "2099-12-31";

function toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// Fill the period-end draft from the extend choice. Months extend from the later of
// the current period end and today, so extending never shortens an active period.
function applyExtend(row: RuntimeRow): void {
    if (row.extend === "permanent") {
        row.draft.periodEnd = PERMANENT_PERIOD_END;
        return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let base = today;
    if (row.draft.periodEnd) {
        const [year, month, day] = row.draft.periodEnd.split("-").map(Number);
        const parsed = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
        if (parsed.getTime() > today.getTime()) base = parsed;
    }
    base.setMonth(base.getMonth() + Number(row.extend));
    row.draft.periodEnd = toIsoDate(base);
}

const runtimeRows = ref<RuntimeRow[]>([]);
const featureRows = ref<FeatureRow[]>([]);

const isLoading = ref(false);
const loadError = ref("");
const savingId = ref<string | null>(null);
const toast = ref<{ status: "success" | "error"; title: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function showToast(status: "success" | "error", title: string): void {
    toast.value = { status, title };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = null), 2600);
}

function toDraft(sub: {
    status: string;
    autoRenew: boolean;
    renewPriceSatang: number | null;
    currentPeriodEnd: string | null;
}): Draft {
    return {
        renewBaht: satangToBaht(sub.renewPriceSatang),
        periodEnd: sub.currentPeriodEnd ?? "",
        status: sub.status,
        autoRenew: sub.autoRenew,
    };
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        const data = await adminStore.fetchUserSubscriptions(props.userId);
        runtimeRows.value = data.runtime.map((sub) => ({ sub, draft: toDraft(sub), extend: "1" }));
        featureRows.value = data.features.map((sub) => ({ sub, draft: toDraft(sub) }));
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load subscriptions";
    } finally {
        isLoading.value = false;
    }
}

/** Shared renew-price + status + auto-renew diff. */
function buildPayload(
    draft: Draft,
    original: { status: string; autoRenew: boolean; renewPriceSatang: number | null; currentPeriodEnd: string | null },
): UpdateRuntimeSubscriptionPayload & UpdateFeatureSubscriptionPayload {
    const payload: UpdateRuntimeSubscriptionPayload & UpdateFeatureSubscriptionPayload = {};
    const renewSatang = bahtToSatang(draft.renewBaht);
    if (renewSatang === null && original.renewPriceSatang !== null) {
        payload.clearRenewPrice = true;
    } else if (renewSatang !== null && renewSatang !== original.renewPriceSatang) {
        payload.renewPriceSatang = renewSatang;
    }
    if (draft.periodEnd !== "" && draft.periodEnd !== (original.currentPeriodEnd ?? "")) {
        payload.currentPeriodEnd = draft.periodEnd;
    }
    if (draft.status !== original.status) payload.status = draft.status;
    if (draft.autoRenew !== original.autoRenew) payload.autoRenew = draft.autoRenew;
    return payload;
}

async function saveRuntime(row: RuntimeRow): Promise<void> {
    const payload = buildPayload(row.draft, row.sub);
    await save(row.sub.id, async () => {
        const updated = await adminStore.updateRuntimeSubscription(row.sub.id, payload);
        row.sub = updated;
        row.draft = toDraft(updated);
    });
}

async function saveFeature(row: FeatureRow): Promise<void> {
    const payload = buildPayload(row.draft, row.sub);
    await save(row.sub.id, async () => {
        const updated = await adminStore.updateFeatureSubscription(row.sub.id, payload);
        row.sub = updated;
        row.draft = toDraft(updated);
    });
}

async function save(id: string, run: () => Promise<void>): Promise<void> {
    savingId.value = id;
    try {
        await run();
        showToast("success", "Saved");
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Save failed");
    } finally {
        savingId.value = null;
    }
}

onMounted(load);
</script>

<template>
    <section :class="$style.wrap" aria-label="Subscriptions">
        <h2 :class="$style.heading">Subscriptions</h2>
        <p v-if="loadError" :class="$style.error" role="alert">{{ loadError }}</p>
        <p v-if="isLoading" :class="$style.note">Loading…</p>

        <template v-if="!isLoading">
            <h3 :class="$style.subheading">Runtime</h3>
            <div :class="$style.panel">
                <table :class="$style.table">
                    <thead>
                        <tr>
                            <th :class="$style.th">Subject (bot)</th>
                            <th :class="$style.th">Period end</th>
                            <th :class="$style.th">Extend</th>
                            <th :class="$style.th">Renew ฿</th>
                            <th :class="$style.th">Status</th>
                            <th :class="$style.th">Auto</th>
                            <th :class="$style.th" />
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in runtimeRows" :key="row.sub.id">
                            <td :class="$style.td">{{ row.sub.externalSubjectId }}</td>
                            <td :class="$style.td"><input v-model="row.draft.periodEnd" :class="$style.input" type="date"></td>
                            <td :class="$style.td">
                                <div :class="$style.extendCell">
                                    <select v-model="row.extend" :class="[$style.input, $style.extendSelect]" aria-label="Extend by">
                                        <option v-for="m in MONTH_OPTIONS" :key="m" :value="String(m)">+{{ m }} เดือน</option>
                                        <option value="permanent">ถาวร</option>
                                    </select>
                                    <button type="button" :class="$style.extendBtn" @click="applyExtend(row)">ตั้ง</button>
                                </div>
                            </td>
                            <td :class="$style.td"><input v-model.number="row.draft.renewBaht" :class="$style.input" type="number" min="0" step="0.01" placeholder="—"></td>
                            <td :class="$style.td">
                                <select v-model="row.draft.status" :class="$style.input">
                                    <option v-for="s in SUBSCRIPTION_STATUSES" :key="s" :value="s">{{ s }}</option>
                                </select>
                            </td>
                            <td :class="[$style.td, $style.center]"><input v-model="row.draft.autoRenew" type="checkbox"></td>
                            <td :class="$style.td">
                                <button type="button" :class="$style.saveBtn" :disabled="savingId === row.sub.id" @click="saveRuntime(row)">
                                    {{ savingId === row.sub.id ? "…" : "Save" }}
                                </button>
                            </td>
                        </tr>
                        <tr v-if="runtimeRows.length === 0"><td :class="$style.empty" colspan="7">No runtime subscriptions.</td></tr>
                    </tbody>
                </table>
            </div>

            <h3 :class="$style.subheading">Features</h3>
            <div :class="$style.panel">
                <table :class="$style.table">
                    <thead>
                        <tr>
                            <th :class="$style.th">Subject</th>
                            <th :class="$style.th">Billing</th>
                            <th :class="$style.th">Period end</th>
                            <th :class="$style.th">Renew ฿</th>
                            <th :class="$style.th">Status</th>
                            <th :class="$style.th">Auto</th>
                            <th :class="$style.th" />
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in featureRows" :key="row.sub.id">
                            <td :class="$style.td">{{ row.sub.externalSubjectId ?? row.sub.scope }}</td>
                            <td :class="$style.td">{{ row.sub.billingType }}</td>
                            <td :class="$style.td"><input v-model="row.draft.periodEnd" :class="$style.input" type="date"></td>
                            <td :class="$style.td"><input v-model.number="row.draft.renewBaht" :class="$style.input" type="number" min="0" step="0.01" placeholder="—"></td>
                            <td :class="$style.td">
                                <select v-model="row.draft.status" :class="$style.input">
                                    <option v-for="s in SUBSCRIPTION_STATUSES" :key="s" :value="s">{{ s }}</option>
                                </select>
                            </td>
                            <td :class="[$style.td, $style.center]"><input v-model="row.draft.autoRenew" type="checkbox"></td>
                            <td :class="$style.td">
                                <button type="button" :class="$style.saveBtn" :disabled="savingId === row.sub.id" @click="saveFeature(row)">
                                    {{ savingId === row.sub.id ? "…" : "Save" }}
                                </button>
                            </td>
                        </tr>
                        <tr v-if="featureRows.length === 0"><td :class="$style.empty" colspan="7">No feature subscriptions.</td></tr>
                    </tbody>
                </table>
            </div>
        </template>

        <StatusToast v-if="toast" :status="toast.status" :title="toast.title" />
    </section>
</template>

<style module>
.wrap { display: flex; flex-direction: column; gap: 12px; }
.heading { margin: 0; font-size: 18px; font-weight: 600; color: var(--color-text-primary); }
.subheading { margin: 4px 0 0; font-size: 14px; font-weight: 600; color: var(--color-text-primary); }

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

.center { text-align: center; }

.input {
    box-sizing: border-box;
    width: 110px;
    padding: 6px 8px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
}

.input:focus-visible { outline: none; border-color: var(--color-input-border-focus); }

.extendCell { display: flex; align-items: center; gap: 6px; }
.extendSelect { width: 120px; }

.extendBtn {
    padding: 6px 10px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-md);
    background-color: var(--color-main-secondary);
    color: var(--color-button-secondary-btn-text);
    font: inherit;
    cursor: pointer;
    white-space: nowrap;
}

.extendBtn:hover { border-color: var(--color-input-border-focus); }

.saveBtn {
    padding: 6px 14px;
    border: 0;
    border-radius: var(--radius-md);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 140ms ease;
}

.saveBtn:hover { background-color: var(--color-button-primary-btn-hover); }
.saveBtn:disabled { cursor: not-allowed; opacity: 0.6; }

.empty { padding: 16px 12px; color: var(--color-text-disabled); }
.note { margin: 0; color: var(--color-text-disabled); }
.error { margin: 0; color: var(--color-status-error); }
</style>
