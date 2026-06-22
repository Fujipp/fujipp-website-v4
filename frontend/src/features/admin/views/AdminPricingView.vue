<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import {
    bahtToSatang,
    satangToBaht,
    FEATURE_PRICE_KINDS,
    type AdminFeature,
    type AdminFeaturePrice,
    type AdminRuntimePlan,
    type CreateFeaturePricePayload,
    type UpdateFeaturePricePayload,
    type UpdateRuntimePlanPayload,
} from "@/features/admin/config";
import { SelectField, StatusToast, type SelectFieldOption } from "@/shared/ui";

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

// Each row pairs the saved record with its editable draft, so the template iterates
// defined objects (no Record index access — keeps noUncheckedIndexedAccess happy).
interface PlanRow { plan: AdminRuntimePlan; draft: RuntimeDraft }
interface PriceRow { price: AdminFeaturePrice; draft: FeatureDraft }

interface AddPriceDraft {
    featureId: string;
    kind: string;
    priceBaht: number | null;
    durationMonths: number | null;
    active: boolean;
}

function emptyAddDraft(): AddPriceDraft {
    return { featureId: "", kind: "RENT_PERMANENT", priceBaht: null, durationMonths: null, active: true };
}

const planRows = ref<PlanRow[]>([]);
const priceRows = ref<PriceRow[]>([]);
const features = ref<AdminFeature[]>([]);
const addDraft = ref<AddPriceDraft>(emptyAddDraft());
const addSaving = ref(false);
const featureOptions = computed<SelectFieldOption[]>(() => [
    { label: "เลือก feature…", value: "" },
    ...features.value.map((feature) => ({
        label: `${feature.name} (${feature.code})${feature.prices.length ? ` — มี ${feature.prices.length} ราคา` : ""}`,
        value: feature.id,
    })),
]);
const kindOptions: SelectFieldOption[] = FEATURE_PRICE_KINDS.map((kind) => ({ label: kind, value: kind }));

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
        const [plans, prices, catalog] = await Promise.all([
            adminStore.fetchRuntimePlans(),
            adminStore.fetchFeaturePrices(),
            adminStore.fetchFeatures(),
        ]);
        planRows.value = plans.map((plan) => ({ plan, draft: toRuntimeDraft(plan) }));
        priceRows.value = prices.map((price) => ({ price, draft: toFeatureDraft(price) }));
        features.value = catalog;
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

async function savePlan(row: PlanRow): Promise<void> {
    const { plan, draft } = row;
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
        row.plan = updated;
        row.draft = toRuntimeDraft(updated);
    });
}

async function savePrice(row: PriceRow): Promise<void> {
    const { price, draft } = row;
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
        row.price = updated;
        row.draft = toFeatureDraft(updated);
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

async function addPrice(): Promise<void> {
    const priceSatang = bahtToSatang(addDraft.value.priceBaht);
    if (!addDraft.value.featureId) {
        showToast("error", "เลือก feature ก่อน");
        return;
    }
    if (priceSatang === null) {
        showToast("error", "ใส่ราคาก่อน");
        return;
    }
    const payload: CreateFeaturePricePayload = {
        featureId: addDraft.value.featureId,
        kind: addDraft.value.kind,
        priceSatang,
        active: addDraft.value.active,
    };
    // Only monthly rents carry a duration; permanent / source-code are open-ended.
    if (addDraft.value.kind === "RENT_MONTHLY") {
        payload.durationMonths = addDraft.value.durationMonths ?? 1;
    }

    addSaving.value = true;
    try {
        await adminStore.createFeaturePrice(payload);
        showToast("success", "Added");
        addDraft.value = emptyAddDraft();
        await load();
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Add failed");
    } finally {
        addSaving.value = false;
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
                        <tr v-for="row in planRows" :key="row.plan.id">
                            <td :class="$style.td">{{ row.plan.code }}</td>
                            <td :class="$style.td"><input v-model="row.draft.name" :class="[$style.input, $style.text]" type="text"></td>
                            <td :class="$style.td"><input v-model.number="row.draft.durationMonths" :class="$style.input" type="number" min="1"></td>
                            <td :class="$style.td"><input v-model.number="row.draft.priceBaht" :class="$style.input" type="number" min="0" step="0.01"></td>
                            <td :class="$style.td"><input v-model.number="row.draft.promoBaht" :class="$style.input" type="number" min="0" step="0.01" placeholder="—"></td>
                            <td :class="$style.td"><input v-model="row.draft.promoLabel" :class="[$style.input, $style.text]" type="text" placeholder="—"></td>
                            <td :class="[$style.td, $style.center]"><input v-model="row.draft.featured" type="checkbox"></td>
                            <td :class="$style.td"><input v-model.number="row.draft.sortOrder" :class="$style.input" type="number"></td>
                            <td :class="[$style.td, $style.center]"><input v-model="row.draft.active" type="checkbox"></td>
                            <td :class="$style.td">
                                <button type="button" :class="$style.saveBtn" :disabled="savingId === row.plan.id" @click="savePlan(row)">
                                    {{ savingId === row.plan.id ? "…" : "Save" }}
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
                        <tr v-for="row in priceRows" :key="row.price.id">
                            <td :class="$style.td">{{ row.price.featureName ?? row.price.featureCode ?? "—" }}</td>
                            <td :class="$style.td">{{ row.price.kind }}</td>
                            <td :class="$style.td"><input v-model.number="row.draft.priceBaht" :class="$style.input" type="number" min="0" step="0.01"></td>
                            <td :class="$style.td"><input v-model.number="row.draft.durationMonths" :class="$style.input" type="number" min="1" placeholder="—"></td>
                            <td :class="$style.td"><input v-model.number="row.draft.promoBaht" :class="$style.input" type="number" min="0" step="0.01" placeholder="—"></td>
                            <td :class="$style.td"><input v-model="row.draft.promoLabel" :class="[$style.input, $style.text]" type="text" placeholder="—"></td>
                            <td :class="[$style.td, $style.center]"><input v-model="row.draft.active" type="checkbox"></td>
                            <td :class="$style.td">
                                <button type="button" :class="$style.saveBtn" :disabled="savingId === row.price.id" @click="savePrice(row)">
                                    {{ savingId === row.price.id ? "…" : "Save" }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Add a price for a feature that has none yet -->
        <section :class="$style.section" aria-label="Add feature price">
            <h2 :class="$style.heading">Add feature price</h2>
            <div :class="$style.panel">
                <div :class="$style.addForm">
                    <SelectField v-model="addDraft.featureId" :class="$style.featureSelect" label="Feature" :options="featureOptions" />
                    <SelectField v-model="addDraft.kind" :class="$style.kindSelect" label="Kind" :options="kindOptions" />
                    <input v-model.number="addDraft.priceBaht" :class="$style.input" type="number" min="0" step="0.01" placeholder="ราคา ฿" aria-label="Price">
                    <input v-if="addDraft.kind === 'RENT_MONTHLY'" v-model.number="addDraft.durationMonths" :class="$style.input" type="number" min="1" placeholder="เดือน" aria-label="Months">
                    <label :class="$style.activeLabel"><input v-model="addDraft.active" type="checkbox"> Active</label>
                    <button type="button" :class="$style.saveBtn" :disabled="addSaving" @click="addPrice">
                        {{ addSaving ? "…" : "Add" }}
                    </button>
                </div>
                <p :class="$style.note">เลือก feature ที่ยังไม่มีราคา แล้วตั้งราคา (เช่น review-credit). ตั้ง kind ซ้ำของ feature เดิมไม่ได้ — แก้ราคาเดิมในตารางด้านบนแทน</p>
            </div>
        </section>

        <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
            <StatusToast :status="toast.status" :title="toast.title" @close="toast = null" />
        </div>
    </AdminLayout>
</template>

<style module>
.section { display: flex; flex-direction: column; gap: 12px; }
.heading { margin: 0; font-size: 18px; font-weight: 600; color: var(--color-text-primary); }

.panel {
    box-sizing: border-box;
    overflow-x: auto;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
}

.table { width: 100%; border-collapse: collapse; font-size: 13px; }

.th {
    padding: 12px 12px;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-disabled);
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
    white-space: nowrap;
}

.td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
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

.addForm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 14px 12px;
}

.featureSelect { width: min(420px, 100%); }
.kindSelect { width: min(220px, 100%); }

.activeLabel {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--shop-card-muted);
}

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

/* Float feedback so Add/Save result is always visible, not pushed below the fold. */
.toastRegion {
    position: fixed;
    bottom: var(--spacing-space-5);
    right: var(--spacing-space-5);
    z-index: 60;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
}
</style>
