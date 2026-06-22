<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ShopSidebar, BotCard, FeatureTable, RuntimeCard, CreateBotDialog } from "@/features/shop/components";
import type { BotStatus, CreateBotPayload, FeatureCategory, FeatureTableRow, RuntimeStatus } from "@/features/shop/components";
import { StatusToast } from "@/shared/ui";
import { API_BASE_URL } from "@/config";
import { useUserStore } from "@/stores";
import type { CatalogFeature, RuntimePlan } from "@/features/shop/config/catalog";

type ToastStatus = "info" | "success" | "warning" | "error";
type BotAction = "start" | "stop" | "restart" | "edit";
type NextAction =
    | { label: string; title: string; type: "create" }
    | { label: string; title: string; type: "route"; to: "shop-dashboard" | "shop-package" | "shop-wallet" | "shop-runtime" };

const router = useRouter();
const userStore = useUserStore();

const isSidebarOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);
const isLoading = ref(false);
const loadError = ref("");
const showAddBot = ref(false);
const isCreatingBot = ref(false);
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;

interface OverviewMetric {
    label: string;
    value: number | string;
}

interface BotResponse {
    id: string;
    name: string;
    status: string;
    discordApplicationId?: string | null;
    discordGuildId?: string | null;
    tokenConfigured: boolean;
    avatarUrl?: string | null;
    createdAt: string;
    // Derived shop lifecycle from the bot's runtime (ONLINE/OFFLINE/EXPIRED or null).
    runtimeStatus?: string | null;
    runtimeExpiresAt?: string | null;
    runtimeId?: string | null;
}

interface BotSlotInfo {
    used: number;
    freeCount: number;
    paidSlots: number;
    maxSlots: number;
    canCreate: boolean;
    priceSatang: number;
}

interface FeatureSubscriptionResponse {
    id: string;
    featureId: string;
    scope: string;
    externalSubjectId: string | null;
    billingType: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    autoRenew: boolean;
    renewPriceSatang: number | null;
}

interface RuntimeSubscriptionResponse {
    id: string;
    externalSubjectId: string;
    runtimePlanId: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    autoRenew: boolean;
    renewPriceSatang: number | null;
}

interface BotDashboardItem {
    id: string;
    image?: string;
    name: string;
    renewPrice: string;
    runtime: string;
    currentPeriodEnd: string | null;
    status: BotStatus;
}

interface RuntimeDashboardItem {
    botName?: string;
    duration: string;
    id: string;
    remaining: string;
    status: RuntimeStatus;
    autoRenew: boolean;
    currentPeriodEnd: string | null;
}

const botRecords = ref<BotResponse[]>([]);
const catalogFeatures = ref<CatalogFeature[]>([]);
const runtimePlans = ref<RuntimePlan[]>([]);
const featureSubscriptions = ref<FeatureSubscriptionResponse[]>([]);
const runtimeSubscriptions = ref<RuntimeSubscriptionResponse[]>([]);
const botSlots = ref<BotSlotInfo | null>(null);
const showBuySlot = ref(false);
const isBuyingSlot = ref(false);

const nextActions = computed(() => {
    if (isLoading.value) return [];

    const actions: NextAction[] = [];

    if (botRecords.value.length === 0) {
        actions.push({ type: "create", title: "Create your first bot", label: "สร้างบอท" });
    }

    if (runtimeSubscriptions.value.length === 0) {
        actions.push({ type: "route", title: "Buy runtime", label: "ซื้อ Runtime", to: "shop-runtime" });
    }

    if (featureSubscriptions.value.length === 0) {
        actions.push({ type: "route", title: "Add a feature", label: "เลือก Feature", to: "shop-package" });
    }

    if (bots.value.some((bot) => bot.status === "offline")) {
        actions.push({ type: "route", title: "Configure then start", label: "ตั้งค่าบอท", to: "shop-dashboard" });
    }

    return actions.slice(0, 4);
});

const featureById = computed(() => new Map(catalogFeatures.value.map((feature) => [feature.id, feature])));
const runtimePlanById = computed(() => new Map(runtimePlans.value.map((plan) => [plan.id, plan])));
const botById = computed(() => new Map(botRecords.value.map((bot) => [bot.id, bot])));
const runtimeBySubject = computed(() => new Map(runtimeSubscriptions.value.map((runtime) => [runtime.externalSubjectId, runtime])));

const bots = computed<BotDashboardItem[]>(() => botRecords.value.map((bot) => {
    const runtime = runtimeBySubject.value.get(bot.id);

    return {
        id: bot.id,
        name: bot.name,
        image: bot.avatarUrl ?? undefined,
        renewPrice: formatMoney(runtime?.renewPriceSatang ?? 0),
        runtime: formatPeriod(bot.runtimeExpiresAt ?? runtime?.currentPeriodEnd),
        currentPeriodEnd: bot.runtimeExpiresAt ?? runtime?.currentPeriodEnd ?? null,
        status: mapBotStatus(bot),
    };
}));

const features = computed<FeatureTableRow[]>(() => featureSubscriptions.value.map((subscription) => {
    const feature = featureById.value.get(subscription.featureId);
    const bot = subscription.externalSubjectId ? botById.value.get(subscription.externalSubjectId) : undefined;

    return {
        id: subscription.id,
        feature: feature?.name ?? subscription.featureId,
        category: formatBillingType(subscription.billingType),
        usage: bot?.name ?? subscription.externalSubjectId ?? "-",
    };
}));

const runtimes = computed<RuntimeDashboardItem[]>(() => runtimeSubscriptions.value.map((runtime) => {
    const plan = runtimePlanById.value.get(runtime.runtimePlanId);
    const bot = botById.value.get(runtime.externalSubjectId);

    return {
        id: runtime.id,
        botName: bot?.name ?? runtime.externalSubjectId,
        duration: plan ? `${plan.durationMonths} Month` : runtime.runtimePlanId,
        remaining: formatPeriod(runtime.currentPeriodEnd),
        status: mapRuntimeStatus(runtime.status),
        autoRenew: runtime.autoRenew,
        currentPeriodEnd: runtime.currentPeriodEnd,
    };
}));

const overviewMetrics = computed<OverviewMetric[]>(() => {
    const onlineBotCount = bots.value.filter((bot) => bot.status === "online").length;
    const offlineBotCount = bots.value.filter((bot) => bot.status !== "online").length;

    return [
        { label: "Online Bot", value: onlineBotCount },
        { label: "Offline Bot", value: offlineBotCount },
        { label: "Features", value: features.value.length },
        { label: "Runtime", value: runtimes.value.length },
    ];
});

function clearToast(): void {
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = undefined;
    }

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
    return (satang / 100).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatPeriod(date: string | null | undefined): string {
    if (!date) return "-";

    const end = new Date(`${date}T00:00:00`);
    if (Number.isNaN(end.getTime())) return date;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
    if (days < 0) return "Expired";
    if (days === 0) return "Expires today";
    return `${days.toLocaleString("th-TH")} days left`;
}

function formatBillingType(value: string): FeatureCategory {
    switch (value) {
        case "RENT_PERMANENT":
            return "Permanent Feature";
        case "RENT_MONTHLY":
        default:
            return "Rental Feature";
    }
}

function mapBotStatus(bot: BotResponse): BotStatus {
    // Prefer the runtime-derived lifecycle; fall back to the process status.
    const rs = bot.runtimeStatus;
    if (rs === "ONLINE") return "online";
    if (rs === "EXPIRED") return "expired";
    if (rs === "OFFLINE") return "offline";
    return bot.status === "RUNNING" ? "online" : "offline";
}

function mapRuntimeStatus(status: string): RuntimeStatus {
    return status === "ACTIVE" || status === "PAST_DUE" ? "usage" : "idle";
}

async function loadDashboard(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        const headers = await authHeaders();
        if (!headers) {
            await router.push({ name: "login", query: { redirect: "/shop" } });
            return;
        }

        const [botsRes, featuresRes, plansRes, featureSubsRes, runtimeSubsRes, slotsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/bots`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/features`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/runtime-plans`, { headers }),
            fetch(`${API_BASE_URL}/api/subscriptions/features`, { headers }),
            fetch(`${API_BASE_URL}/api/subscriptions/runtime`, { headers }),
            fetch(`${API_BASE_URL}/api/bots/slots`, { headers }),
        ]);

        if (!botsRes.ok || !featuresRes.ok || !plansRes.ok || !featureSubsRes.ok || !runtimeSubsRes.ok) {
            throw new Error("dashboard unavailable");
        }

        botRecords.value = await botsRes.json() as BotResponse[];
        catalogFeatures.value = await featuresRes.json() as CatalogFeature[];
        runtimePlans.value = await plansRes.json() as RuntimePlan[];
        featureSubscriptions.value = await featureSubsRes.json() as FeatureSubscriptionResponse[];
        runtimeSubscriptions.value = await runtimeSubsRes.json() as RuntimeSubscriptionResponse[];
        botSlots.value = slotsRes.ok ? ((await slotsRes.json()) as BotSlotInfo) : null;
    } catch {
        botRecords.value = [];
        catalogFeatures.value = [];
        runtimePlans.value = [];
        featureSubscriptions.value = [];
        runtimeSubscriptions.value = [];
        botSlots.value = null;
        loadError.value = "โหลด Dashboard ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
        notify("error", "โหลด Dashboard ไม่สำเร็จ", "ระบบไม่สามารถดึงข้อมูลบอทและ subscription ได้");
    } finally {
        isLoading.value = false;
    }
}

async function handleBotAction(botId: string, action: string): Promise<void> {
    if (!["start", "stop", "restart", "edit"].includes(action)) return;
    const botAction = action as BotAction;

    if (botAction === "edit") {
        await router.push({ name: "shop-bot-config", params: { botId } });
        return;
    }

    const headers = await authHeaders();
    if (!headers) {
        await router.push({ name: "login", query: { redirect: "/shop" } });
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/bots/${botId}/${botAction}`, {
            method: "POST",
            headers,
        });
        if (!res.ok) {
            let reason = "";
            try {
                const body = await res.json();
                reason = String(body.message ?? body.error ?? "");
                const m = reason.match(/"error"\s*:\s*"([^"]+)"/);
                if (m?.[1]) reason = m[1];
            } catch { /* non-JSON body */ }
            throw new Error(reason || `HTTP ${res.status}`);
        }
        notify("success", "อัปเดตสถานะบอทแล้ว");
        await loadDashboard();
    } catch (e) {
        notify("error", "สั่งบอทไม่สำเร็จ", (e as Error).message || "กรุณาลองใหม่อีกครั้ง");
    }
}

const slotPrice = computed(() => formatMoney(botSlots.value?.priceSatang ?? 5000));

function handleAddBot(): void {
    // Out of slots → prompt to buy one; otherwise open the create form.
    if (botSlots.value && !botSlots.value.canCreate) {
        showBuySlot.value = true;
        return;
    }
    showAddBot.value = true;
}

async function buySlot(): Promise<void> {
    const headers = await authHeaders();
    if (!headers) {
        await router.push({ name: "login", query: { redirect: "/shop" } });
        return;
    }
    isBuyingSlot.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/bots/slots/purchase`, { method: "POST", headers });
        if (!res.ok) {
            let reason = "";
            try {
                const body = await res.json();
                reason = String(body.message ?? body.error ?? "");
                const m = reason.match(/"(?:error|message)"\s*:\s*"([^"]+)"/);
                if (m?.[1]) reason = m[1];
            } catch { /* non-JSON body */ }
            throw new Error(reason || `HTTP ${res.status}`);
        }
        botSlots.value = await res.json() as BotSlotInfo;
        showBuySlot.value = false;
        notify("success", "ซื้อ Bot Slot แล้ว", "ตอนนี้สร้างบอทเพิ่มได้อีก 1 ตัว");
        showAddBot.value = true;
    } catch (e) {
        notify("error", "ซื้อ Slot ไม่สำเร็จ", (e as Error).message || "เครดิตอาจไม่พอ — เติมเงินแล้วลองใหม่");
    } finally {
        isBuyingSlot.value = false;
    }
}

async function createBot(payload: CreateBotPayload): Promise<void> {
    const headers = await authHeaders();
    if (!headers) {
        await router.push({ name: "login", query: { redirect: "/shop" } });
        return;
    }
    isCreatingBot.value = true;
    try {
        const body: Record<string, unknown> = {
            name: payload.name,
            discordToken: payload.discordToken,
            discordApplicationId: payload.discordApplicationId,
            discordGuildId: payload.discordGuildId,
            discordPublicKey: payload.discordPublicKey,
            discordClientSecret: payload.discordClientSecret,
        };

        const res = await fetch(`${API_BASE_URL}/api/bots`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            let reason = "";
            try {
                const errBody = await res.json();
                reason = String(errBody.message ?? errBody.error ?? "");
                const m = reason.match(/"(?:error|message)"\s*:\s*"([^"]+)"/);
                if (m?.[1]) reason = m[1];
            } catch { /* non-JSON body */ }
            throw new Error(reason || `HTTP ${res.status}`);
        }
        showAddBot.value = false;
        notify("success", "สร้างบอทแล้ว", "ไปที่หน้า Runtime เพื่อซื้อช่องเครื่องแล้ว assign ให้บอทตัวนี้");
        await loadDashboard();
    } catch (e) {
        notify("error", "สร้างบอทไม่สำเร็จ", (e as Error).message || "ชื่อบอทอาจซ้ำ หรือ token ไม่ถูกต้อง — ลองใหม่อีกครั้ง");
    } finally {
        isCreatingBot.value = false;
    }
}

onMounted(loadDashboard);
onUnmounted(clearToast);
</script>

<template>
    <div :class="$style.shopDashboard">
        <ShopSidebar v-model="isSidebarOpen" />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.dashboardSection" aria-labelledby="shop-dashboard-title">
                <div :class="$style.titleSection">
                    <h1 id="shop-dashboard-title" :class="$style.pageTitle">Dashboard</h1>
                    <div :class="$style.divider" aria-hidden="true" />
                </div>

                <div :class="$style.overviewGrid" aria-label="Shop overview">
                    <article
                        v-for="metric in overviewMetrics"
                        :key="metric.label"
                        :class="$style.metricCard"
                    >
                        <strong :class="$style.metricValue">{{ metric.value }}</strong>
                        <span :class="$style.metricLabel">{{ metric.label }}</span>
                    </article>
                </div>

                <section v-if="nextActions.length > 0" :class="$style.quickStart" aria-label="Quick start">
                    <span :class="$style.quickStartLabel">เริ่มต่อ</span>
                    <div :class="$style.quickStartActions">
                        <template v-for="action in nextActions" :key="action.title">
                            <button
                                v-if="action.type === 'create'"
                                type="button"
                                :class="$style.quickChip"
                                @click="handleAddBot"
                            >
                                {{ action.label }}
                            </button>
                            <RouterLink v-else :to="{ name: action.to }" :class="$style.quickChip">
                                {{ action.label }}
                            </RouterLink>
                        </template>
                    </div>
                </section>
            </section>

            <section :class="$style.sectionGroup" aria-labelledby="shop-bot-title">
                <h2 id="shop-bot-title" :class="$style.sectionTitle">Bot</h2>
                <div :class="$style.botGrid">
                    <template v-if="isLoading">
                        <BotCard
                            mode="skeleton"
                            name="Loading bot"
                        />
                    </template>
                    <template v-else>
                        <BotCard
                            v-for="bot in bots"
                            :key="bot.id"
                            :name="bot.name"
                            :status="bot.status"
                            :image="bot.image"
                            :runtime="bot.runtime"
                            :runtime-until="bot.currentPeriodEnd"
                            :renew-price="bot.renewPrice"
                            @action="(action) => handleBotAction(bot.id, action)"
                        />
                        <BotCard
                            mode="add"
                            name="Add bot"
                            @add="handleAddBot"
                        />
                    </template>
                </div>
                <section v-if="!isLoading && !loadError && bots.length === 0" :class="$style.statePanel">
                    <h3 :class="$style.stateTitle">ยังไม่มีบอท</h3>
                    <p :class="$style.stateText">สร้างบอทก่อนซื้อ runtime หรือเปิดใช้ฟีเจอร์ในร้าน</p>
                </section>
            </section>

            <section v-if="loadError" :class="$style.statePanel" aria-live="polite">
                <h2 :class="$style.stateTitle">โหลดข้อมูลไม่สำเร็จ</h2>
                <p :class="$style.stateText">{{ loadError }}</p>
                <button type="button" :class="$style.retryButton" @click="loadDashboard">ลองใหม่</button>
            </section>

            <section v-else :class="$style.sectionGroup" aria-labelledby="shop-features-title">
                <h2 id="shop-features-title" :class="$style.sectionTitle">Features</h2>
                <FeatureTable :rows="isLoading ? [] : features" />
            </section>

            <section v-if="!loadError" :class="$style.sectionGroup" aria-labelledby="shop-runtime-title">
                <h2 id="shop-runtime-title" :class="$style.sectionTitle">Runtime</h2>
                <div :class="$style.runtimeGrid">
                    <template v-if="isLoading">
                        <RuntimeCard
                            mode="skeleton"
                            duration="Loading runtime"
                            remaining=""
                        />
                    </template>
                    <template v-else>
                        <RuntimeCard
                            v-for="runtime in runtimes"
                            :key="runtime.id"
                            :duration="runtime.duration"
                            :remaining="runtime.remaining"
                            :status="runtime.status"
                            :bot-name="runtime.botName"
                            :current-period-end="runtime.currentPeriodEnd"
                        />
                    </template>
                </div>
                <section v-if="!isLoading && runtimes.length === 0" :class="$style.statePanel">
                    <h3 :class="$style.stateTitle">ยังไม่มี runtime ที่เปิดใช้งาน</h3>
                    <p :class="$style.stateText">ซื้อ runtime package แล้วข้อมูลจะแสดงที่นี่</p>
                </section>
            </section>

            <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
                <StatusToast
                    :status="toast.status"
                    :title="toast.title"
                    :description="toast.description"
                    @close="clearToast"
                />
            </div>
        </main>

        <CreateBotDialog
            :open="showAddBot"
            :submitting="isCreatingBot"
            @submit="createBot"
            @cancel="showAddBot = false"
        />

        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="showBuySlot" :class="$style.buySlotBackdrop" @click.self="showBuySlot = false">
                    <section :class="$style.buySlotModal" role="dialog" aria-modal="true" aria-labelledby="buy-slot-title">
                        <h2 id="buy-slot-title" :class="$style.buySlotTitle">ซื้อ Bot Slot เพิ่ม</h2>
                        <p :class="$style.buySlotText">
                            คุณใช้ครบ {{ botSlots?.maxSlots ?? 3 }} slot แล้ว ({{ botSlots?.freeCount ?? 3 }} ฟรี +
                            {{ botSlots?.paidSlots ?? 0 }} ที่ซื้อ) — ซื้อเพิ่มอีก 1 slot ถาวรเพื่อสร้างบอทได้อีกตัว
                        </p>
                        <p :class="$style.buySlotPrice">{{ slotPrice }} บาท</p>
                        <div :class="$style.buySlotActions">
                            <button type="button" :class="$style.buySlotCancel" @click="showBuySlot = false">ยกเลิก</button>
                            <button
                                type="button"
                                :class="$style.buySlotConfirm"
                                :disabled="isBuyingSlot"
                                @click="buySlot"
                            >
                                {{ isBuyingSlot ? "กำลังซื้อ…" : "ซื้อ Slot" }}
                            </button>
                        </div>
                    </section>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style module>
.shopDashboard {
    /* Page-scoped card theme (light defaults + dark override below), so Shop cards
       read like the Projects page instead of always-dark on a white page. Components
       consume these via var(--shop-*, <dark fallback>). */
    --shop-card-bg: var(--color-neutral-50);
    --shop-card-border: var(--color-input-border);
    --shop-card-text: var(--color-text-primary);
    --shop-card-muted: var(--color-neutral-600);
    --shop-row-hover: var(--color-neutral-100);

    display: flex;
    min-height: 100vh;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

:global(.dark) .shopDashboard,
:global([data-theme="dark"]) .shopDashboard {
    --shop-card-bg: var(--color-main-surface);
    --shop-card-border: var(--color-main-border);
    --shop-card-text: var(--color-text-secondary);
    --shop-card-muted: var(--color-text-secondary);
    --shop-row-hover: var(--color-table-row-hover);
}

.content {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-6);
    transition: margin-left 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sidebarOpen {
    margin-left: 194px;
}

.sidebarClosed {
    margin-left: 44px;
}

.dashboardSection,
.sectionGroup {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
}

.titleSection {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.pageTitle,
.sectionTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-weight: 600;
    line-height: 1;
}

.pageTitle {
    font-size: 32px;
}

.sectionTitle {
    font-size: 28px;
}

.divider {
    height: 1px;
    background-color: var(--color-main-divider);
}

.overviewGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--spacing-space-4);
    padding-inline: var(--spacing-space-5);
}

.metricCard {
    display: flex;
    min-height: 120px;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    box-sizing: border-box;
    gap: var(--spacing-space-2);
    padding: var(--spacing-space-5) var(--spacing-space-6);
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
    text-align: left;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.metricValue {
    color: var(--shop-card-text, var(--color-text-secondary));
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
}

.metricLabel {
    color: var(--shop-card-muted, var(--color-text-secondary));
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.quickStart {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-space-3);
    margin-inline: var(--spacing-space-5);
}

.quickStartLabel {
    color: color-mix(in srgb, var(--color-text-primary) 68%, transparent);
    font-size: 14px;
    font-weight: 600;
}

.quickStartActions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-space-2);
}

.quickChip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 0 var(--spacing-space-4);
    border: 1px solid var(--color-main-primary);
    border-radius: var(--radius-full);
    background-color: color-mix(in srgb, var(--color-main-primary) 14%, transparent);
    color: var(--color-text-primary);
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 160ms ease, color 160ms ease;
}

.quickChip:hover {
    background-color: var(--color-main-primary);
    color: var(--color-button-primary-btn-text-active);
}

.quickChip:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.botGrid,
.runtimeGrid {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--spacing-space-5);
    padding-inline: var(--spacing-space-5);
}

.runtimeGrid {
    gap: var(--spacing-space-4);
}

.statePanel {
    display: flex;
    max-width: 680px;
    flex-direction: column;
    margin-inline: var(--spacing-space-5);
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-4);
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
}

.stateTitle,
.stateText {
    margin: 0;
}

.stateTitle {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.2;
}

.stateText {
    color: var(--color-text-secondary);
    font-size: 18px;
    line-height: 1.4;
}

.retryButton {
    align-self: flex-start;
    min-height: 42px;
    padding: 0 var(--spacing-space-5);
    border: 0;
    border-radius: var(--radius-md);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
}

.retryButton:hover {
    background-color: var(--color-button-primary-btn-hover);
}

.retryButton:active {
    background-color: var(--color-button-primary-btn-active);
}

.retryButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.toastRegion {
    position: fixed;
    right: var(--spacing-space-5);
    bottom: var(--spacing-space-5);
    z-index: 60;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
}

.buySlotBackdrop {
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

.buySlotModal {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    width: min(440px, 100%);
    padding: var(--spacing-space-6);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-primary);
}

.buySlotTitle {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
}

.buySlotText {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 16px;
    line-height: 1.5;
}

.buySlotPrice {
    margin: 0;
    color: var(--color-main-primary);
    font-size: 28px;
    font-weight: 800;
}

.buySlotActions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-space-3);
}

.buySlotCancel,
.buySlotConfirm {
    min-height: 42px;
    padding: 0 var(--spacing-space-5);
    border-radius: var(--radius-md);
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
}

.buySlotCancel {
    border: 1px solid var(--color-main-border);
    background: transparent;
    color: var(--color-text-primary);
}

.buySlotConfirm {
    border: 0;
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
}

.buySlotConfirm:hover {
    background-color: var(--color-button-primary-btn-hover);
}

.buySlotConfirm:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

@media (max-width: 920px) {
    .overviewGrid,
    .operatorPanel,
    .nextPanel,
    .botGrid,
    .runtimeGrid,
    .statePanel {
        padding-inline: 0;
        margin-inline: 0;
    }

    .operatorGrid,
    .nextGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-5);
    }

    .sidebarOpen,
    .sidebarClosed {
        margin-left: 44px;
    }

    .toastRegion {
        right: var(--spacing-space-3);
        bottom: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }

    .operatorGrid,
    .nextGrid {
        grid-template-columns: 1fr;
    }
}
</style>
