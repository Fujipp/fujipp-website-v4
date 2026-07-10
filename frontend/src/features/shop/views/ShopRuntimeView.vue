<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { RuntimeSlotCard } from "@/features/shop/components";
import { StatusToast } from "@/shared/ui";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { TablePagination } from "@/shared/ui/paginations";
import { AppFooter } from "@/shared/layout";
import { API_BASE_URL, icons } from "@/config";
import { useUserStore } from "@/stores";
import type { RuntimePlan } from "@/features/shop/config/catalog";

type ToastStatus = "info" | "success" | "warning" | "error";

const PAGE_SIZE = 8;

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

// A free seat flattened out of the cabinets, ready to render as one sell card.
interface FreeSlotCard {
    slot: VpsSlot;
    vps: number;
    slotIndex: number;
    region: string;
}

const router = useRouter();
const userStore = useUserStore();

const isLoading = ref(false);
const loadError = ref("");
const isBusy = ref(false);
const page = ref(1);
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;

const nodes = ref<VpsNode[]>([]);
const plans = ref<RuntimePlan[]>([]);
const walletBalanceSatang = ref(0);

// Buy dialog state
const buySlot = ref<VpsSlot | null>(null);
const buyVps = ref(0);
const buyPlanId = ref("");

// Cheapest first, so the card's starting price and the dialog default line up.
const sortedPlans = computed(() => [...plans.value].sort((a, b) => a.effectivePriceSatang - b.effectivePriceSatang));
const startingPrice = computed(() => sortedPlans.value[0] ? formatPrice(sortedPlans.value[0].effectivePriceSatang) : "—");
const planSummary = computed(() => sortedPlans.value.map(planDurationLabel).join(" / ") || "เลือกแพ็กตอนซื้อ");

const freeSlots = computed<FreeSlotCard[]>(() =>
    nodes.value.flatMap((node, index) =>
        node.slots
            .filter((slot) => slot.occupancy === "FREE")
            .map((slot) => ({ slot, vps: index + 1, slotIndex: slot.slotIndex, region: node.region || "th" })),
    ),
);

const pageCount = computed(() => Math.max(1, Math.ceil(freeSlots.value.length / PAGE_SIZE)));
const pagedSlots = computed(() => freeSlots.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));

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
    return (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 0 });
}

function formatPrice(satang: number): string {
    return `฿ ${formatMoney(satang)}`;
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
        if (!headers) { await router.push({ name: "login", query: { redirect: "/shop/runtime" } }); return; }
        const [vpsRes, plansRes, walletRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/runtime/vps`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/runtime-plans`, { headers }),
            fetch(`${API_BASE_URL}/api/wallet`, { headers }),
        ]);
        if (!vpsRes.ok || !plansRes.ok) throw new Error("runtime page unavailable");
        nodes.value = await vpsRes.json() as VpsNode[];
        plans.value = await plansRes.json() as RuntimePlan[];
        walletBalanceSatang.value = walletRes.ok ? (((await walletRes.json()).balanceSatang as number) ?? 0) : 0;
        page.value = 1;
    } catch {
        nodes.value = []; plans.value = [];
        walletBalanceSatang.value = 0;
        loadError.value = "โหลดหน้า Runtime ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
    } finally {
        isLoading.value = false;
    }
}

function openBuy(card: FreeSlotCard): void {
    buySlot.value = card.slot;
    buyVps.value = card.vps;
    buyPlanId.value = sortedPlans.value[0]?.id ?? "";
}

function planDurationLabel(plan: RuntimePlan): string {
    return `${plan.durationMonths} เดือน`;
}

async function confirmBuy(): Promise<void> {
    const slot = buySlot.value;
    const planId = buyPlanId.value;
    if (!slot || !planId) { notify("warning", "เลือกแพ็กก่อน"); return; }
    // Close right away — success or failure is reported via toast.
    buySlot.value = null;

    const headers = await authHeaders();
    if (!headers) { await router.push({ name: "login", query: { redirect: "/shop/runtime" } }); return; }
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
        notify("success", "ซื้อ Runtime แล้ว", "เลือกบอทที่จะใช้ Runtime นี้ได้จากหน้า Dashboard");
        await load();
    } catch (e) {
        notify("error", "ซื้อ Runtime ไม่สำเร็จ", (e as Error).message || "เครดิตอาจไม่พอ — เติมเงินแล้วลองใหม่");
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

onMounted(load);
onUnmounted(clearToast);
</script>

<template>
    <div :class="$style.shopRuntime">
        <main :class="$style.content">
            <section :class="$style.section" aria-labelledby="shop-runtime-title">
                <div :class="$style.titleRow">
                    <h1 id="shop-runtime-title" :class="$style.pageTitle">Runtime สำหรับบอท</h1>
                    <SecondaryButton width-mode="hug" :leading-icon="icons.arrowBack" @click="goBack">
                        กลับ
                    </SecondaryButton>
                </div>
            </section>

            <section :class="$style.section" aria-labelledby="shop-runtime-slots-title">
                <div :class="$style.sectionHeading">
                    <h2 id="shop-runtime-slots-title" :class="$style.sectionTitle">เลือก VPS และแพ็กระยะเวลา</h2>
                    <div :class="$style.headingRule" aria-hidden="true" />
                </div>

                <div v-if="isLoading" :class="$style.cardGrid">
                    <div v-for="n in PAGE_SIZE" :key="`sk-${n}`" :class="[$style.cardItem, $style.skeletonCard]" />
                </div>

                <section v-else-if="loadError" :class="$style.statePanel" aria-live="polite">
                    <h3 :class="$style.stateTitle">โหลดข้อมูลไม่สำเร็จ</h3>
                    <p :class="$style.stateText">{{ loadError }}</p>
                    <PrimaryButton type="button" width-mode="hug" @click="load">ลองใหม่</PrimaryButton>
                </section>

                <template v-else>
                    <div :class="$style.cardGrid">
                        <RuntimeSlotCard
                            v-for="card in pagedSlots"
                            :key="card.slot.id"
                            :class="$style.cardItem"
                            variant="sell"
                            :icon="icons.shopServer"
                            :price="startingPrice"
                            :vps="card.vps"
                            :slot="card.slotIndex"
                            :region="card.region"
                            state="ว่าง"
                            :runtime="planSummary"
                            buy-label="เลือกแพ็ก"
                            @buy="openBuy(card)"
                        />
                    </div>

                    <p v-if="freeSlots.length === 0" :class="$style.emptyText">
                        ตอนนี้ไม่มีช่อง VPS ว่าง — ลองเช็กใหม่อีกครั้งภายหลัง หรือติดต่อผู้ดูแลให้เปิดตู้เพิ่ม
                    </p>

                    <TablePagination v-if="pageCount > 1" v-model="page" :page-count="pageCount" />
                </template>
            </section>

            <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
                <StatusToast :status="toast.status" :title="toast.title" :description="toast.description" @close="clearToast" />
            </div>
        </main>

        <AppFooter />

        <!-- Buy a free seat: pick the renewal duration now; assign a bot later on the Dashboard. -->
        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="buySlot" :class="$style.backdrop" @click.self="buySlot = null">
                    <section :class="$style.modal" role="dialog" aria-modal="true" aria-labelledby="buy-runtime-title" tabindex="-1" @keydown.esc.stop="buySlot = null">
                        <h2 id="buy-runtime-title" :class="$style.modalTitle">
                            เลือกแพ็ก Runtime — VPS {{ buyVps }} ช่อง #{{ buySlot.slotIndex }}
                        </h2>
                        <fieldset :class="$style.group">
                            <legend :class="$style.groupLabel">เลือกแพ็ก</legend>
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
                            <p v-if="sortedPlans.length === 0" :class="$style.stateText">ยังไม่มีแพ็ก Runtime ที่เปิดขาย</p>
                        </fieldset>
                        <p :class="$style.assignmentNote">
                            หลังชำระเงิน Runtime จะอยู่ในคลังของคุณก่อน แล้วเลือกบอทที่จะใช้งานได้จากหน้า Dashboard
                        </p>

                        <dl :class="$style.paymentSummary">
                            <div :class="$style.paymentRow">
                                <dt :class="$style.paymentLabel">ยอดชำระ</dt>
                                <dd :class="[$style.paymentValue, buyPrice != null ? $style.paymentAmount : $style.paymentPlaceholder]">
                                    {{ buyPrice != null ? `${formatMoney(buyPrice)} บาท` : "เลือกแพ็กก่อน" }}
                                </dd>
                            </div>
                            <div :class="[$style.paymentRow, $style.paymentDivider]">
                                <dt :class="$style.paymentLabel">ยอดเงินในกระเป๋า</dt>
                                <dd :class="$style.paymentValue">{{ formatMoney(walletBalanceSatang) }} บาท</dd>
                            </div>
                            <div v-if="buyBalanceAfter != null" :class="$style.paymentRow">
                                <dt :class="$style.paymentLabel">คงเหลือหลังชำระ</dt>
                                <dd :class="[$style.paymentValue, buyInsufficient ? $style.paymentNegative : '']">
                                    {{ formatMoney(buyBalanceAfter) }} บาท
                                </dd>
                            </div>
                        </dl>

                        <p v-if="buyInsufficient" :class="$style.paymentWarning">
                            ยอดเงินในกระเป๋าไม่เพียงพอ — กรุณาเติมเงินก่อนทำรายการ
                        </p>

                        <div :class="$style.modalActions">
                            <SecondaryButton width-mode="hug" @click="buySlot = null">ยกเลิก</SecondaryButton>
                            <PrimaryButton v-if="buyInsufficient" width-mode="hug" @click="goToWallet">
                                เติมเงิน
                            </PrimaryButton>
                            <PrimaryButton v-else width-mode="hug" :disabled="isBusy || !buyPlanId" @click="confirmBuy">
                                ยืนยันชำระเงิน
                            </PrimaryButton>
                        </div>
                    </section>
                </div>
            </Transition>
        </Teleport>
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
    padding: var(--spacing-space-3) var(--spacing-space-6);
    gap: var(--spacing-space-4);
}

.section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
}

.titleRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.pageTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h1-page-title);
    font-weight: 600;
    line-height: normal;
}

.sectionHeading {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
}

.sectionTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h3-card-title);
    font-weight: 600;
    line-height: normal;
}

.headingRule {
    height: 1px;
    flex: 1;
    background-color: var(--color-main-divider);
}

/* 4 columns × 2 rows per page on desktop; 1fr keeps the cards filling the full
   width (no leftover gutter on the right) and steps down on smaller screens. */
.cardGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: stretch;
    gap: var(--spacing-space-3);
}

.cardItem {
    min-width: 0;
}

.skeletonCard {
    height: 300px;
    border-radius: var(--radius-xl);
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

.backdrop {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-space-5);
    background: color-mix(in srgb, #000 55%, transparent);
    backdrop-filter: blur(4px);
}

/* Adaptive pairing (matches shared ConfirmModal): main-background + text-primary
   + main-divider flip together in dark mode. */
.modal {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    width: min(440px, 100%);
    padding: var(--spacing-space-6);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
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
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 600;
}

.option {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    cursor: pointer;
}

.optionActive {
    border-color: var(--color-main-primary);
    background-color: color-mix(in srgb, var(--color-main-primary) 10%, transparent);
}

.optionPrice {
    margin-left: auto;
    color: var(--color-text-secondary);
    font-weight: 700;
}

.optionMeta {
    color: var(--color-text-secondary);
    font-size: 13px;
}

.assignmentNote {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 14px;
    line-height: 1.5;
}

.radio {
    accent-color: var(--color-main-primary);
}

/* Payment summary rows (label left, value right) — same recipe as the Dashboard modals. */
.paymentSummary {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
    margin: 0;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-md);
    background-color: color-mix(in srgb, var(--color-text-primary) 4%, var(--color-main-background));
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
    border-top: 1px solid var(--color-main-divider);
}

.paymentLabel {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 300;
}

.paymentValue {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 15px;
    font-weight: 600;
    text-align: right;
}

.paymentAmount {
    color: var(--color-text-primary);
    font-size: 18px;
    font-weight: 800;
}

.paymentPlaceholder {
    color: var(--color-text-secondary);
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
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-2) var(--spacing-space-2);
    }

    .cardGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .toastRegion {
        right: var(--spacing-space-3);
        bottom: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}

@media (max-width: 480px) {
    .cardGrid {
        grid-template-columns: 1fr;
    }
}
</style>
