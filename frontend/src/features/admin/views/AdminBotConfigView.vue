<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import type {
    BotConfig,
    AdminRuntimePlan,
    AdminFeature,
    AdminFeaturePrice,
    AdminRuntimeSubscription,
    AdminFeatureSubscription,
} from "@/features/admin/config";
import { SUBSCRIPTION_STATUSES, FEATURE_BILLING_TYPES } from "@/features/admin/config";
import { EmbedEditor, SelectField, StatusToast, type SelectFieldOption } from "@/shared/ui";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";

const EMBEDS_KEY = "__embeds__";
const RUNTIME_KEY = "__runtime__";

const route = useRoute();
const adminStore = useAdminStore();

const config = ref<BotConfig | null>(null);
const isLoading = ref(false);
const loadError = ref("");
const isSaving = ref(false);
const selectedKey = ref<string>("");
const toast = ref<{ status: "success" | "error"; title: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

// Working copy keyed by variableKey across all features (sensitive fields start blank).
const form = reactive<Record<string, string>>({});

const botId = computed(() => String(route.params.botId));
const features = computed(() => config.value?.features ?? []);
const selectedFeature = computed(() => features.value.find((f) => f.code === selectedKey.value) ?? null);
const showEmbeds = computed(() => selectedKey.value === EMBEDS_KEY);
const showRuntime = computed(() => selectedKey.value === RUNTIME_KEY);

// ── Runtime & Features panel state ───────────────────────────────────────────
const runtimeState = ref<string>("");          // live orchestrator state (online/offline/…)
const runtimeBusy = ref(false);                 // start/stop/restart in flight
const subsLoading = ref(false);
const runtimeSub = ref<AdminRuntimeSubscription | null>(null);
const featureSubs = ref<AdminFeatureSubscription[]>([]);
const runtimePlans = ref<AdminRuntimePlan[]>([]);
const catalogFeatures = ref<AdminFeature[]>([]);
const featurePrices = ref<AdminFeaturePrice[]>([]);
const grantPlanId = ref("");                    // runtime plan picked for grant/extend
const grantFeatureId = ref("");                 // feature picked for grant
const grantPriceId = ref("");                   // price SKU picked for grant
const grantBillingType = ref<(typeof FEATURE_BILLING_TYPES)[number]>("RENT_MONTHLY");
const granting = ref(false);

// Per-subscription edit drafts (period end + status), keyed by subscription id.
const subEdits = reactive<Record<string, { currentPeriodEnd: string; status: string }>>({});
const savingSubId = ref<string | null>(null);

const featureNameById = computed(() => {
    const map: Record<string, string> = {};
    for (const f of catalogFeatures.value) map[f.id] = f.name;
    return map;
});

const pricesForGrantFeature = computed<AdminFeaturePrice[]>(() =>
    featurePrices.value.filter((p) => p.featureId === grantFeatureId.value));
const subscriptionStatusOptions: SelectFieldOption[] = SUBSCRIPTION_STATUSES.map((status) => ({ label: status, value: status }));
const runtimePlanOptions = computed<SelectFieldOption[]>(() => [
    { label: "Select a plan…", value: "" },
    ...runtimePlans.value.map((plan) => ({ label: `${plan.name} (${plan.durationMonths}m)`, value: plan.id })),
]);
const featureOptions = computed<SelectFieldOption[]>(() => [
    { label: "Select a feature…", value: "" },
    ...catalogFeatures.value.map((feature) => ({ label: feature.name, value: feature.id })),
]);
const billingOptions: SelectFieldOption[] = FEATURE_BILLING_TYPES.map((type) => ({ label: type, value: type }));
const priceOptions = computed<SelectFieldOption[]>(() => [
    { label: "— none —", value: "" },
    ...pricesForGrantFeature.value.map((price) => ({
        label: `${price.kind}${price.durationMonths ? ` · ${price.durationMonths}m` : ""}`,
        value: price.id,
    })),
]);

function showToast(status: "success" | "error", title: string): void {
    toast.value = { status, title };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = null), 2600);
}

function hydrate(cfg: BotConfig): void {
    config.value = cfg;
    for (const feature of cfg.features) {
        for (const field of feature.fields) {
            form[field.variableKey] = field.isSensitive ? "" : (cfg.values[field.variableKey] ?? "");
        }
    }
    if (!selectedKey.value) {
        selectedKey.value = cfg.features[0]?.code ?? EMBEDS_KEY;
    }
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        hydrate(await adminStore.fetchBotConfig(botId.value));
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load config";
    } finally {
        isLoading.value = false;
    }
}

async function save(): Promise<void> {
    if (!config.value) return;
    const values: Record<string, string> = {};
    for (const feature of config.value.features) {
        for (const field of feature.fields) {
            const value = form[field.variableKey] ?? "";
            // Blank sensitive field = keep the saved secret; don't send it.
            if (field.isSensitive && value.trim() === "") continue;
            values[field.variableKey] = value;
        }
    }
    isSaving.value = true;
    try {
        hydrate(await adminStore.updateBotConfig(botId.value, values));
        showToast("success", "Saved");
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Save failed");
    } finally {
        isSaving.value = false;
    }
}

// ── Runtime & Features panel ─────────────────────────────────────────────────

async function loadRuntimePanel(): Promise<void> {
    subsLoading.value = true;
    try {
        const [subs, plans, feats, prices] = await Promise.all([
            adminStore.fetchBotSubscriptions(botId.value),
            runtimePlans.value.length ? Promise.resolve(runtimePlans.value) : adminStore.fetchRuntimePlans(),
            catalogFeatures.value.length ? Promise.resolve(catalogFeatures.value) : adminStore.fetchFeatures(),
            featurePrices.value.length ? Promise.resolve(featurePrices.value) : adminStore.fetchFeaturePrices(),
        ]);
        runtimePlans.value = plans;
        catalogFeatures.value = feats;
        featurePrices.value = prices;
        // Subscriptions for the owner, narrowed to this bot (subject = bot id).
        runtimeSub.value = subs.runtime.find((r) => r.externalSubjectId === botId.value) ?? null;
        featureSubs.value = subs.features.filter((f) => f.externalSubjectId === botId.value);
        seedSubEdits();
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Failed to load subscriptions");
    } finally {
        subsLoading.value = false;
    }
    void refreshStatus();
}

function seedSubEdits(): void {
    if (runtimeSub.value) {
        subEdits[runtimeSub.value.id] = {
            currentPeriodEnd: runtimeSub.value.currentPeriodEnd ?? "",
            status: runtimeSub.value.status,
        };
    }
    for (const sub of featureSubs.value) {
        subEdits[sub.id] = { currentPeriodEnd: sub.currentPeriodEnd ?? "", status: sub.status };
    }
}

async function refreshStatus(): Promise<void> {
    try {
        const res = await adminStore.botStatus(botId.value);
        runtimeState.value = res.state ?? "unknown";
    } catch {
        runtimeState.value = "unreachable";
    }
}

async function runRuntime(action: "start" | "stop" | "restart"): Promise<void> {
    runtimeBusy.value = true;
    try {
        await adminStore.botRuntimeAction(botId.value, action);
        showToast("success", `${action} sent`);
        await refreshStatus();
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : `${action} failed`);
    } finally {
        runtimeBusy.value = false;
    }
}

async function grantRuntime(): Promise<void> {
    if (!grantPlanId.value) return;
    granting.value = true;
    try {
        runtimeSub.value = await adminStore.grantBotRuntime(botId.value, grantPlanId.value);
        seedSubEdits();
        grantPlanId.value = "";
        showToast("success", "Runtime granted");
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Grant failed");
    } finally {
        granting.value = false;
    }
}

async function grantFeature(): Promise<void> {
    if (!grantFeatureId.value) return;
    granting.value = true;
    try {
        const sub = await adminStore.grantBotFeature(botId.value, {
            featureId: grantFeatureId.value,
            priceId: grantPriceId.value || null,
            billingType: grantBillingType.value,
        });
        featureSubs.value = [...featureSubs.value, sub];
        seedSubEdits();
        grantFeatureId.value = "";
        grantPriceId.value = "";
        showToast("success", "Feature granted");
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Grant failed");
    } finally {
        granting.value = false;
    }
}

async function saveRuntimeSub(): Promise<void> {
    const sub = runtimeSub.value;
    if (!sub) return;
    const draft = subEdits[sub.id];
    if (!draft) return;
    savingSubId.value = sub.id;
    try {
        runtimeSub.value = await adminStore.updateRuntimeSubscription(sub.id, {
            status: draft.status,
            currentPeriodEnd: draft.currentPeriodEnd || undefined,
        });
        seedSubEdits();
        showToast("success", "Runtime updated");
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Update failed");
    } finally {
        savingSubId.value = null;
    }
}

async function saveFeatureSub(sub: AdminFeatureSubscription): Promise<void> {
    const draft = subEdits[sub.id];
    if (!draft) return;
    savingSubId.value = sub.id;
    try {
        const updated = await adminStore.updateFeatureSubscription(sub.id, {
            status: draft.status,
            currentPeriodEnd: draft.currentPeriodEnd || undefined,
        });
        featureSubs.value = featureSubs.value.map((f) => (f.id === updated.id ? updated : f));
        seedSubEdits();
        showToast("success", "Feature updated");
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Update failed");
    } finally {
        savingSubId.value = null;
    }
}

onMounted(async () => {
    await load();
    await loadRuntimePanel();
});
</script>

<template>
    <AdminLayout title="Bot config">
        <template #actions>
            <SecondaryButton width-mode="hug" :to="{ name: 'admin-bots' }">Back to bots</SecondaryButton>
        </template>

        <p v-if="loadError" :class="$style.error" role="alert">{{ loadError }}</p>
        <p v-if="isLoading" :class="$style.note">Loading…</p>

        <div v-if="config" :class="$style.layout">
            <!-- selector -->
            <nav :class="$style.selector" aria-label="Config sections">
                <button
                    v-for="feature in features"
                    :key="feature.code"
                    type="button"
                    :class="[$style.navItem, selectedKey === feature.code ? $style.navActive : '']"
                    @click="selectedKey = feature.code"
                >
                    {{ feature.name }}
                </button>
                <button
                    type="button"
                    :class="[$style.navItem, showRuntime ? $style.navActive : '']"
                    @click="selectedKey = RUNTIME_KEY"
                >
                    Runtime &amp; Features
                </button>
                <button
                    type="button"
                    :class="[$style.navItem, showEmbeds ? $style.navActive : '']"
                    @click="selectedKey = EMBEDS_KEY"
                >
                    Embeds
                </button>
            </nav>

            <!-- content -->
            <div :class="$style.content">
                <p v-if="features.length === 0 && !showEmbeds && !showRuntime" :class="$style.note">
                    This bot has no active features to configure.
                </p>

                <!-- runtime control + subscriptions -->
                <div v-if="showRuntime" :class="$style.stack">
                    <!-- runtime control -->
                    <section :class="$style.feature">
                        <div :class="$style.cardHead">
                            <h2 :class="$style.featureName">Runtime control</h2>
                            <span :class="$style.stateTag">{{ runtimeState || "…" }}</span>
                        </div>
                        <div :class="$style.btnRow">
                            <SecondaryButton width-mode="hug" :disabled="runtimeBusy" @click="runRuntime('start')">Start</SecondaryButton>
                            <SecondaryButton width-mode="hug" :disabled="runtimeBusy" @click="runRuntime('stop')">Stop</SecondaryButton>
                            <SecondaryButton width-mode="hug" :disabled="runtimeBusy" @click="runRuntime('restart')">Restart</SecondaryButton>
                            <SecondaryButton width-mode="hug" @click="refreshStatus">Refresh</SecondaryButton>
                        </div>
                    </section>

                    <!-- runtime subscription -->
                    <section :class="$style.feature">
                        <h2 :class="$style.featureName">Runtime subscription</h2>
                        <p v-if="subsLoading" :class="$style.note">Loading…</p>
                        <template v-else-if="runtimeSub">
                            <div :class="$style.editRow">
                                <SelectField v-model="subEdits[runtimeSub.id]!.status" :class="$style.selectField" hide-label label="Status" :options="subscriptionStatusOptions" />
                                <label :class="$style.field">
                                    <span :class="$style.label">Period end</span>
                                    <input v-model="subEdits[runtimeSub.id]!.currentPeriodEnd" type="date" :class="$style.input">
                                </label>
                                <PrimaryButton width-mode="hug" :disabled="savingSubId === runtimeSub.id" @click="saveRuntimeSub">
                                    {{ savingSubId === runtimeSub.id ? "Saving…" : "Save" }}
                                </PrimaryButton>
                            </div>
                        </template>
                        <template v-else>
                            <p :class="$style.note">No runtime yet — grant a plan to start the clock.</p>
                        </template>
                        <!-- grant / extend runtime -->
                        <div :class="$style.editRow">
                            <SelectField v-model="grantPlanId" :class="$style.wideSelectField" :label="runtimeSub ? 'Extend with plan' : 'Grant plan'" :options="runtimePlanOptions" />
                            <PrimaryButton width-mode="hug" :disabled="!grantPlanId || granting" @click="grantRuntime">
                                {{ runtimeSub ? "Extend" : "Grant" }}
                            </PrimaryButton>
                        </div>
                    </section>

                    <!-- feature subscriptions -->
                    <section :class="$style.feature">
                        <h2 :class="$style.featureName">Features</h2>
                        <p v-if="!subsLoading && featureSubs.length === 0" :class="$style.note">No features granted to this bot.</p>
                        <div v-for="sub in featureSubs" :key="sub.id" :class="$style.editRow">
                            <span :class="$style.subName">{{ featureNameById[sub.featureId] ?? sub.featureId.slice(0, 8) }}<span :class="$style.subMeta"> · {{ sub.billingType }}</span></span>
                            <SelectField v-model="subEdits[sub.id]!.status" :class="$style.selectField" hide-label label="Status" :options="subscriptionStatusOptions" />
                            <label :class="$style.field">
                                <span :class="$style.label">Period end</span>
                                <input v-model="subEdits[sub.id]!.currentPeriodEnd" type="date" :class="$style.input">
                            </label>
                            <PrimaryButton width-mode="hug" :disabled="savingSubId === sub.id" @click="saveFeatureSub(sub)">
                                {{ savingSubId === sub.id ? "Saving…" : "Save" }}
                            </PrimaryButton>
                        </div>

                        <!-- add feature -->
                        <div :class="$style.editRow">
                            <SelectField v-model="grantFeatureId" :class="$style.wideSelectField" label="Add feature" :options="featureOptions" />
                            <SelectField v-model="grantBillingType" :class="$style.selectField" label="Billing" :options="billingOptions" />
                            <SelectField v-model="grantPriceId" :class="$style.wideSelectField" label="Price SKU (optional)" :options="priceOptions" />
                            <PrimaryButton width-mode="hug" :disabled="!grantFeatureId || granting" @click="grantFeature">
                                Grant
                            </PrimaryButton>
                        </div>
                    </section>
                </div>

                <!-- embed editor -->
                <EmbedEditor v-else-if="showEmbeds" :bot-id="botId" base-path="/api/admin/bots" />

                <!-- feature fields -->
                <form v-else-if="selectedFeature" @submit.prevent="save">
                    <section :class="$style.feature">
                        <h2 :class="$style.featureName">{{ selectedFeature.name }}</h2>
                        <div :class="$style.fields">
                            <label v-for="field in selectedFeature.fields" :key="field.variableKey" :class="$style.field">
                                <span :class="$style.label">
                                    {{ field.label }}<span v-if="field.isRequired" :class="$style.req"> *</span>
                                </span>
                                <span v-if="field.description" :class="$style.desc">{{ field.description }}</span>
                                <input
                                    v-model="form[field.variableKey]"
                                    :class="$style.input"
                                    :type="field.isSensitive ? 'password' : 'text'"
                                    :placeholder="field.isSensitive ? '•••••• (leave blank to keep)' : (field.defaultValue ?? '')"
                                    autocomplete="off"
                                >
                            </label>
                        </div>
                        <div :class="$style.actions">
                            <PrimaryButton type="submit" width-mode="hug" :disabled="isSaving">
                                {{ isSaving ? "Saving…" : "Save config" }}
                            </PrimaryButton>
                        </div>
                    </section>
                </form>
            </div>
        </div>

        <StatusToast v-if="toast" :status="toast.status" :title="toast.title" />
    </AdminLayout>
</template>

<style module>
.layout { display: grid; grid-template-columns: 200px 1fr; gap: 20px; align-items: start; }

.selector { display: flex; flex-direction: column; gap: 4px; }
.navItem {
    box-sizing: border-box;
    text-align: left;
    padding: 10px 12px;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-lg);
    background: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-text, var(--color-text-primary));
    font: inherit;
    font-size: 14px;
    cursor: pointer;
}
.navItem:hover { border-color: var(--color-main-primary); }
.navActive { border-color: var(--color-main-primary); color: var(--shop-card-text, var(--color-text-primary)); }

.content { min-width: 0; }

.feature {
    box-sizing: border-box;
    padding: 20px;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-text, var(--color-text-primary));
}

.featureName { margin: 0 0 14px; font-size: 16px; font-weight: 600; }
.fields { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 4px; max-width: 520px; }
.label { font-size: 14px; font-weight: 500; }
.req { color: var(--color-status-error); }
.desc { font-size: 12px; color: var(--color-text-secondary); }

.input {
    box-sizing: border-box;
    width: 100%;
    min-height: 48px;
    padding: 12px 16px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
}
.input:focus-visible { outline: none; border-color: var(--color-input-border-focus); }

.actions { display: flex; justify-content: flex-end; max-width: 520px; margin-top: 16px; }

.saveBtn {
    padding: 10px 20px;
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

.back { color: var(--color-text-primary); text-decoration: none; font-size: 14px; }
.back:hover { text-decoration: underline; }

.note { margin: 0; color: var(--color-text-secondary); }
.error { margin: 0; color: var(--color-status-error); }

/* Runtime & Features panel */
.stack { display: flex; flex-direction: column; gap: 16px; }

.cardHead { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.cardHead .featureName { margin: 0; }

.stateTag {
    padding: 3px 10px;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-full);
    font-size: 12px;
    text-transform: uppercase;
    color: var(--color-text-secondary);
}

.btnRow { display: flex; flex-wrap: wrap; gap: 8px; }

.ghostBtn {
    padding: 8px 16px;
    border: 1px solid var(--shop-card-border);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--shop-card-text, var(--color-text-primary));
    font: inherit;
    cursor: pointer;
    transition: background-color 140ms ease;
}
.ghostBtn:hover { background-color: var(--shop-row-hover); }
.ghostBtn:disabled { cursor: not-allowed; opacity: 0.5; }

.editRow {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 12px;
    padding-top: 14px;
    margin-top: 14px;
    border-top: 1px solid var(--shop-card-border, var(--color-main-divider));
}
.editRow:first-of-type { border-top: 0; margin-top: 0; padding-top: 0; }
.editRow .field { flex: 1 1 140px; max-width: 220px; }
.selectField { flex: 1 1 160px; max-width: 220px; }
.wideSelectField { flex: 1 1 220px; max-width: 320px; }
.editRow .saveBtn { padding: 9px 18px; }

.subName { flex: 1 1 100%; font-size: 14px; font-weight: 500; }
.subMeta { color: var(--color-text-secondary); font-weight: 400; }

@media (max-width: 760px) {
    .layout { grid-template-columns: 1fr; }
}
</style>
