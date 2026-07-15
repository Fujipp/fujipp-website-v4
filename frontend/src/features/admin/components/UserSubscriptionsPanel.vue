<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAdminStore } from "@/features/admin/stores";
import {
    bahtToSatang,
    satangToBaht,
    SUBSCRIPTION_STATUSES,
    type AdminFeatureSubscription,
    type AdminRuntimePlan,
    type AdminRuntimeSubscription,
    type AdminFeature,
    type AdminBot,
    type AdminSeat,
    type UpdateFeatureSubscriptionPayload,
    type UpdateRuntimeSubscriptionPayload,
} from "@/features/admin/config";
import { ConfirmModal, SelectField, StatusToast, type SelectFieldOption } from "@/shared/ui";
import { PrimaryButton } from "@/shared/ui/buttons";

interface Props {
    mode?: "all" | "runtime" | "features";
    userId: string;
}

const props = withDefaults(defineProps<Props>(), { mode: "all" });
const adminStore = useAdminStore();

interface Draft {
    renewBaht: number | null;
    planId: string;
    periodEnd: string;
    status: string;
    autoRenew: boolean;
}

// Pair each subscription with its editable draft so the template iterates defined
// objects (no Record index access — keeps noUncheckedIndexedAccess happy).
interface RuntimeRow { sub: AdminRuntimeSubscription; draft: Draft }
interface FeatureRow { sub: AdminFeatureSubscription; draft: Draft }

// Only recurring rentals have an expiry + renewal; RENT_PERMANENT (and one-off
// SOURCE_CODE) never lapse, so their period-end / renew / auto fields are N/A.
function isRecurring(billingType: string): boolean {
    return billingType === "RENT_MONTHLY";
}

// Runtime plans drive both the current-plan label the customer sees ("X Month") and
// the renewal term (months added per renewal). The admin picks one plan; we set the
// subscription's runtimePlanId (label) and renewPlanId (renewal) to it together.
const runtimePlans = ref<AdminRuntimePlan[]>([]);
const features = ref<AdminFeature[]>([]);
const userBots = ref<AdminBot[]>([]);
const freeSeats = ref<AdminSeat[]>([]);
const runtimePlanOptions = computed<SelectFieldOption[]>(() => [
    { label: "—", value: "" },
    ...runtimePlans.value.filter((plan) => plan.active).map((plan) => ({ label: planLabel(plan), value: plan.id })),
]);
const statusOptions: SelectFieldOption[] = SUBSCRIPTION_STATUSES.map((status) => ({ label: status, value: status }));
const botOptions = computed<SelectFieldOption[]>(() => [
    { label: "Unassigned stack", value: "" },
    ...userBots.value.map((bot) => ({ label: bot.name, value: bot.id })),
]);
const featureOptions = computed<SelectFieldOption[]>(() => features.value.map((feature) => ({
    label: feature.name, value: feature.id,
})));
const seatOptions = computed<SelectFieldOption[]>(() => freeSeats.value.map((seat) => ({
    label: `${seat.nodeName} · Slot ${seat.slotIndex}`, value: seat.slotId,
})));
const billingOptions: SelectFieldOption[] = [
    { label: "Permanent", value: "RENT_PERMANENT" },
    { label: "Monthly", value: "RENT_MONTHLY" },
];

const grantPlanId = ref("");
const grantFeatureId = ref("");
const grantBotId = ref("");
const grantSlotId = ref("");
const grantBillingType = ref<"RENT_MONTHLY" | "RENT_PERMANENT">("RENT_PERMANENT");
const pendingGrant = ref<"runtime" | "feature" | null>(null);
const pendingFeatureAction = ref<{ kind: "detach" | "remove"; row: FeatureRow } | null>(null);
const granting = ref(false);

function planLabel(plan: AdminRuntimePlan): string {
    const baht = satangToBaht(plan.priceSatang) ?? 0;
    return `${plan.durationMonths} เดือน — ${plan.name} (${baht.toLocaleString()} ฿)`;
}

const runtimeRows = ref<RuntimeRow[]>([]);
const featureRows = ref<FeatureRow[]>([]);
const unusedFeatureRows = computed(() => featureRows.value.filter((row) =>
    row.sub.status !== "CANCELED" && !row.sub.externalSubjectId,
));
const assignedFeatureRows = computed(() => featureRows.value.filter((row) =>
    row.sub.status !== "CANCELED" && Boolean(row.sub.externalSubjectId),
));

function featureLabel(featureId: string): string {
    return features.value.find((feature) => feature.id === featureId)?.name ?? featureId;
}

function botLabel(botId: string | null): string {
    if (!botId) return "Unassigned";
    return userBots.value.find((bot) => bot.id === botId)?.name ?? botId;
}

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
    runtimePlanId?: string | null;
}): Draft {
    return {
        renewBaht: satangToBaht(sub.renewPriceSatang),
        planId: sub.runtimePlanId ?? "",
        periodEnd: sub.currentPeriodEnd ?? "",
        status: sub.status,
        autoRenew: sub.autoRenew,
    };
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        const [data, plans, catalog, bots, seats] = await Promise.all([
            adminStore.fetchUserSubscriptions(props.userId),
            adminStore.fetchRuntimePlans(),
            adminStore.fetchFeatures(),
            adminStore.fetchBots(),
            adminStore.fetchRuntimeCabinet(),
        ]);
        runtimePlans.value = plans;
        features.value = catalog;
        userBots.value = bots.filter((bot) => bot.ownerId === props.userId);
        freeSeats.value = seats.filter((seat) => seat.nodeStatus === "ACTIVE" && seat.occupancy === "FREE");
        grantPlanId.value ||= plans.find((plan) => plan.active)?.id ?? "";
        grantFeatureId.value ||= catalog[0]?.id ?? "";
        if (!freeSeats.value.some((seat) => seat.slotId === grantSlotId.value)) {
            grantSlotId.value = freeSeats.value[0]?.slotId ?? "";
        }
        runtimeRows.value = data.runtime.map((sub) => ({ sub, draft: toDraft(sub) }));
        featureRows.value = data.features.map((sub) => ({ sub, draft: toDraft(sub) }));
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load subscriptions";
    } finally {
        isLoading.value = false;
    }
}

function selectedFeaturePrice(): string | null {
    const feature = features.value.find((item) => item.id === grantFeatureId.value);
    return feature?.prices.find((price) => price.kind === grantBillingType.value)?.id ?? null;
}

async function confirmGrant(): Promise<void> {
    const kind = pendingGrant.value;
    if (!kind) return;
    granting.value = true;
    try {
        if (kind === "runtime") {
            await adminStore.grantUserRuntime(props.userId, {
                subjectId: grantBotId.value || null,
                runtimePlanId: grantPlanId.value,
                vpsSlotId: grantSlotId.value,
            });
        } else {
            await adminStore.grantUserFeature(props.userId, {
                subjectId: grantBotId.value || null,
                featureId: grantFeatureId.value,
                priceId: selectedFeaturePrice(),
                billingType: grantBillingType.value,
            });
        }
        pendingGrant.value = null;
        showToast("success", kind === "runtime" ? "Runtime added" : "Feature added");
        await load();
    } catch (cause) {
        pendingGrant.value = null;
        showToast("error", cause instanceof Error ? cause.message : "Grant failed");
    } finally {
        granting.value = false;
    }
}

async function confirmFeatureAction(): Promise<void> {
    const action = pendingFeatureAction.value;
    if (!action) return;
    granting.value = true;
    try {
        if (action.kind === "detach") {
            await adminStore.detachUserFeature(action.row.sub.id);
            showToast("success", "Feature returned to unused stack");
        } else {
            await adminStore.removeUserFeature(action.row.sub.id);
            showToast("success", "Feature removed from user");
        }
        pendingFeatureAction.value = null;
        await load();
    } catch (cause) {
        pendingFeatureAction.value = null;
        showToast("error", cause instanceof Error ? cause.message : "Action failed");
    } finally {
        granting.value = false;
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
    // One "Plan" choice drives both the current-plan label (runtimePlanId) and the
    // renewal term (renewPlanId), so set them together when it changes.
    if (row.draft.planId && row.draft.planId !== (row.sub.runtimePlanId ?? "")) {
        payload.runtimePlanId = row.draft.planId;
        payload.renewPlanId = row.draft.planId;
    }
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
            <h3 v-if="mode !== 'features'" :class="$style.subheading">Runtime</h3>
            <div v-if="mode !== 'features'" :class="$style.grantPanel">
                <SelectField v-model="grantPlanId" label="Runtime plan" :options="runtimePlanOptions" />
                <SelectField v-model="grantSlotId" label="VPS slot" :options="seatOptions" />
                <SelectField v-model="grantBotId" label="Assign to" :options="botOptions" />
                <PrimaryButton width-mode="hug" :disabled="!grantPlanId || !grantSlotId" @click="pendingGrant = 'runtime'">Add Runtime</PrimaryButton>
            </div>
            <div v-if="mode !== 'features'" :class="$style.panel">
                <table :class="$style.table">
                    <thead>
                        <tr>
                            <th :class="$style.th">Subject (bot)</th>
                            <th :class="$style.th">Period end</th>
                            <th :class="$style.th">Plan (เดือน)</th>
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
                                <SelectField v-model="row.draft.planId" :class="$style.planSelect" hide-label label="Plan" :options="runtimePlanOptions" />
                            </td>
                            <td :class="$style.td"><input v-model.number="row.draft.renewBaht" :class="$style.input" type="number" min="0" step="0.01" placeholder="—"></td>
                            <td :class="$style.td">
                                <SelectField v-model="row.draft.status" :class="$style.statusSelect" hide-label label="Status" :options="statusOptions" />
                            </td>
                            <td :class="[$style.td, $style.center]"><input v-model="row.draft.autoRenew" :class="$style.checkbox" type="checkbox" aria-label="Auto renew runtime"></td>
                            <td :class="$style.td">
                                <PrimaryButton width-mode="hug" :disabled="savingId === row.sub.id" @click="saveRuntime(row)">
                                    {{ savingId === row.sub.id ? "…" : "Save" }}
                                </PrimaryButton>
                            </td>
                        </tr>
                        <tr v-if="runtimeRows.length === 0"><td :class="$style.empty" colspan="7">No runtime subscriptions.</td></tr>
                    </tbody>
                </table>
            </div>

            <h3 v-if="mode !== 'runtime'" :class="$style.subheading">Packages</h3>
            <div v-if="mode !== 'runtime'" :class="$style.grantPanel">
                <SelectField v-model="grantFeatureId" label="Feature" :options="featureOptions" />
                <SelectField v-model="grantBillingType" label="Billing type" :options="billingOptions" />
                <SelectField v-model="grantBotId" label="Assign to" :options="botOptions" />
                <PrimaryButton width-mode="hug" :disabled="!grantFeatureId" @click="pendingGrant = 'feature'">Add Feature</PrimaryButton>
            </div>
            <h3 v-if="mode !== 'runtime'" :class="$style.listHeading">Unused Features</h3>
            <div v-if="mode !== 'runtime'" :class="$style.panel">
                <table :class="$style.table">
                    <thead>
                        <tr>
                            <th :class="$style.th">Feature</th>
                            <th :class="$style.th">Billing</th>
                            <th :class="$style.th">Period end</th>
                            <th :class="$style.th">Status</th>
                            <th :class="$style.th">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in unusedFeatureRows" :key="row.sub.id">
                            <td :class="$style.td">{{ featureLabel(row.sub.featureId) }}</td>
                            <td :class="$style.td">{{ row.sub.billingType }}</td>
                            <td :class="$style.td">
                                <input v-if="isRecurring(row.sub.billingType)" v-model="row.draft.periodEnd" :class="$style.input" type="date">
                                <span v-else :class="$style.muted">Permanent</span>
                            </td>
                            <td :class="$style.td">
                                <SelectField v-model="row.draft.status" :class="$style.statusSelect" hide-label label="Status" :options="statusOptions" />
                            </td>
                            <td :class="$style.td">
                                <div :class="$style.rowActions">
                                    <PrimaryButton width-mode="hug" :disabled="savingId === row.sub.id" @click="saveFeature(row)">
                                        {{ savingId === row.sub.id ? "…" : "Save" }}
                                    </PrimaryButton>
                                    <PrimaryButton width-mode="hug" @click="pendingFeatureAction = { kind: 'remove', row }">Remove</PrimaryButton>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="unusedFeatureRows.length === 0"><td :class="$style.empty" colspan="5">No unused Features.</td></tr>
                    </tbody>
                </table>
            </div>

            <h3 v-if="mode !== 'runtime'" :class="$style.listHeading">Assigned Features</h3>
            <div v-if="mode !== 'runtime'" :class="$style.panel">
                <table :class="$style.table">
                    <thead><tr>
                        <th :class="$style.th">Feature</th>
                        <th :class="$style.th">Bot</th>
                        <th :class="$style.th">Billing</th>
                        <th :class="$style.th">Status</th>
                        <th :class="$style.th">Action</th>
                    </tr></thead>
                    <tbody>
                        <tr v-for="row in assignedFeatureRows" :key="row.sub.id">
                            <td :class="$style.td">{{ featureLabel(row.sub.featureId) }}</td>
                            <td :class="$style.td">{{ botLabel(row.sub.externalSubjectId) }}</td>
                            <td :class="$style.td">{{ row.sub.billingType }}</td>
                            <td :class="$style.td">{{ row.sub.status }}</td>
                            <td :class="$style.td">
                                <PrimaryButton width-mode="hug" @click="pendingFeatureAction = { kind: 'detach', row }">Detach</PrimaryButton>
                            </td>
                        </tr>
                        <tr v-if="assignedFeatureRows.length === 0"><td :class="$style.empty" colspan="5">No assigned Features.</td></tr>
                    </tbody>
                </table>
            </div>
        </template>

        <StatusToast v-if="toast" :status="toast.status" :title="toast.title" />
        <ConfirmModal
            v-if="pendingGrant"
            :disabled="granting"
            :title="pendingGrant === 'runtime' ? 'Add Runtime' : 'Add Feature'"
            :reason="pendingGrant === 'runtime'
                ? 'Grant this runtime and reserve the selected VPS slot for this user?'
                : 'Grant this feature to the selected bot or add it to the user’s unused stack?'"
            confirm-label="Confirm"
            @cancel="pendingGrant = null"
            @confirm="confirmGrant"
        />
        <ConfirmModal
            v-if="pendingFeatureAction"
            :disabled="granting"
            :title="pendingFeatureAction.kind === 'detach' ? 'Detach Feature' : 'Remove Feature'"
            :reason="pendingFeatureAction.kind === 'detach'
                ? 'Detach this Feature from the bot and return it to the user’s unused stack?'
                : 'Remove this unused Feature entitlement from the user?'"
            :confirm-label="pendingFeatureAction.kind === 'detach' ? 'Detach' : 'Remove'"
            @cancel="pendingFeatureAction = null"
            @confirm="confirmFeatureAction"
        />
    </section>
</template>

<style module>
.wrap { display: flex; flex-direction: column; gap: var(--spacing-space-3); }
.heading { margin: 0; font-size: var(--type-size-h3-card-title); font-weight: 600; color: var(--color-text-primary); }
.subheading { margin: var(--spacing-space-1) 0 0; font-size: var(--type-size-body-small); font-weight: 600; color: var(--color-text-primary); }
.listHeading { margin: var(--spacing-space-2) 0 0; font-size: var(--type-size-subtitle); font-weight: 600; color: var(--color-text-primary); }

.panel {
    box-sizing: border-box;
    overflow-x: auto;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-text, var(--color-text-primary));
}

.grantPanel {
    display: grid;
    grid-template-columns: repeat(3, minmax(180px, 1fr)) auto;
    align-items: end;
    gap: var(--spacing-space-3);
    box-sizing: border-box;
    padding: var(--spacing-space-4);
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background: var(--shop-card-bg, var(--color-main-background));
}

@media (max-width: 900px) {
    .grantPanel { grid-template-columns: 1fr; }
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

.center { text-align: center; }
.rowActions { display: flex; align-items: center; gap: var(--spacing-space-2); }

.input {
    box-sizing: border-box;
    width: var(--spacing-space-32);
    min-height: var(--spacing-space-10);
    padding: 0 var(--spacing-space-2);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
}

.input:focus-visible { outline: none; border-color: var(--color-input-border-focus); }

.muted { color: var(--color-text-secondary); }

.planSelect { width: 300px; }
.statusSelect { width: 160px; }

.checkbox {
    appearance: none;
    display: inline-grid;
    width: var(--spacing-icon-sm);
    height: var(--spacing-icon-sm);
    place-content: center;
    margin: 0;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-input-bg);
    cursor: pointer;
}

.checkbox::after {
    width: var(--spacing-space-2);
    height: var(--spacing-space-1);
    border-bottom: 2px solid var(--color-text-primary);
    border-left: 2px solid var(--color-text-primary);
    content: "";
    opacity: 0;
    transform: rotate(-45deg) translate(1px, -1px);
}

.checkbox:checked { border-color: var(--color-text-primary); background-color: color-mix(in srgb, var(--color-text-primary) 10%, var(--color-input-bg)); }
.checkbox:checked::after { opacity: 1; }
.checkbox:focus-visible { outline: 2px solid var(--color-main-primary); outline-offset: 2px; }

.empty { padding: 16px 12px; color: var(--color-text-secondary); }
.note { margin: 0; color: var(--color-text-secondary); }
.error { margin: 0; color: var(--color-status-error); }
</style>
