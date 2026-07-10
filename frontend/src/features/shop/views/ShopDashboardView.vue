<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { BotControlCard, FeatureCard, RuntimeSlotCard, WalletCreditCard, CreateBotDialog } from "@/features/shop/components";
import type { BotControlAction, CreateBotPayload } from "@/features/shop/components";
import { StatusToast, ReadMoreModal, SelectField, type SelectFieldOption } from "@/shared/ui";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { TablePagination } from "@/shared/ui/paginations";
import { AppFooter } from "@/shared/layout";
import { API_BASE_URL, icons, resolveShopFeatureIcon } from "@/config";
import { useUserStore } from "@/stores";
import type { CatalogFeature, RuntimePlan } from "@/features/shop/config/catalog";

type ToastStatus = "info" | "success" | "warning" | "error";
type BotAction = "start" | "stop" | "restart" | "edit";

const FEATURE_PAGE_SIZE = 8;

const router = useRouter();
const userStore = useUserStore();

const isLoading = ref(false);
const loadError = ref("");
const showAddBot = ref(false);
const isCreatingBot = ref(false);
const featurePage = ref(1);
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
    // null when the runtime was bought but not assigned to a bot yet.
    externalSubjectId: string | null;
    vpsSlotId: string | null;
    runtimePlanId: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    autoRenew: boolean;
    renewPriceSatang: number | null;
}

interface VpsSlotLite {
    id: string;
    slotIndex: number;
}

interface VpsNodeLite {
    name: string;
    label: string | null;
    slots: VpsSlotLite[];
}

interface BotDashboardItem {
    id: string;
    image?: string;
    name: string;
    runtime: string;
    status: "online" | "offline";
    isOnline: boolean;
    vps: string;
    slot: string;
}

interface FeatureDashboardItem {
    featureId: string;
    name: string;
    description: string;
    icon: string;
    // Unassigned BOT-scoped subs — the "stack" the Use button hands out from.
    count: number;
    availableSubIds: string[];
}

interface RuntimeDashboardItem {
    id: string;
    vps: string;
    slot: string;
    meta: string;
    runtime: string;
    inUse: boolean;
    // Package + assignment info so Use/Edit and "เพิ่มเวลา" can act on the card directly.
    planName: string;
    renewPriceSatang: number | null;
    botId: string | null;
}

const botRecords = ref<BotResponse[]>([]);
const catalogFeatures = ref<CatalogFeature[]>([]);
const runtimePlans = ref<RuntimePlan[]>([]);
const featureSubscriptions = ref<FeatureSubscriptionResponse[]>([]);
const runtimeSubscriptions = ref<RuntimeSubscriptionResponse[]>([]);
const vpsNodes = ref<VpsNodeLite[]>([]);
const botSlots = ref<BotSlotInfo | null>(null);
const walletBalanceSatang = ref(0);
const showBuySlot = ref(false);
const isBuyingSlot = ref(false);

const walletBalance = computed(() => walletBalanceSatang.value / 100);
const holderName = computed(() => userStore.profile?.displayName || userStore.profile?.username || "Fujipp");
const holderAvatar = computed(() => userStore.profile?.avatarUrl || "");

// slotId → { vps: node order, slot: slotIndex } so cards can print "VPS : 1 SLOT : 2".
const slotPosition = computed(() => {
    const map = new Map<string, { vps: number; slot: number }>();
    vpsNodes.value.forEach((node, nodeIndex) => {
        for (const slot of node.slots) {
            map.set(slot.id, { vps: nodeIndex + 1, slot: slot.slotIndex });
        }
    });
    return map;
});

const featureById = computed(() => new Map(catalogFeatures.value.map((feature) => [feature.id, feature])));
const runtimePlanById = computed(() => new Map(runtimePlans.value.map((plan) => [plan.id, plan])));
const runtimeBySubject = computed(() => new Map(runtimeSubscriptions.value.map((runtime) => [runtime.externalSubjectId, runtime])));

const bots = computed<BotDashboardItem[]>(() => botRecords.value.map((bot) => {
    const runtime = runtimeBySubject.value.get(bot.id);
    const position = runtime?.vpsSlotId ? slotPosition.value.get(runtime.vpsSlotId) : undefined;
    const isOnline = mapBotOnline(bot);

    return {
        id: bot.id,
        name: bot.name,
        image: bot.avatarUrl ?? undefined,
        runtime: formatPeriod(bot.runtimeExpiresAt ?? runtime?.currentPeriodEnd),
        status: isOnline ? "online" : "offline",
        isOnline,
        vps: position ? String(position.vps) : "-",
        slot: position ? String(position.slot) : "-",
    };
}));

// Owned features grouped by catalog feature. "X items" counts only the unassigned
// stack — assigning one to a bot moves it out of the stack and the count drops.
const ownedFeatures = computed<FeatureDashboardItem[]>(() => {
    const grouped = new Map<string, FeatureSubscriptionResponse[]>();
    for (const subscription of featureSubscriptions.value) {
        const list = grouped.get(subscription.featureId) ?? [];
        list.push(subscription);
        grouped.set(subscription.featureId, list);
    }

    const items = [...grouped.entries()].map(([featureId, subs]) => {
        const feature = featureById.value.get(featureId);
        const availableSubIds = subs
            .filter((sub) => sub.scope === "BOT" && !sub.externalSubjectId && sub.status !== "EXPIRED")
            .map((sub) => sub.id);
        return {
            featureId,
            name: feature?.name ?? featureId,
            description: feature?.description ?? "",
            icon: resolveShopFeatureIcon(feature?.iconKey),
            count: availableSubIds.length,
            availableSubIds,
        };
    });

    // Fully-assigned features (0 items) live on their bots now — no card to show.
    return items.filter((item) => item.count > 0);
});

const featurePageCount = computed(() => Math.max(1, Math.ceil(ownedFeatures.value.length / FEATURE_PAGE_SIZE)));
const pagedFeatures = computed(() => {
    const start = (featurePage.value - 1) * FEATURE_PAGE_SIZE;
    return ownedFeatures.value.slice(start, start + FEATURE_PAGE_SIZE);
});

const runtimes = computed<RuntimeDashboardItem[]>(() => runtimeSubscriptions.value
    .filter((runtime) => runtime.status === "ACTIVE" || runtime.status === "PAST_DUE")
    .map((runtime) => {
        const plan = runtimePlanById.value.get(runtime.runtimePlanId);
        const position = runtime.vpsSlotId ? slotPosition.value.get(runtime.vpsSlotId) : undefined;
        // "In use" = the runtime is actually powering a bot; a paid-but-unassigned
        // runtime should still show "Use" so the user can assign it.
        const inUse = Boolean(runtime.externalSubjectId);

        return {
            id: runtime.id,
            vps: position ? String(position.vps) : "-",
            slot: position ? String(position.slot) : "-",
            meta: `th · ${runtime.status}`,
            runtime: plan ? `${plan.durationMonths} Month — ${formatPeriod(runtime.currentPeriodEnd)}` : formatPeriod(runtime.currentPeriodEnd),
            inUse,
            planName: plan?.name ?? "",
            renewPriceSatang: runtime.renewPriceSatang ?? plan?.effectivePriceSatang ?? null,
            botId: runtime.externalSubjectId || null,
        };
    }));

const overviewMetrics = computed<OverviewMetric[]>(() => {
    const onlineBotCount = bots.value.filter((bot) => bot.isOnline).length;

    return [
        { label: "Online Bot", value: onlineBotCount },
        { label: "Offline Bot", value: bots.value.length - onlineBotCount },
        { label: "Features", value: featureSubscriptions.value.length },
        { label: "Runtime", value: runtimes.value.length },
    ];
});

const slotUsage = computed(() => {
    if (!botSlots.value) return `${botRecords.value.length} slot`;
    return `${botSlots.value.used}/${botSlots.value.maxSlots} slot`;
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

function mapBotOnline(bot: BotResponse): boolean {
    // Prefer the runtime-derived lifecycle; fall back to the process status.
    const rs = bot.runtimeStatus;
    if (rs === "ONLINE") return true;
    if (rs === "EXPIRED" || rs === "OFFLINE") return false;
    return bot.status === "RUNNING";
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

        const [botsRes, featuresRes, plansRes, featureSubsRes, runtimeSubsRes, slotsRes, vpsRes, walletRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/bots`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/features`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/runtime-plans`, { headers }),
            fetch(`${API_BASE_URL}/api/subscriptions/features`, { headers }),
            fetch(`${API_BASE_URL}/api/subscriptions/runtime`, { headers }),
            fetch(`${API_BASE_URL}/api/bots/slots`, { headers }),
            fetch(`${API_BASE_URL}/api/runtime/vps`, { headers }),
            fetch(`${API_BASE_URL}/api/wallet`, { headers }),
        ]);

        if (!botsRes.ok || !featuresRes.ok || !plansRes.ok || !featureSubsRes.ok || !runtimeSubsRes.ok) {
            throw new Error("dashboard unavailable");
        }

        botRecords.value = await botsRes.json() as BotResponse[];
        catalogFeatures.value = await featuresRes.json() as CatalogFeature[];
        runtimePlans.value = await plansRes.json() as RuntimePlan[];
        featureSubscriptions.value = await featureSubsRes.json() as FeatureSubscriptionResponse[];
        runtimeSubscriptions.value = await runtimeSubsRes.json() as RuntimeSubscriptionResponse[];
        vpsNodes.value = vpsRes.ok ? ((await vpsRes.json()) as VpsNodeLite[]) : [];
        botSlots.value = slotsRes.ok ? ((await slotsRes.json()) as BotSlotInfo) : null;
        walletBalanceSatang.value = walletRes.ok ? (((await walletRes.json()).balanceSatang as number) ?? 0) : 0;
        featurePage.value = 1;
    } catch {
        botRecords.value = [];
        catalogFeatures.value = [];
        runtimePlans.value = [];
        featureSubscriptions.value = [];
        runtimeSubscriptions.value = [];
        vpsNodes.value = [];
        botSlots.value = null;
        walletBalanceSatang.value = 0;
        loadError.value = "โหลด Dashboard ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
        notify("error", "โหลด Dashboard ไม่สำเร็จ", "ระบบไม่สามารถดึงข้อมูลบอทและ subscription ได้");
    } finally {
        isLoading.value = false;
    }
}

async function handleBotControl(bot: BotDashboardItem, control: BotControlAction): Promise<void> {
    // The power button toggles by current status; the rest map 1:1.
    const action: BotAction = control === "power" ? (bot.isOnline ? "stop" : "start") : control;

    if (action === "edit") {
        await router.push({ name: "shop-bot-config", params: { botId: bot.id } });
        return;
    }

    const headers = await authHeaders();
    if (!headers) {
        await router.push({ name: "login", query: { redirect: "/shop" } });
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/bots/${bot.id}/${action}`, {
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

function goToPackages(): void {
    void router.push({ name: "shop-package" });
}

function goToRuntimes(): void {
    void router.push({ name: "shop-runtime" });
}

function goToWallet(): void {
    void router.push({ name: "shop-wallet" });
}

// Full feature description shown in a read-only modal (the card clamps it to 3 lines).
const readMore = ref<{ title: string; body: string } | null>(null);

function openReadMore(feature: FeatureDashboardItem): void {
    readMore.value = { title: feature.name, body: feature.description };
}

// ── Runtime assign (Use / Edit) ──────────────────────────────────────────────
// Use = assign a free runtime to a bot; Edit = move it to another bot.
const assignRuntime = ref<RuntimeDashboardItem | null>(null);
const assignBotId = ref("");
const isAssigning = ref(false);

const assignBotOptions = computed<SelectFieldOption[]>(() => [
    { label: "— ไม่ assign (ปิดการใช้งาน) —", value: "" },
    ...botRecords.value.map((bot) => ({ label: bot.name, value: bot.id })),
]);

function openAssign(runtime: RuntimeDashboardItem): void {
    assignRuntime.value = runtime;
    assignBotId.value = runtime.botId ?? "";
}

async function confirmAssign(): Promise<void> {
    const runtime = assignRuntime.value;
    if (!runtime) return;
    const botId = assignBotId.value;
    // Close right away — success or failure is reported via toast.
    assignRuntime.value = null;

    const headers = await authHeaders();
    if (!headers) {
        await router.push({ name: "login", query: { redirect: "/shop" } });
        return;
    }

    isAssigning.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/runtime/${runtime.id}/assign`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ externalSubjectId: botId || null }),
        });
        if (!res.ok) throw new Error(await parseErrorReason(res) || `HTTP ${res.status}`);
        notify(
            "success",
            botId ? "Assign Runtime แล้ว" : "ยกเลิกการ assign แล้ว",
            botId ? "บอทกำลังออนไลน์ด้วย runtime ช่องนี้" : "Runtime ยังเป็นของคุณ — assign ให้บอทได้ทุกเมื่อ",
        );
        await loadDashboard();
    } catch (e) {
        notify("error", "Assign Runtime ไม่สำเร็จ", (e as Error).message || "กรุณาลองใหม่อีกครั้ง");
    } finally {
        isAssigning.value = false;
    }
}

// ── Feature assign (Use — hand one item from the stack to a bot) ─────────────
const useFeature = ref<FeatureDashboardItem | null>(null);
const useFeatureBotId = ref("");
const isAssigningFeature = ref(false);

const useFeatureBotOptions = computed<SelectFieldOption[]>(() => [
    { label: "— เลือกบอท —", value: "" },
    ...botRecords.value.map((bot) => ({ label: bot.name, value: bot.id })),
]);

function openUseFeature(feature: FeatureDashboardItem): void {
    if (feature.availableSubIds.length === 0) {
        notify("info", "ไม่มี item ว่างของ Feature นี้", "ทุก item ถูกใช้กับบอทอยู่ — ซื้อเพิ่มได้จากหน้า Package");
        return;
    }
    useFeature.value = feature;
    useFeatureBotId.value = "";
}

async function confirmUseFeature(): Promise<void> {
    const feature = useFeature.value;
    const botId = useFeatureBotId.value;
    const subId = feature?.availableSubIds[0];
    if (!feature || !subId || !botId) return;
    // Close right away — success or failure is reported via toast.
    useFeature.value = null;

    const headers = await authHeaders();
    if (!headers) {
        await router.push({ name: "login", query: { redirect: "/shop" } });
        return;
    }

    isAssigningFeature.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/subscriptions/features/${subId}/assign`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ externalSubjectId: botId }),
        });
        if (!res.ok) throw new Error(await parseErrorReason(res) || `HTTP ${res.status}`);
        notify("success", "ใช้ Feature กับบอทแล้ว", `${feature.name} ถูกเพิ่มให้บอทและจะพร้อมใช้เมื่อบอทรีสตาร์ทเสร็จ`);
        await loadDashboard();
    } catch (e) {
        notify("error", "ใช้ Feature ไม่สำเร็จ", (e as Error).message || "บอทอาจมี Feature นี้อยู่แล้ว — ลองตัวอื่น");
    } finally {
        isAssigningFeature.value = false;
    }
}

async function parseErrorReason(res: Response): Promise<string> {
    try {
        const body = await res.json();
        let reason = String(body.message ?? body.error ?? "");
        const m = reason.match(/"(?:error|message)"\s*:\s*"([^"]+)"/);
        if (m?.[1]) reason = m[1];
        return reason;
    } catch { return ""; }
}

// ── Runtime extend (เพิ่มเวลา) ────────────────────────────────────────────────
// Renews the subscription by its own package (plan + renew price), charged from wallet.
const addTimeRuntime = ref<RuntimeDashboardItem | null>(null);
const isRenewing = ref(false);

// Payment summary for the modal: price → current balance → balance after charge.
const addTimePrice = computed(() => addTimeRuntime.value?.renewPriceSatang ?? null);
const addTimeBalanceAfter = computed(() =>
    addTimePrice.value != null ? walletBalanceSatang.value - addTimePrice.value : null,
);
const addTimeInsufficient = computed(
    () => addTimeBalanceAfter.value != null && addTimeBalanceAfter.value < 0,
);

async function confirmAddTime(): Promise<void> {
    const runtime = addTimeRuntime.value;
    if (!runtime || isRenewing.value) return;
    // Close right away — success or failure is reported via toast.
    addTimeRuntime.value = null;

    const headers = await authHeaders();
    if (!headers) {
        await router.push({ name: "login", query: { redirect: "/shop" } });
        return;
    }

    isRenewing.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/subscriptions/runtime/${runtime.id}/renew`, {
            method: "POST",
            headers,
        });
        if (!res.ok) throw new Error(await parseErrorReason(res) || `HTTP ${res.status}`);
        notify("success", "ต่อเวลา Runtime แล้ว", "ขยายเวลาตามแพ็กเกจเรียบร้อย");
        await loadDashboard();
    } catch (e) {
        notify("error", "ต่อเวลาไม่สำเร็จ", (e as Error).message || "เครดิตอาจไม่พอ — เติมเงินแล้วลองใหม่");
    } finally {
        isRenewing.value = false;
    }
}

onMounted(loadDashboard);
onUnmounted(clearToast);
</script>

<template>
    <div :class="$style.shopDashboard">
        <main :class="$style.content">
            <section :class="$style.section" aria-labelledby="shop-dashboard-title">
                <h1 id="shop-dashboard-title" :class="$style.pageTitle">ศูนย์จัดการบอท</h1>
                <p :class="$style.pageIntro">จัดการเครดิต บอท ฟีเจอร์เสริม และ Runtime ของคุณจากที่เดียว</p>
            </section>

            <section
                v-if="!isLoading && !loadError && bots.length === 0"
                :class="$style.quickStart"
                aria-labelledby="shop-quick-start-title"
            >
                <div :class="$style.quickStartHeading">
                    <h2 id="shop-quick-start-title" :class="$style.quickStartTitle">เริ่มต้นใช้งาน</h2>
                    <p :class="$style.quickStartText">ทำตามลำดับนี้เพื่อให้บอทพร้อมใช้งาน</p>
                </div>
                <div :class="$style.quickStartGrid">
                    <button type="button" :class="$style.quickStartAction" @click="goToWallet">
                        <span :class="$style.quickStartIcon" :style="{ '--quick-icon': `url(${icons.wallet})` }" aria-hidden="true" />
                        <span><strong>1. เติมเครดิต</strong><small>สำหรับซื้อบริการ</small></span>
                    </button>
                    <button type="button" :class="$style.quickStartAction" @click="handleAddBot">
                        <span :class="$style.quickStartIcon" :style="{ '--quick-icon': `url(${icons.add})` }" aria-hidden="true" />
                        <span><strong>2. สร้างบอท</strong><small>เพิ่มบอท Discord ของคุณ</small></span>
                    </button>
                    <button type="button" :class="$style.quickStartAction" @click="goToRuntimes">
                        <span :class="$style.quickStartIcon" :style="{ '--quick-icon': `url(${icons.shopServer})` }" aria-hidden="true" />
                        <span><strong>3. เลือก Runtime</strong><small>เลือก VPS และระยะเวลา</small></span>
                    </button>
                </div>
            </section>

            <div :class="$style.overviewGrid" aria-label="Shop overview">
                <article
                    v-for="metric in overviewMetrics"
                    :key="metric.label"
                    :class="$style.metricCard"
                >
                    <span :class="$style.metricValue">{{ metric.value }}</span>
                    <span :class="$style.metricLabel">{{ metric.label }}</span>
                </article>
            </div>

            <section :class="$style.section" aria-labelledby="shop-profile-title">
                <div :class="$style.sectionHeading">
                    <h2 id="shop-profile-title" :class="$style.sectionTitle">เครดิตของฉัน</h2>
                    <div :class="$style.headingRule" aria-hidden="true" />
                </div>

                <div :class="$style.profileBlock">
                    <WalletCreditCard
                        :class="$style.creditCard"
                        :balance="walletBalance"
                        :holder="holderName"
                        :emblem="holderAvatar"
                    />
                    <div :class="$style.profileActions">
                        <PrimaryButton width-mode="hug" :leading-icon="icons.wallet" @click="goToWallet">
                            เติมเครดิต
                        </PrimaryButton>
                    </div>
                </div>
            </section>

            <section :class="$style.section" aria-labelledby="shop-bot-title">
                <div :class="$style.sectionHeading">
                    <h2 id="shop-bot-title" :class="$style.sectionTitle">บอทของฉัน</h2>
                    <div :class="$style.headingRule" aria-hidden="true" />
                </div>

                <div :class="$style.sectionToolbar">
                    <div :class="$style.toolbarInfo">
                        <span
                            :class="$style.toolbarIcon"
                            :style="{ '--icon': `url(${icons.shopBot})` }"
                            aria-hidden="true"
                        />
                        <strong :class="$style.toolbarLabel">{{ slotUsage }}</strong>
                    </div>
                    <PrimaryButton width-mode="hug" :leading-icon="icons.add" @click="handleAddBot">
                        สร้างบอท
                    </PrimaryButton>
                </div>

                <div :class="$style.cardGrid">
                    <template v-if="isLoading">
                        <BotControlCard v-for="n in 2" :key="n" mode="skeleton" :class="$style.botCardItem" />
                    </template>
                    <template v-else>
                        <BotControlCard
                            v-for="bot in bots"
                            :key="bot.id"
                            :class="$style.botCardItem"
                            :name="bot.name"
                            :status="bot.status"
                            :avatar="bot.image"
                            :runtime-days="bot.runtime"
                            runtime-clock=""
                            :vps="bot.vps"
                            :slot="bot.slot"
                            @control="(control) => handleBotControl(bot, control)"
                        />
                    </template>
                </div>
                <p v-if="!isLoading && !loadError && bots.length === 0" :class="$style.emptyText">
                    ยังไม่มีบอท — เริ่มจากสร้างบอท แล้วเลือก Runtime และฟีเจอร์เสริมให้บอทของคุณ
                </p>
            </section>

            <section v-if="loadError" :class="$style.statePanel" aria-live="polite">
                <h2 :class="$style.stateTitle">โหลดข้อมูลไม่สำเร็จ</h2>
                <p :class="$style.stateText">{{ loadError }}</p>
                <PrimaryButton type="button" width-mode="hug" @click="loadDashboard">ลองใหม่</PrimaryButton>
            </section>

            <template v-else>
                <section :class="$style.section" aria-labelledby="shop-features-title">
                    <div :class="$style.sectionHeading">
                        <h2 id="shop-features-title" :class="$style.sectionTitle">ฟีเจอร์เสริม</h2>
                        <div :class="$style.headingRule" aria-hidden="true" />
                    </div>

                    <div :class="$style.sectionToolbar">
                        <strong :class="$style.toolbarLabel">
                            ซื้อฟีเจอร์เก็บไว้ก่อน แล้วเลือกใช้กับบอทที่ต้องการได้ภายหลัง
                        </strong>
                        <PrimaryButton width-mode="hug" :leading-icon="icons.buy" @click="goToPackages">
                            เลือกฟีเจอร์
                        </PrimaryButton>
                    </div>

                    <div :class="$style.cardGrid">
                        <FeatureCard
                            v-for="feature in pagedFeatures"
                            :key="feature.featureId"
                            :class="$style.packageCardItem"
                            variant="owned"
                            :icon="feature.icon"
                            :title="feature.name"
                            :description="feature.description"
                            :items-label="`${feature.count} items`"
                            @use="openUseFeature(feature)"
                            @read-more="openReadMore(feature)"
                        />
                    </div>
                    <p v-if="!isLoading && ownedFeatures.length === 0" :class="$style.emptyText">
                        ไม่มีฟีเจอร์ว่างในคลัง — ฟีเจอร์ที่ใช้อยู่จะแสดงอยู่กับบอท กด เลือกฟีเจอร์ เพื่อซื้อเพิ่ม
                    </p>
                    <TablePagination
                        v-if="featurePageCount > 1"
                        v-model="featurePage"
                        :page-count="featurePageCount"
                    />
                </section>

                <section :class="$style.section" aria-labelledby="shop-runtime-title">
                    <div :class="$style.sectionHeading">
                        <h2 id="shop-runtime-title" :class="$style.sectionTitle">Runtime สำหรับบอท</h2>
                        <div :class="$style.headingRule" aria-hidden="true" />
                    </div>

                    <div :class="$style.sectionToolbar">
                        <strong :class="$style.toolbarLabel">
                            เลือก VPS และระยะเวลา แล้วค่อยเลือกบอทที่จะใช้ Runtime นี้ได้ภายหลัง
                        </strong>
                        <PrimaryButton width-mode="hug" :leading-icon="icons.buy" @click="goToRuntimes">
                            เลือก Runtime
                        </PrimaryButton>
                    </div>

                    <div :class="$style.cardGrid">
                        <RuntimeSlotCard
                            v-for="runtime in runtimes"
                            :key="runtime.id"
                            :class="$style.packageCardItem"
                            variant="owned"
                            :icon="icons.shopServer"
                            :vps="runtime.vps"
                            :slot="runtime.slot"
                            region="th"
                            :state="runtime.meta.split(' · ')[1] ?? runtime.meta"
                            :runtime="runtime.runtime"
                            :use-label="runtime.inUse ? 'ย้ายบอท' : 'เลือกบอท'"
                            @use="openAssign(runtime)"
                            @add-time="addTimeRuntime = runtime"
                        />
                    </div>
                    <p v-if="!isLoading && runtimes.length === 0" :class="$style.emptyText">
                        ยังไม่มี Runtime ที่ใช้งานอยู่ — กด เลือก Runtime เพื่อเลือก VPS และแพ็กระยะเวลา
                    </p>
                </section>
            </template>

            <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
                <StatusToast
                    :status="toast.status"
                    :title="toast.title"
                    :description="toast.description"
                    @close="clearToast"
                />
            </div>
        </main>

        <AppFooter />

        <CreateBotDialog
            :open="showAddBot"
            :submitting="isCreatingBot"
            @submit="createBot"
            @cancel="showAddBot = false"
        />

        <ReadMoreModal
            v-if="readMore"
            :title="readMore.title"
            :body="readMore.body"
            @close="readMore = null"
        />

        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="useFeature" :class="$style.buySlotBackdrop" @click.self="useFeature = null">
                    <section :class="$style.buySlotModal" role="dialog" aria-modal="true" aria-labelledby="use-feature-title" tabindex="-1" @keydown.esc.stop="useFeature = null">
                        <h2 id="use-feature-title" :class="$style.buySlotTitle">ใช้ Feature กับบอท</h2>
                        <p :class="$style.buySlotText">
                            {{ useFeature.name }} — มี {{ useFeature.count }} item ว่าง
                            เลือกบอทที่จะรับ Feature นี้ แล้ว item จะย้ายเข้าไปอยู่กับบอทตัวนั้น
                        </p>
                        <SelectField v-model="useFeatureBotId" label="เลือกบอท" :options="useFeatureBotOptions" />
                        <div :class="$style.buySlotActions">
                            <SecondaryButton width-mode="hug" @click="useFeature = null">ยกเลิก</SecondaryButton>
                            <PrimaryButton
                                width-mode="hug"
                                :disabled="isAssigningFeature || !useFeatureBotId"
                                @click="confirmUseFeature"
                            >
                                ยืนยัน
                            </PrimaryButton>
                        </div>
                    </section>
                </div>
            </Transition>
        </Teleport>

        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="addTimeRuntime" :class="$style.buySlotBackdrop" @click.self="addTimeRuntime = null">
                    <section :class="$style.buySlotModal" role="dialog" aria-modal="true" aria-labelledby="add-time-title" tabindex="-1" @keydown.esc.stop="addTimeRuntime = null">
                        <h2 id="add-time-title" :class="$style.buySlotTitle">ยืนยันการต่อเวลา Runtime</h2>
                        <p :class="$style.buySlotText">
                            โปรดตรวจสอบรายละเอียดการชำระเงินก่อนยืนยัน ระบบจะหักยอดจากกระเป๋าเงินของคุณทันที
                        </p>

                        <dl :class="$style.paymentSummary">
                            <div :class="$style.paymentRow">
                                <dt :class="$style.paymentLabel">รายการ</dt>
                                <dd :class="$style.paymentValue">
                                    ต่อเวลา VPS {{ addTimeRuntime.vps }} SLOT {{ addTimeRuntime.slot }}
                                </dd>
                            </div>
                            <div :class="$style.paymentRow">
                                <dt :class="$style.paymentLabel">แพ็กเกจ</dt>
                                <dd :class="$style.paymentValue">{{ addTimeRuntime.planName || "แพ็กเกจเดิมของช่องนี้" }}</dd>
                            </div>
                            <div :class="$style.paymentRow">
                                <dt :class="$style.paymentLabel">ยอดชำระ</dt>
                                <dd :class="[$style.paymentValue, $style.paymentAmount]">
                                    {{ addTimePrice != null ? `${formatMoney(addTimePrice)} บาท` : "ตามราคาแพ็กเกจ" }}
                                </dd>
                            </div>
                            <div :class="[$style.paymentRow, $style.paymentDivider]">
                                <dt :class="$style.paymentLabel">ยอดเงินในกระเป๋า</dt>
                                <dd :class="$style.paymentValue">{{ formatMoney(walletBalanceSatang) }} บาท</dd>
                            </div>
                            <div v-if="addTimeBalanceAfter != null" :class="$style.paymentRow">
                                <dt :class="$style.paymentLabel">คงเหลือหลังชำระ</dt>
                                <dd :class="[$style.paymentValue, addTimeInsufficient ? $style.paymentNegative : '']">
                                    {{ formatMoney(addTimeBalanceAfter) }} บาท
                                </dd>
                            </div>
                        </dl>

                        <p v-if="addTimeInsufficient" :class="$style.paymentWarning">
                            ยอดเงินในกระเป๋าไม่เพียงพอ — กรุณาเติมเงินก่อนทำรายการ
                        </p>

                        <div :class="$style.buySlotActions">
                            <SecondaryButton width-mode="hug" @click="addTimeRuntime = null">ยกเลิก</SecondaryButton>
                            <PrimaryButton v-if="addTimeInsufficient" width-mode="hug" @click="goToWallet">
                                เติมเงิน
                            </PrimaryButton>
                            <PrimaryButton v-else width-mode="hug" :disabled="isRenewing" @click="confirmAddTime">
                                ยืนยันชำระเงิน
                            </PrimaryButton>
                        </div>
                    </section>
                </div>
            </Transition>
        </Teleport>

        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="assignRuntime" :class="$style.buySlotBackdrop" @click.self="assignRuntime = null">
                    <section :class="$style.buySlotModal" role="dialog" aria-modal="true" aria-labelledby="assign-runtime-title" tabindex="-1" @keydown.esc.stop="assignRuntime = null">
                        <h2 id="assign-runtime-title" :class="$style.buySlotTitle">
                            {{ assignRuntime.inUse ? "ย้าย Runtime ให้บอทอื่น" : "ใช้ Runtime กับบอท" }}
                        </h2>
                        <p :class="$style.buySlotText">
                            VPS {{ assignRuntime.vps }} SLOT {{ assignRuntime.slot }} — เลือกบอทที่จะให้ออนไลน์ด้วยช่องนี้
                            บอทตัวเดิมที่เสีย runtime จะออฟไลน์ทันที
                        </p>
                        <SelectField v-model="assignBotId" label="เลือกบอท" :options="assignBotOptions" />
                        <div :class="$style.buySlotActions">
                            <SecondaryButton width-mode="hug" @click="assignRuntime = null">ยกเลิก</SecondaryButton>
                            <PrimaryButton
                                width-mode="hug"
                                :disabled="isAssigning || assignBotId === (assignRuntime.botId ?? '')"
                                @click="confirmAssign"
                            >
                                ยืนยัน
                            </PrimaryButton>
                        </div>
                    </section>
                </div>
            </Transition>
        </Teleport>

        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="showBuySlot" :class="$style.buySlotBackdrop" @click.self="showBuySlot = false">
                    <section :class="$style.buySlotModal" role="dialog" aria-modal="true" aria-labelledby="buy-slot-title" tabindex="-1" @keydown.esc.stop="showBuySlot = false">
                        <h2 id="buy-slot-title" :class="$style.buySlotTitle">ซื้อ Bot Slot เพิ่ม</h2>
                        <p :class="$style.buySlotText">
                            คุณใช้ครบ {{ botSlots?.maxSlots ?? 3 }} slot แล้ว ({{ botSlots?.freeCount ?? 3 }} ฟรี +
                            {{ botSlots?.paidSlots ?? 0 }} ที่ซื้อ) — ซื้อเพิ่มอีก 1 slot ถาวรเพื่อสร้างบอทได้อีกตัว
                        </p>
                        <p :class="$style.buySlotPrice">{{ slotPrice }} บาท</p>
                        <div :class="$style.buySlotActions">
                            <SecondaryButton width-mode="hug" @click="showBuySlot = false">ยกเลิก</SecondaryButton>
                            <PrimaryButton width-mode="hug" :disabled="isBuyingSlot" @click="buySlot">
                                {{ isBuyingSlot ? "กำลังซื้อ…" : "ซื้อ Slot" }}
                            </PrimaryButton>
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
    flex-direction: column;
    min-height: 100vh;
    box-sizing: border-box;
    /* Clear the fixed AppNavbar. */
    padding-top: 73px;
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

.pageTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h1-page-title);
    font-weight: 600;
    line-height: normal;
}

.pageIntro {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-small);
    line-height: 1.5;
}

.quickStart {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
}

.quickStartHeading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-space-2);
}

.quickStartTitle,
.quickStartText {
    margin: 0;
}

.quickStartTitle {
    color: var(--color-text-primary);
    font-size: var(--type-size-body-main);
    font-weight: 600;
}

.quickStartText {
    color: var(--color-text-secondary);
    font-size: var(--type-size-caption);
}

.quickStartGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-space-2);
}

.quickStartAction {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    background-color: transparent;
    color: var(--color-text-primary);
    cursor: pointer;
    text-align: left;
    transition: background-color 160ms ease, border-color 160ms ease;
}

.quickStartAction:hover {
    border-color: var(--color-button-border);
    background-color: var(--color-button-secondary);
}

.quickStartAction:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.quickStartAction strong,
.quickStartAction small {
    display: block;
}

.quickStartAction strong {
    font-size: var(--type-size-caption);
    font-weight: 600;
}

.quickStartAction small {
    margin-top: var(--spacing-space-1);
    color: var(--color-text-secondary);
    font-size: var(--type-size-support);
}

.quickStartIcon {
    --quick-icon: none;
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    flex-shrink: 0;
    background-color: var(--color-text-primary);
    mask: var(--quick-icon) center / contain no-repeat;
    -webkit-mask: var(--quick-icon) center / contain no-repeat;
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
    background-color: var(--color-main-background);
}

.overviewGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-3);
}

.metricCard {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--spacing-space-3);
    gap: var(--spacing-space-3);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-secondary);
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.metricValue {
    font-size: 20px;
    font-weight: 300;
    line-height: 30px;
}

.metricLabel {
    font-size: 16px;
    font-weight: 300;
    line-height: 1;
}

.sectionToolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-space-3) var(--spacing-space-5);
}

.toolbarInfo {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
}

.toolbarIcon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    background-color: var(--color-text-primary);
    mask: var(--icon) center / contain no-repeat;
    -webkit-mask: var(--icon) center / contain no-repeat;
}

.toolbarLabel {
    color: var(--color-text-secondary);
    font-size: 16px;
    font-weight: 800;
    line-height: 1.3;
}

.profileBlock {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-space-3);
}

.creditCard {
    width: min(100%, 472px);
}

.profileActions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-space-3);
}

/* 4 columns × 1fr so cards fill the full width (no leftover gutter on the right),
   matching the store pages; steps down on smaller screens. */
.cardGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: stretch;
    gap: var(--spacing-space-3);
}

.botCardItem,
.packageCardItem {
    min-width: 0;
}

.emptyText {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 16px;
    font-weight: 300;
}

.statePanel {
    display: flex;
    max-width: 680px;
    flex-direction: column;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-4);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-secondary);
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

/* Adaptive pairing (matches shared ConfirmModal): main-background + text-primary
   + main-divider all flip together in dark mode — main-surface stays dark in both
   themes and would break the light theme. */
.buySlotModal {
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

/* Payment summary rows inside the add-time modal (label left, value right). */
.paymentSummary {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
    margin: 0;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-md);
    /* Subtle adaptive tint over the modal background (same recipe as table-row-hover). */
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
    color: var(--color-main-primary);
    font-size: 18px;
    font-weight: 800;
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

.buySlotActions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-space-3);
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

    .pageTitle {
        font-size: 20px;
    }

    .overviewGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        justify-items: stretch;
        max-width: 280px;
        margin: 0 auto;
        width: 100%;
    }

    .quickStartHeading {
        align-items: flex-start;
        flex-direction: column;
    }

    .quickStartGrid {
        grid-template-columns: 1fr;
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
