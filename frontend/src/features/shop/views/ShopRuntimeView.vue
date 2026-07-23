<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { StatusToast } from "@/shared/ui";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { BaseDialog } from "@/shared/ui/modals";
import { AppFooter } from "@/shared/layout";
import { API_BASE_URL, icons } from "@/config";
import { useUserStore } from "@/stores";
import type { RuntimePlan } from "@/features/shop/config/catalog";
import { useLocaleText } from "@/i18n";

type ToastStatus = "info" | "success" | "warning" | "error";

const SKELETON_COUNT = 8;
const VPS_REFRESH_MS = 30_000;
const text = useLocaleText();

interface VpsSlot {
    id: string;
    slotIndex: number;
    occupancy: "FREE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
    mine: boolean;
    runtimeId: string | null;
    assignedBotId: string | null;
    expiresAt: string | null;
}

interface VpsNode {
    id: string;
    name: string;
    label: string | null;
    region: string | null;
    status: string;
    maxSlots: number;
    freeSlots: number;
    slots: VpsSlot[];
}

// One visible seat from the selected VPS, including occupied/disabled states.
interface SlotCard {
    slot: VpsSlot;
    node: VpsNode;
    vps: number;
}

const router = useRouter();
const userStore = useUserStore();
const { locale, t } = useI18n();

const isLoading = ref(false);
const loadError = ref("");
const isBusy = ref(false);
const selectedNodeId = ref("");
const now = ref(Date.now());
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;
let countdownInterval: ReturnType<typeof setInterval> | undefined;
let vpsRefreshInterval: ReturnType<typeof setInterval> | undefined;

const nodes = ref<VpsNode[]>([]);
const plans = ref<RuntimePlan[]>([]);
const walletBalanceSatang = ref(0);

// Buy dialog state
const buySlot = ref<VpsSlot | null>(null);
const buyVps = ref(0);
const buyPlanId = ref("");

// Cheapest first, so the card's starting price and the dialog default line up.
const sortedPlans = computed(() => [...plans.value].sort((a, b) => a.effectivePriceSatang - b.effectivePriceSatang));
const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) ?? nodes.value[0] ?? null);
const selectedNodeNumber = computed(() => Math.max(1, nodes.value.findIndex((node) => node.id === selectedNode.value?.id) + 1));
const visibleSlots = computed<SlotCard[]>(() => selectedNode.value
    ? selectedNode.value.slots.map((slot) => ({ slot, node: selectedNode.value!, vps: selectedNodeNumber.value }))
    : []);

// Payment summary: selected plan price → current balance → balance after charge.
const buyPrice = computed(() => {
    const plan = sortedPlans.value.find((p) => p.id === buyPlanId.value);
    return plan ? plan.effectivePriceSatang : null;
});
const buyBalanceAfter = computed(() =>
    buyPrice.value != null ? walletBalanceSatang.value - buyPrice.value : null,
);
const buyInsufficient = computed(() => buyBalanceAfter.value != null && buyBalanceAfter.value < 0);

function clearToast(): void {
    if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = undefined; }
    toast.value = null;
}

function notify(status: ToastStatus, title: string, description = ""): void {
    clearToast();
    toast.value = { status, title, description };
    toastTimeout = setTimeout(clearToast, status === "success" ? 2600 : 5200);
}

async function authHeaders(): Promise<Record<string, string> | null> {
    await userStore.initAuth();
    if (!userStore.accessToken) return null;
    return { Authorization: `Bearer ${userStore.accessToken}` };
}

function formatMoney(satang: number): string {
    return (satang / 100).toLocaleString(locale.value === "th" ? "th-TH" : "en-US", { minimumFractionDigits: 0 });
}

function formatPrice(satang: number): string {
    return `${formatMoney(satang)} THB`;
}

function isAvailable(card: SlotCard): boolean {
    return card.node.status === "ACTIVE" && card.slot.occupancy === "FREE";
}

function availabilityLabel(slot: VpsSlot): string {
    if (slot.occupancy === "MAINTENANCE") return text("Unavailable during maintenance", "ไม่พร้อมใช้งานระหว่างการบำรุงรักษา");
    if (!slot.expiresAt) return slot.occupancy === "RESERVED" ? text("Reserved", "ถูกจองแล้ว") : text("Currently unavailable", "ยังไม่พร้อมใช้งาน");
    const remaining = Math.max(0, new Date(slot.expiresAt).getTime() - now.value);
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return text(
        `Available in: ${days}d ${hours}h ${minutes}m ${seconds}s`,
        `พร้อมใช้งานใน: ${days} วัน ${hours} ชม. ${minutes} นาที ${seconds} วินาที`,
    );
}

async function parseError(res: Response): Promise<string> {
    try {
        const body = await res.json();
        let reason = String(body.message ?? body.error ?? "");
        const m = reason.match(/"(?:error|message)"\s*:\s*"([^"]+)"/);
        if (m?.[1]) reason = m[1];
        return reason;
    } catch { return ""; }
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        const headers = await authHeaders();
        if (!headers) { await router.push({ name: "login", query: { redirect: "/store/runtime" } }); return; }
        const [vpsRes, plansRes, walletRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/runtime/vps`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/runtime-plans`, { headers }),
            fetch(`${API_BASE_URL}/api/wallet`, { headers }),
        ]);
        if (!vpsRes.ok || !plansRes.ok) throw new Error("runtime page unavailable");
        nodes.value = await vpsRes.json() as VpsNode[];
        plans.value = await plansRes.json() as RuntimePlan[];
        walletBalanceSatang.value = walletRes.ok ? (((await walletRes.json()).balanceSatang as number) ?? 0) : 0;
        if (!nodes.value.some((node) => node.id === selectedNodeId.value)) {
            selectedNodeId.value = nodes.value[0]?.id ?? "";
        }
    } catch {
        nodes.value = []; plans.value = [];
        walletBalanceSatang.value = 0;
        loadError.value = t("shop.runtime.loadFailed");
    } finally {
        isLoading.value = false;
    }
}

function openBuy(card: SlotCard): void {
    if (!isAvailable(card)) return;
    buySlot.value = card.slot;
    buyVps.value = card.vps;
    buyPlanId.value = sortedPlans.value[0]?.id ?? "";
}

function planDurationLabel(plan: RuntimePlan): string {
    if (plan.durationMonths <= 0) return plan.name;
    return `${plan.durationMonths} Month${plan.durationMonths === 1 ? "" : "s"}`;
}

async function refreshVps(): Promise<void> {
    const headers = await authHeaders();
    if (!headers) return;
    const response = await fetch(`${API_BASE_URL}/api/runtime/vps`, { headers });
    if (!response.ok) return;
    nodes.value = await response.json() as VpsNode[];
    if (!nodes.value.some((node) => node.id === selectedNodeId.value)) {
        selectedNodeId.value = nodes.value[0]?.id ?? "";
    }
}

async function confirmBuy(): Promise<void> {
    const slot = buySlot.value;
    const planId = buyPlanId.value;
    if (!slot || !planId) { notify("warning", t("shop.runtime.choosePlan")); return; }
    // Close right away — success or failure is reported via toast.
    buySlot.value = null;

    const headers = await authHeaders();
    if (!headers) { await router.push({ name: "login", query: { redirect: "/store/runtime" } }); return; }
    isBusy.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/runtime/slots/${slot.id}/purchase`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                runtimePlanId: planId,
                idempotencyKey: crypto.randomUUID(),
            }),
        });
        if (!res.ok) throw new Error(await parseError(res) || `HTTP ${res.status}`);
        notify("success", t("shop.runtime.purchasedTitle"), t("shop.runtime.purchasedBody"));
        window.dispatchEvent(new Event("fujipp:wallet-balance-changed"));
        await load();
    } catch (e) {
        notify("error", t("shop.runtime.purchaseFailedTitle"), (e as Error).message || t("shop.runtime.purchaseFailedBody"));
    } finally {
        isBusy.value = false;
    }
}

function goToWallet(): void {
    void router.push({ name: "shop-wallet" });
}

function goBack(): void {
    void router.push({ name: "shop-dashboard" });
}

onMounted(() => {
    void load();
    countdownInterval = setInterval(() => { now.value = Date.now(); }, 1000);
    vpsRefreshInterval = setInterval(() => { void refreshVps(); }, VPS_REFRESH_MS);
});
onUnmounted(() => {
    clearToast();
    if (countdownInterval) clearInterval(countdownInterval);
    if (vpsRefreshInterval) clearInterval(vpsRefreshInterval);
});
</script>

<template>
    <div :class="$style.shopRuntime">
        <main :class="$style.content">
            <section :class="$style.section" aria-labelledby="shop-runtime-title">
                <div :class="$style.titleRow">
                    <h1 id="shop-runtime-title" :class="$style.pageTitle">{{ t("shop.common.allProducts") }}</h1>
                    <PrimaryButton width-mode="hug" :leading-icon="icons.directionLeft" @click="goBack">{{ t("shop.common.back") }}</PrimaryButton>
                </div>
            </section>

            <section :class="$style.section" aria-labelledby="shop-runtime-slots-title">
                <div :class="$style.controlsRow">
                    <h2 id="shop-runtime-slots-title" :class="$style.sectionTitle" class="type-caption-sb">
                        <RouterLink :class="$style.breadcrumbLink" :to="{ name: 'shop-dashboard' }">{{ t("shop.common.main") }}</RouterLink>
                        <span :class="$style.breadcrumbTrail">
                            <span aria-hidden="true">&gt;</span><span>Runtime</span>
                            <span aria-hidden="true">&gt;</span><span>VPS {{ selectedNodeNumber }}</span>
                        </span>
                    </h2>
                    <div :class="$style.nodeTabs" :aria-label="t('shop.runtime.chooseVps')">
                        <button
                            v-for="(node, index) in nodes"
                            :key="node.id"
                            type="button"
                            :class="[$style.nodeTab, node.id === selectedNode?.id && $style.nodeTabActive]"
                            :aria-pressed="node.id === selectedNode?.id"
                            @click="selectedNodeId = node.id"
                        >
                            VPS {{ index + 1 }}
                        </button>
                    </div>
                </div>

                <div v-if="isLoading" :class="$style.cardGrid">
                    <div v-for="n in SKELETON_COUNT" :key="`sk-${n}`" :class="[$style.runtimeCard, $style.skeletonCard]" />
                </div>

                <section v-else-if="loadError" :class="$style.statePanel" aria-live="polite">
                    <h3 :class="$style.stateTitle">{{ t("shop.runtime.stateTitle") }}</h3>
                    <p :class="$style.stateText">{{ loadError }}</p>
                    <PrimaryButton type="button" width-mode="hug" @click="load">{{ t("shop.common.retry") }}</PrimaryButton>
                </section>

                <template v-else>
                    <div :class="$style.cardGrid">
                        <article
                            v-for="card in visibleSlots"
                            :key="card.slot.id"
                            :class="[$style.runtimeCard, !isAvailable(card) && $style.runtimeCardDisabled]"
                        >
                            <h3 :class="$style.slotTitle">{{ (card.node.region || "TH").toUpperCase() }} SLOT-{{ card.slot.slotIndex }}</h3>
                            <span :class="$style.serverIcon" :style="{ '--server-icon': `url(${icons.shopServer})` }" aria-hidden="true" />

                            <div :class="$style.planBlock">
                                <div :class="$style.divider" aria-hidden="true" />
                                <div :class="$style.planList">
                                    <template v-for="(plan, index) in sortedPlans" :key="plan.id">
                                        <span v-if="index > 0" :class="$style.planSeparator" aria-hidden="true" />
                                        <span :class="$style.planItem">
                                            <strong>{{ formatPrice(plan.effectivePriceSatang) }}</strong>
                                            <span>{{ planDurationLabel(plan) }}</span>
                                        </span>
                                    </template>
                                </div>
                                <div :class="$style.divider" aria-hidden="true" />
                            </div>

                            <p v-if="!isAvailable(card)" :class="$style.availability">
                                <span :class="$style.renewIcon" :style="{ '--renew-icon': `url(${icons.shopRenew})` }" aria-hidden="true" />
                                {{ availabilityLabel(card.slot) }}
                            </p>

                            <PrimaryButton
                                v-if="isAvailable(card)"
                                width-mode="fill"
                                :leading-icon="icons.buy"
                                @click="openBuy(card)"
                            >
                                Buy
                            </PrimaryButton>
                            <PrimaryButton v-else width-mode="fill" :leading-icon="icons.not" disabled :aria-label="t('shop.common.unavailable')">
                                <span :class="$style.visuallyHidden">{{ t("shop.common.unavailable") }}</span>
                            </PrimaryButton>
                        </article>
                    </div>

                    <p v-if="visibleSlots.length === 0" :class="$style.emptyText">
                        {{ t("shop.runtime.noSlots") }}
                    </p>
                </template>
            </section>

            <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
                <StatusToast :status="toast.status" :title="toast.title" :description="toast.description" @close="clearToast" />
            </div>
        </main>

        <AppFooter />

        <!-- Buy a free seat: pick the renewal duration now; assign a bot later on the Dashboard. -->
        <BaseDialog
            v-if="buySlot"
            aria-labelled-by="buy-runtime-title"
            @close="buySlot = null"
        >
            <div :class="$style.modalContent">
                <h2 id="buy-runtime-title" :class="$style.modalTitle">
                    {{ t("shop.runtime.choosePlanForSlot", { vps: buyVps, slot: buySlot.slotIndex }) }}
                </h2>
                <fieldset :class="$style.group">
                    <legend :class="$style.groupLabel">{{ t("shop.runtime.choosePlanLegend") }}</legend>
                    <label
                        v-for="plan in sortedPlans"
                        :key="plan.id"
                        :class="[$style.option, buyPlanId === plan.id && $style.optionActive]"
                    >
                        <input v-model="buyPlanId" type="radio" name="plan" :value="plan.id" :class="$style.radio">
                        <span>{{ planDurationLabel(plan) }}</span>
                        <span :class="$style.optionMeta">{{ plan.name }}</span>
                        <span :class="$style.optionPrice">฿{{ formatMoney(plan.effectivePriceSatang) }}</span>
                    </label>
                    <p v-if="sortedPlans.length === 0" :class="$style.stateText">{{ t("shop.runtime.noPlans") }}</p>
                </fieldset>
                <p :class="$style.assignmentNote">
                    {{ t("shop.runtime.inventoryNote") }}
                </p>

                <dl :class="$style.paymentSummary">
                    <div :class="$style.paymentRow">
                        <dt :class="$style.paymentLabel">{{ t("shop.common.paymentAmount") }}</dt>
                        <dd :class="[$style.paymentValue, buyPrice != null ? $style.paymentAmount : $style.paymentPlaceholder]">
                            {{ buyPrice != null ? `${formatMoney(buyPrice)} ${t("shop.common.baht")}` : t("shop.common.selectPlanFirst") }}
                        </dd>
                    </div>
                    <div :class="[$style.paymentRow, $style.paymentDivider]">
                        <dt :class="$style.paymentLabel">{{ t("shop.common.walletBalance") }}</dt>
                        <dd :class="$style.paymentValue">{{ formatMoney(walletBalanceSatang) }} {{ t("shop.common.baht") }}</dd>
                    </div>
                    <div v-if="buyBalanceAfter != null" :class="$style.paymentRow">
                        <dt :class="$style.paymentLabel">{{ t("shop.common.balanceAfterPayment") }}</dt>
                        <dd :class="[$style.paymentValue, buyInsufficient ? $style.paymentNegative : '']">
                            {{ formatMoney(buyBalanceAfter) }} {{ t("shop.common.baht") }}
                        </dd>
                    </div>
                </dl>

                <p v-if="buyInsufficient" :class="$style.paymentWarning">
                    {{ t("shop.common.insufficientBalance") }}
                </p>

                <div :class="$style.modalActions">
                    <SecondaryButton width-mode="hug" @click="buySlot = null">{{ t("shop.common.cancel") }}</SecondaryButton>
                    <PrimaryButton v-if="buyInsufficient" width-mode="hug" @click="goToWallet">
                        {{ t("shop.common.addCredit") }}
                    </PrimaryButton>
                    <PrimaryButton v-else width-mode="hug" :disabled="isBusy || !buyPlanId" @click="confirmBuy">
                        {{ t("shop.common.confirmPayment") }}
                    </PrimaryButton>
                </div>
            </div>
        </BaseDialog>
    </div>
</template>

<style module>
.shopRuntime {
    /* Page-scoped card theme (mirrors Dashboard/Package). */
    --shop-card-bg: var(--color-neutral-50);
    --shop-card-border: var(--color-input-border);
    --shop-card-text: var(--color-text-primary);
    --shop-card-muted: var(--color-neutral-600);

    display: flex;
    flex-direction: column;
    min-height: 100vh;
    box-sizing: border-box;
    /* Clear the fixed AppNavbar. */
    padding-top: 73px;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

:global(.dark) .shopRuntime,
:global([data-theme="dark"]) .shopRuntime {
    --shop-card-bg: var(--color-main-surface);
    --shop-card-border: var(--color-main-border);
    --shop-card-text: var(--color-text-secondary);
    --shop-card-muted: var(--color-text-secondary);
}

.content {
    display: flex;
    flex: 1;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    max-width: var(--container-7xl);
    margin: 0 auto;
    padding: var(--spacing-space-16) var(--spacing-space-8);
    gap: var(--spacing-space-8);
}

.section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-8);
}

.titleRow {
    display: flex;
    width: 100%;
    height: var(--spacing-space-12);
    flex: 0 0 var(--spacing-space-12);
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.pageTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
    line-height: normal;
}

.controlsRow {
    display: flex;
    width: 100%;
    min-height: var(--spacing-space-12);
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-space-5);
}

.sectionTitle {
    display: flex;
    align-items: center;
    margin: 0;
    gap: var(--spacing-space-1);
    color: var(--color-text-primary);
}

.breadcrumbLink {
    color: inherit;
    line-height: inherit;
    text-decoration: none;
}

.breadcrumbLink:hover {
    box-shadow: inset 0 -1px currentColor;
}

.breadcrumbLink:focus-visible {
    border-radius: var(--radius-sm);
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.breadcrumbTrail {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-space-1);
    animation: runtime-breadcrumb-reveal 320ms cubic-bezier(.2, .8, .2, 1) forwards;
}

@keyframes runtime-breadcrumb-reveal {
    from { opacity: 0; transform: translateX(calc(var(--spacing-space-3) * -1)); }
    to { opacity: 1; transform: translateX(0); }
}

.nodeTabs {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--spacing-space-2);
}

.nodeTab {
    min-height: 41px;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--color-text-primary);
    cursor: pointer;
    font: inherit;
    font-weight: 600;
}

.nodeTabActive {
    background-color: var(--color-text-primary);
    color: var(--color-main-background);
}

.nodeTab:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.cardGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, var(--spacing-space-64)));
    align-items: stretch;
    justify-content: space-between;
    gap: var(--spacing-space-8) var(--spacing-space-5);
}

.runtimeCard {
    display: flex;
    width: 100%;
    min-height: 427px;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    gap: var(--spacing-space-2);
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

.runtimeCardDisabled {
    color: var(--color-text-disabled);
}

.runtimeCardDisabled .planItem > span {
    color: inherit;
}

.slotTitle {
    align-self: stretch;
    margin: 0;
    font-size: var(--type-size-h3-card-title);
    font-weight: 600;
    text-align: center;
}

.serverIcon {
    width: 156px;
    height: 156px;
    flex-shrink: 0;
    background-color: currentColor;
    mask: var(--server-icon) center / contain no-repeat;
    -webkit-mask: var(--server-icon) center / contain no-repeat;
}

.planBlock {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.divider {
    height: 1px;
    background-color: var(--color-main-border);
}

.planList {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: nowrap;
    gap: var(--spacing-space-1);
}

.planItem {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    font-size: var(--type-size-caption);
    white-space: nowrap;
}

.planItem > span {
    color: var(--color-text-secondary);
    font-size: var(--type-size-overline);
}

.planSeparator {
    width: 1px;
    height: var(--spacing-space-8);
    align-self: center;
    flex-shrink: 0;
    background-color: var(--color-main-divider);
}

.availability {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    gap: var(--spacing-space-2);
    color: var(--color-status-error);
    font-size: var(--type-size-overline);
    white-space: nowrap;
}

.renewIcon {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    flex-shrink: 0;
    background-color: currentColor;
    mask: var(--renew-icon) center / contain no-repeat;
    -webkit-mask: var(--renew-icon) center / contain no-repeat;
}

.visuallyHidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.skeletonCard {
    background: linear-gradient(110deg, var(--color-main-surface) 0%, var(--color-main-background) 48%, var(--color-main-surface) 100%);
    background-size: 220% 100%;
    animation: shop-runtime-shimmer 1800ms ease-in-out infinite;
}

@keyframes shop-runtime-shimmer {
    0% {
        background-position: 120% 0;
    }

    100% {
        background-position: -120% 0;
    }
}

.emptyText {
    margin: 0;
    color: var(--shop-card-muted, var(--color-text-secondary));
    font-size: 16px;
    font-weight: 300;
}

.statePanel {
    display: flex;
    max-width: 680px;
    flex-direction: column;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-6);
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
}

.stateTitle {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
}

.stateText {
    margin: 0;
    color: var(--shop-card-muted, var(--color-text-secondary));
    font-size: 16px;
    line-height: 1.5;
}

.toastRegion {
    position: fixed;
    right: var(--spacing-space-5);
    bottom: var(--spacing-space-5);
    z-index: 60;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
}

.modalContent {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    max-height: min(80vh, 640px);
    gap: var(--spacing-space-4);
    overflow-y: auto;
    padding: var(--spacing-space-6);
}

.modalTitle {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
}

.group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
    border: 0;
    padding: 0;
    margin: 0;
}

.groupLabel {
    color: var(--color-dialog-text-secondary);
    font-size: 14px;
    font-weight: 600;
}

.option {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-md);
    color: var(--color-dialog-text-secondary);
    cursor: pointer;
}

.optionActive {
    border-color: var(--color-dialog-text-primary);
    background-color: color-mix(in srgb, var(--color-dialog-text-primary) 8%, var(--color-dialog-background));
}

.optionPrice {
    margin-left: auto;
    color: var(--color-dialog-text-primary);
    font-weight: 700;
}

.optionMeta {
    color: var(--color-dialog-text-secondary);
    font-size: 13px;
}

.assignmentNote {
    margin: 0;
    color: var(--color-dialog-text-secondary);
    font-size: 14px;
    line-height: 1.5;
}

.radio {
    accent-color: var(--color-dialog-text-primary);
}

/* Payment summary rows (label left, value right) — same recipe as the Dashboard modals. */
.paymentSummary {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
    margin: 0;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-md);
    background-color: color-mix(in srgb, var(--color-dialog-text-primary) 4%, var(--color-dialog-background));
}

.paymentRow {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.paymentDivider {
    margin-top: var(--spacing-space-2);
    padding-top: var(--spacing-space-3);
    border-top: 1px solid var(--color-dialog-divider);
}

.paymentLabel {
    margin: 0;
    color: var(--color-dialog-text-secondary);
    font-size: 14px;
    font-weight: 300;
}

.paymentValue {
    margin: 0;
    color: var(--color-dialog-text-primary);
    font-size: 15px;
    font-weight: 600;
    text-align: right;
}

.paymentAmount {
    color: var(--color-dialog-text-primary);
    font-size: 18px;
    font-weight: 800;
}

.paymentPlaceholder {
    color: var(--color-dialog-text-secondary);
    font-size: 15px;
    font-weight: 600;
}

.paymentNegative {
    color: var(--color-status-error);
}

.paymentWarning {
    margin: 0;
    color: var(--color-status-error);
    font-size: 14px;
    font-weight: 600;
}

.modalActions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-space-3);
    flex-wrap: wrap;
}

@media (max-width: 1080px) {
    .cardGrid {
        grid-template-columns: repeat(3, minmax(0, var(--spacing-space-64)));
    }
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-8) var(--spacing-space-4);
    }

    .controlsRow {
        height: auto;
        flex-direction: column;
    }

    .nodeTabs {
        justify-content: flex-start;
    }

    .cardGrid {
        grid-template-columns: repeat(2, minmax(0, var(--spacing-space-64)));
        justify-content: space-between;
    }

    .toastRegion {
        right: var(--spacing-space-3);
        bottom: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}

@media (max-width: 600px) {
    .cardGrid {
        grid-template-columns: minmax(0, var(--spacing-space-64));
        justify-content: center;
    }
}

@media (prefers-reduced-motion: reduce) {
    .breadcrumbTrail {
        animation: none;
    }
}
</style>
