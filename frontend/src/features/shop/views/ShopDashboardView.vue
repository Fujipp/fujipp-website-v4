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
    createdAt: string;
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
    status: BotStatus;
}

interface RuntimeDashboardItem {
    botName?: string;
    duration: string;
    id: string;
    remaining: string;
    status: RuntimeStatus;
}

const botRecords = ref<BotResponse[]>([]);
const catalogFeatures = ref<CatalogFeature[]>([]);
const runtimePlans = ref<RuntimePlan[]>([]);
const featureSubscriptions = ref<FeatureSubscriptionResponse[]>([]);
const runtimeSubscriptions = ref<RuntimeSubscriptionResponse[]>([]);

const featureById = computed(() => new Map(catalogFeatures.value.map((feature) => [feature.id, feature])));
const runtimePlanById = computed(() => new Map(runtimePlans.value.map((plan) => [plan.id, plan])));
const botById = computed(() => new Map(botRecords.value.map((bot) => [bot.id, bot])));
const runtimeBySubject = computed(() => new Map(runtimeSubscriptions.value.map((runtime) => [runtime.externalSubjectId, runtime])));

const bots = computed<BotDashboardItem[]>(() => botRecords.value.map((bot) => {
    const runtime = runtimeBySubject.value.get(bot.id);

    return {
        id: bot.id,
        name: bot.name,
        renewPrice: formatMoney(runtime?.renewPriceSatang ?? 0),
        runtime: formatPeriod(runtime?.currentPeriodEnd),
        status: mapBotStatus(bot.status),
    };
}));

const features = computed<FeatureTableRow[]>(() => featureSubscriptions.value.map((subscription) => {
    const feature = featureById.value.get(subscription.featureId);

    return {
        id: subscription.id,
        feature: feature?.name ?? subscription.featureId,
        category: formatBillingType(subscription.billingType),
        expire: formatPeriod(subscription.currentPeriodEnd),
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
    };
}));

const overviewMetrics = computed<OverviewMetric[]>(() => {
    const onlineBotCount = bots.value.filter((bot) => bot.status === "online").length;
    const offlineBotCount = bots.value.filter((bot) => bot.status === "offline").length;

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

function mapBotStatus(status: string): BotStatus {
    return status === "RUNNING" || status === "ONLINE" ? "online" : "offline";
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

        const [botsRes, featuresRes, plansRes, featureSubsRes, runtimeSubsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/bots`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/features`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/runtime-plans`, { headers }),
            fetch(`${API_BASE_URL}/api/subscriptions/features`, { headers }),
            fetch(`${API_BASE_URL}/api/subscriptions/runtime`, { headers }),
        ]);

        if (!botsRes.ok || !featuresRes.ok || !plansRes.ok || !featureSubsRes.ok || !runtimeSubsRes.ok) {
            throw new Error("dashboard unavailable");
        }

        botRecords.value = await botsRes.json() as BotResponse[];
        catalogFeatures.value = await featuresRes.json() as CatalogFeature[];
        runtimePlans.value = await plansRes.json() as RuntimePlan[];
        featureSubscriptions.value = await featureSubsRes.json() as FeatureSubscriptionResponse[];
        runtimeSubscriptions.value = await runtimeSubsRes.json() as RuntimeSubscriptionResponse[];
    } catch {
        botRecords.value = [];
        catalogFeatures.value = [];
        runtimePlans.value = [];
        featureSubscriptions.value = [];
        runtimeSubscriptions.value = [];
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        notify("success", "อัปเดตสถานะบอทแล้ว");
        await loadDashboard();
    } catch {
        notify("error", "อัปเดตสถานะบอทไม่สำเร็จ", "กรุณาตรวจสอบ runtime service แล้วลองใหม่อีกครั้ง");
    }
}

function handleAddBot(): void {
    showAddBot.value = true;
}

async function createBot(payload: CreateBotPayload): Promise<void> {
    const headers = await authHeaders();
    if (!headers) {
        await router.push({ name: "login", query: { redirect: "/shop" } });
        return;
    }
    isCreatingBot.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/bots`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showAddBot.value = false;
        notify("success", "สร้างบอทแล้ว", "อย่าลืมซื้อ Runtime + Feature แล้วตั้งค่าบอท");
        await loadDashboard();
    } catch {
        notify("error", "สร้างบอทไม่สำเร็จ", "ชื่อบอทอาจซ้ำ หรือ token ไม่ถูกต้อง — ลองใหม่อีกครั้ง");
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
                    <h1 id="shop-dashboard-title" :class="$style.pageTitle">DASHBOARD</h1>
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
    </div>
</template>

<style module>
.shopDashboard {
    display: flex;
    min-height: 100vh;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

.content {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-6);
    transition: margin-left 180ms ease;
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
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--spacing-space-4);
    padding-inline: var(--spacing-space-5);
}

.metricCard {
    display: flex;
    width: min(100%, 240px);
    min-height: 132px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--spacing-space-5);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: center;
}

.metricValue {
    color: var(--color-text-secondary);
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
}

.metricLabel {
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 800;
    line-height: 1;
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
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-primary);
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

@media (max-width: 920px) {
    .overviewGrid,
    .botGrid,
    .runtimeGrid,
    .statePanel {
        padding-inline: 0;
        margin-inline: 0;
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

    .overviewGrid {
        justify-content: center;
    }

    .metricCard {
        width: min(100%, 240px);
    }

    .toastRegion {
        right: var(--spacing-space-3);
        bottom: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}
</style>
