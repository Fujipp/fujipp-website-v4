<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import {
    bahtToSatang,
    satangToBaht,
    type AdminFeaturePrice,
    type AdminRuntimePlan,
    type UpdateFeaturePricePayload,
    type UpdateRuntimePlanPayload,
} from "@/features/admin/config";
import { StatusToast } from "@/shared/ui";

const adminStore = useAdminStore();

interface RuntimeDraft {
    name: string;
    durationMonths: number;
    priceBaht: number;
    promoBaht: number | null;
    promoLabel: string;
    featured: boolean;
    sortOrder: number;
    active: boolean;
}

interface FeatureDraft {
    priceBaht: number;
    durationMonths: number | null;
    promoBaht: number | null;
    promoLabel: string;
    active: boolean;
}

const plans = ref<AdminRuntimePlan[]>([]);
const prices = ref<AdminFeaturePrice[]>([]);
const planDrafts = reactive<Record<string, RuntimeDraft>>({});
const priceDrafts = reactive<Record<string, FeatureDraft>>({});

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

function toRuntimeDraft(plan: AdminRuntimePlan): RuntimeDraft {
    return {
        name: plan.name,
        durationMonths: plan.durationMonths,
        priceBaht: satangToBaht(plan.priceSatang) ?? 0,
        promoBaht: satangToBaht(plan.promotionPriceSatang),
        promoLabel: plan.promotionLabel ?? "",
        featured: plan.featured,
        sortOrder: plan.sortOrder,
        active: plan.active,
    };
}

function toFeatureDraft(price: AdminFeaturePrice): FeatureDraft {
    return {
        priceBaht: satangToBaht(price.priceSatang) ?? 0,
        durationMonths: price.durationMonths,
        promoBaht: satangToBaht(price.promotionPriceSatang),
        promoLabel: price.promotionLabel ?? "",
        active: price.active,
    };
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        const [runtimePlans, featurePrices] = await Promise.all([
            adminStore.fetchRuntimePlans(),
            adminStore.fetchFeaturePrices(),
        ]);
        plans.value = runtimePlans;
        prices.value = featurePrices;
        for (const plan of runtimePlans) planDrafts[plan.id] = toRuntimeDraft(plan);
        for (const price of featurePrices) priceDrafts[price.id] = toFeatureDraft(price);
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load catalog";
    } finally {
        isLoading.value = false;
    }
}

/** Promo diff shared by both editors. Returns the promo fields to send, or {} if unchanged. */
function promoPayload(
    draftBaht: number | null,
    draftLabel: string,
    originalSatang: number | null,
    originalLabel: string | null,
): Pick<UpdateRuntimePlanPayload, "clearPromotion" | "promotionPriceSatang" | "promotionLabel"> {
    const draftSatang = bahtToSatang(draftBaht);
    const label = draftLabel.trim() === "" ? null : draftLabel.trim();
    if (draftSatang === null) {
        return originalSatang !== null ? { clearPromotion: true } : {};
    }
    if (draftSatang !== originalSatang || label !== originalLabel) {
        return { promotionPriceSatang: draftSatang, promotionLabel: label };
    }
    return {};
}

async function savePlan(plan: AdminRuntimePlan): Promise<void> {
    const draft = planDrafts[plan.id];
    const payload: UpdateRuntimePlanPayload = {};
    if (draft.name !== plan.name) payload.name = draft.name;
    if (draft.durationMonths !== plan.durationMonths) payload.durationMonths = draft.durationMonths;
    const priceSatang = bahtToSatang(draft.priceBaht);
    if (priceSatang !== null && priceSatang !== plan.priceSatang) payload.priceSatang = priceSatang;
    if (draft.featured !== plan.featured) payload.featured = draft.featured;
    if (draft.sortOrder !== plan.sortOrder) payload.sortOrder = draft.sortOrder;
    if (draft.active !== plan.active) payload.active = draft.active;
    Object.assign(payload, promoPayload(draft.promoBaht, draft.promoLabel, plan.promotionPriceSatang, plan.promotionLabel));

    await save(plan.id, async () => {
        const updated = await adminStore.updateRuntimePlan(plan.id, payload);
        plans.value = plans.value.map((p) => (p.id === updated.id ? updated : p));
        planDrafts[updated.id] = toRuntimeDraft(updated);
    });
}

async function savePrice(price: AdminFeaturePrice): Promise<void> {
    const draft = priceDrafts[price.id];
    const payload: UpdateFeaturePricePayload = {};
    const priceSatang = bahtToSatang(draft.priceBaht);
    if (priceSatang !== null && priceSatang !== price.priceSatang) payload.priceSatang = priceSatang;
    if (draft.durationMonths !== price.durationMonths && draft.durationMonths !== null) {
        payload.durationMonths = draft.durationMonths;
    }
    if (draft.active !== price.active) payload.active = draft.active;
    Object.assign(payload, promoPayload(draft.promoBaht, draft.promoLabel, price.promotionPriceSatang, price.promotionLabel));

    await save(price.id, async () => {
        const updated = await adminStore.updateFeaturePrice(price.id, payload);
        prices.value = prices.value.map((p) => (p.id === updated.id ? updated : p));
        priceDrafts[updated.id] = toFeatureDraft(updated);
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
    <AdminLayout title="Pricing">
        <p v-if="loadError" :class="$style.error" role="alert">{{ loadError }}</p>
        <p v-if="isLoading" :class="$style.note">Loading…</p>

        <!-- Runtime plans -->
        <section :class="$style.section" aria-label="Runtime plans">
            <h2 :class="$style.heading">Runtime plans</h2>
            <div :class="$style.panel">
                <table :class="$style.table">
                    <thead>
                        <tr>
                            <th :class="$style.th">Code</th>
                            <th :class="$style.th">Name</th>
                            <th :class="$style.th">Months</th>
                            <th :class="$style.th">Price ฿</th>
                            <th :class="$style.th">Promo ฿</th>
                            <th :class="$style.th">Promo label</th>
                            <th :class="$style.th">Featured</th>
                            <th :class="$style.th">Sort</th>
                            <th :class="$style.th">Active</th>
                            <th :class="$style.th" />
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="plan in plans" :key="plan.id">
                            <td :class="$style.td">{{ plan.code }}</td>
                            <td :class="$style.td"><input v-model="planDrafts[plan.id].name" :class="[$style.input, $style.text]" type="text"></td>
                            <td :class="$style.td"><input v-model.number="planDrafts[plan.id].durationMonths" :class="$style.input" type="number" min="1"></td>
                            <td :class="$style.td"><input v-model.number="planDrafts[plan.id].priceBaht" :class="$style.input" type="number" min="0" step="0.01"></td>
                            <td :class="$style.td"><input v-model.number="planDrafts[plan.id].promoBaht" :class="$style.input" type="number" min="0" step="0.01" placeholder="—"></td>
                            <td :class="$style.td"><input v-model="planDrafts[plan.id].promoLabel" :class="[$style.input, $style.text]" type="text" placeholder="—"></td>
                            <td :class="[$style.td, $style.center]"><input v-model="planDrafts[plan.id].featured" type="checkbox"></td>
                            <td :class="$style.td"><input v-model.number="planDrafts[plan.id].sortOrder" :class="$style.input" type="number"></td>
                            <td :class="[$style.td, $style.center]"><input v-model="planDrafts[plan.id].active" type="checkbox"></td>
                            <td :class="$style.td">
                                <button type="button" :class="$style.saveBtn" :disabled="savingId === plan.id" @click="savePlan(plan)">
                                    {{ savingId === plan.id ? "…" : "Save" }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Feature prices -->
        <section :class="$style.section" aria-label="Feature prices">
            <h2 :class="$style.heading">Feature prices</h2>
            <div :class="$style.panel">
                <table :class="$style.table">
                    <thead>
                        <tr>
                            <th :class="$style.th">Feature</th>
                            <th :class="$style.th">Kind</th>
                            <th :class="$style.th">Price ฿</th>
                            <th :class="$style.th">Months</th>
                            <th :class="$style.th">Promo ฿</th>
                            <th :class="$style.th">Promo label</th>
                            <th :class="$style.th">Active</th>
                            <th :class="$style.th" />
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="price in prices" :key="price.id">
                            <td :class="$style.td">{{ price.featureName ?? price.featureCode ?? "—" }}</td>
                            <td :class="$style.td">{{ price.kind }}</td>
                            <td :class="$style.td"><input v-model.number="priceDrafts[price.id].priceBaht" :class="$style.input" type="number" min="0" step="0.01"></td>
                            <td :class="$style.td"><input v-model.number="priceDrafts[price.id].durationMonths" :class="$style.input" type="number" min="1" placeholder="—"></td>
                            <td :class="$style.td"><input v-model.number="priceDrafts[price.id].promoBaht" :class="$style.input" type="number" min="0" step="0.01" placeholder="—"></td>
                            <td :class="$style.td"><input v-model="priceDrafts[price.id].promoLabel" :class="[$style.input, $style.text]" type="text" placeholder="—"></td>
                            <td :class="[$style.td, $style.center]"><input v-model="priceDrafts[price.id].active" type="checkbox"></td>
                            <td :class="$style.td">
                                <button type="button" :class="$style.saveBtn" :disabled="savingId === price.id" @click="savePrice(price)">
                                    {{ savingId === price.id ? "…" : "Save" }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <StatusToast v-if="toast" :status="toast.status" :title="toast.title" />
    </AdminLayout>
</template>

<style module>
.section { display: flex; flex-direction: column; gap: 12px; }
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
    padding: 12px 12px;
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
    width: 84px;
    padding: 6px 8px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
}

.text { width: 130px; }

.input:focus-visible {
    outline: none;
    border-color: var(--color-input-border-focus);
}

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

.note { margin: 0; color: var(--color-text-disabled); }
.error { margin: 0; color: var(--color-status-error); }
</style>
