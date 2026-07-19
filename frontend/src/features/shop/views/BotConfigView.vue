<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
    FeatureConfigForm,
    RobloxRobuxConfigForm,
    type CreateBotPayload,
} from "@/features/shop/components";
import { AppFooter } from "@/shared/layout";
import { PrimaryButton, SecondaryButton, StatusToast, TextField, type SelectFieldOption } from "@/shared/ui";
import { ToggleSwitch } from "@/shared/ui/toggles";
import { EmbedEditor } from "@/shared/ui/embeds";
import { ConfirmModal } from "@/shared/ui/modals";
import { useUserStore } from "@/stores";
import { API_BASE_URL, icons } from "@/config";
import {
    type BotConfigResponse,
    type FeatureDefinition,
} from "@/features/shop/config/featureConfig";
import type { CatalogFeature } from "@/features/shop/config/catalog";
import CountdownTimer from "@/features/shop/components/CountdownTimer.vue";

type ToastStatus = "info" | "success" | "warning" | "error";

// Feature codes that render through a bespoke form instead of the generic,
// template-driven FeatureConfigForm.
const ROBLOX_ROBUX_PAYOUT = "roblox-robux-payout";
const REVIEW_CREDIT = "review-credit";
const CORE_FEATURE_CODES = ["bot-presence", "runtime-expiry-alert"] as const;
const PACKAGE_EXCLUDED_CODES = new Set([...CORE_FEATURE_CODES, "runtime-monitor"]);

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const botId = computed(() => String(route.params.botId ?? ""));

const features = ref<FeatureDefinition[]>([]);
const values = ref<Record<string, string>>({});
const channels = ref<{ id: string; name: string }[]>([]);
const roles = ref<{ id: string; name: string }[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const configError = ref("");
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);
const confirmation = ref<{
    title: string;
    reason: string;
    confirmLabel: string;
    variant: "default" | "danger";
    action: () => void | Promise<void>;
} | null>(null);
const confirmationBusy = ref(false);

function requestConfirmation(
    title: string,
    reason: string,
    confirmLabel: string,
    variant: "default" | "danger",
    action: () => void | Promise<void>,
): void {
    confirmation.value = { title, reason, confirmLabel, variant, action };
}

async function runConfirmedAction(): Promise<void> {
    const pending = confirmation.value;
    if (!pending || confirmationBusy.value) return;
    confirmationBusy.value = true;
    try {
        await pending.action();
        confirmation.value = null;
    } finally {
        confirmationBusy.value = false;
    }
}

const botName = ref("");
const botAvatarUrl = ref("");
const botAvatarFailed = ref(false);
const botRuntimeStatus = ref<string | null>(null);
const botRuntimeExpiresAt = ref<string | null>(null);
const botActionBusy = ref(false);
const botInitial = ref<Partial<CreateBotPayload>>({});
const isSavingBot = ref(false);
type MainView = "main" | "bot-config" | "runtime-setting" | "package-setting" | "package-feature" | "core-features" | "core-feature" | "embed-setting";
const activeMainView = ref<MainView>("main");
const botConfigForm = reactive<CreateBotPayload>({
    name: "",
    discordToken: "",
    discordApplicationId: "",
    discordGuildId: "",
    discordPublicKey: "",
    discordClientSecret: "",
    runtimePlanId: "",
});

// Runtime subscription for this bot — lifecycle (auto-renew / renew now) lives here
// rather than on the dashboard runtime card.
interface RuntimeSubscription {
    id: string;
    externalSubjectId: string;
    vpsSlotId: string | null;
    runtimePlanId: string | null;
    currentPeriodEnd: string | null;
    autoRenew: boolean;
    renewPriceSatang: number | null;
    status: string;
}
interface RuntimeVpsNode {
    id: string;
    name: string;
    label: string | null;
    region: string | null;
    slots: Array<{ id: string; slotIndex: number }>;
}
const runtimeSub = ref<RuntimeSubscription | null>(null);
const runtimeNodes = ref<RuntimeVpsNode[]>([]);
const runtimeBusy = ref(false);
const renewPrice = computed(() =>
    ((runtimeSub.value?.renewPriceSatang ?? 0) / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
);
const runtimeSlotLabel = computed(() => {
    const slotId = runtimeSub.value?.vpsSlotId;
    if (!slotId) return "Runtime slot";
    for (const node of runtimeNodes.value) {
        const slot = node.slots.find((item) => item.id === slotId);
        if (!slot) continue;
        const location = node.region || "TH";
        return `${location} SLOT-${slot.slotIndex}`.toUpperCase();
    }
    return "Runtime slot";
});
const botIsOnline = computed(() => botRuntimeStatus.value === "ONLINE");
const botRuntimeUntil = computed(() => {
    const value = botRuntimeExpiresAt.value;
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const expiry = new Date(`${value}T00:00:00`);
    expiry.setDate(expiry.getDate() + 1);
    return expiry.toISOString();
});

interface FeatureSubscription {
    id: string;
    featureId: string;
    externalSubjectId: string | null;
    status: string;
}
const catalogFeatures = ref<CatalogFeature[]>([]);
const featureSubscriptions = ref<FeatureSubscription[]>([]);
const packageBusyId = ref("");
const packageRows = computed(() => features.value
    .filter((feature) => !PACKAGE_EXCLUDED_CODES.has(feature.code))
    .map((feature) => {
        const catalog = catalogFeatures.value.find((item) => item.code === feature.code);
        const subscription = catalog
            ? featureSubscriptions.value.find((item) => item.featureId === catalog.id && item.externalSubjectId === botId.value)
            : undefined;
        return {
            feature,
            description: catalog?.description || `${feature.fields.length} configuration fields`,
            subscriptionId: subscription?.id ?? "",
        };
    }));
const coreFeatureRows = computed(() => features.value
    .filter((feature) => CORE_FEATURE_CODES.includes(feature.code as typeof CORE_FEATURE_CODES[number]))
    .sort((left, right) => CORE_FEATURE_CODES.indexOf(left.code as typeof CORE_FEATURE_CODES[number]) - CORE_FEATURE_CODES.indexOf(right.code as typeof CORE_FEATURE_CODES[number]))
    .map((feature) => {
        const catalog = catalogFeatures.value.find((item) => item.code === feature.code);
        return {
            feature,
            description: catalog?.description || `${feature.fields.length} configuration fields`,
        };
    }));

// Which feature tab is active in the Feature Setting section.
const activeFeatureCode = ref("");
const activeFeature = computed<FeatureDefinition | null>(
    () => features.value.find((f) => f.code === activeFeatureCode.value) ?? null,
);

// Feature codes that own at least one embed slot — drives whether the Embed Setting
// panel shows for the selected feature.
const embedFeatureCodes = ref<Set<string>>(new Set());
const activeFeatureHasEmbed = computed(() => embedFeatureCodes.value.has(activeFeatureCode.value));
const activeFeatureIndex = computed(() => features.value.findIndex((f) => f.code === activeFeatureCode.value));

function iconMaskStyle(icon: string): Record<string, string> {
    return { "--icon-src": `url(${icon})` };
}

function featureFieldProgress(feature: FeatureDefinition): string {
    const filled = feature.fields.filter((field) => String(values.value[field.variableKey] ?? "").trim()).length;
    return `${filled}/${feature.fields.length}`;
}

// Keep the active tab valid as features (re)load.
watch(features, (list) => {
    if (!list.some((f) => f.code === activeFeatureCode.value)) {
        activeFeatureCode.value = list[0]?.code ?? "";
    }
});

const channelOptions = computed<SelectFieldOption[]>(() => channels.value.map((c) => ({ label: `#${c.name}`, value: c.id })));
const roleOptions = computed<SelectFieldOption[]>(() => roles.value.map((r) => ({ label: `@${r.name}`, value: r.id })));

function notify(status: ToastStatus, title: string, description?: string): void {
    toast.value = { status, title, description };
}

async function authHeaders(): Promise<Record<string, string> | null> {
    await userStore.initAuth();
    if (!userStore.accessToken) return null;
    return { Authorization: `Bearer ${userStore.accessToken}` };
}

async function loadBot(): Promise<void> {
    const headers = await authHeaders();
    if (!headers) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/bots/${botId.value}`, { headers });
        if (!res.ok) return;
        const b = await res.json();
        botName.value = b.name ?? "";
        botAvatarUrl.value = b.avatarUrl ?? "";
        botAvatarFailed.value = false;
        botRuntimeStatus.value = b.runtimeStatus ?? null;
        botRuntimeExpiresAt.value = b.runtimeExpiresAt ?? null;
        botInitial.value = {
            name: b.name ?? "",
            discordApplicationId: b.discordApplicationId ?? "",
            discordGuildId: b.discordGuildId ?? "",
            discordPublicKey: b.discordPublicKey ?? "",
        };
        if (activeMainView.value !== "bot-config") resetBotConfigForm();
    } catch { /* non-blocking */ }
}

function resetBotConfigForm(): void {
    botConfigForm.name = botInitial.value.name ?? "";
    botConfigForm.discordToken = "";
    botConfigForm.discordApplicationId = botInitial.value.discordApplicationId ?? "";
    botConfigForm.discordGuildId = botInitial.value.discordGuildId ?? "";
    botConfigForm.discordPublicKey = botInitial.value.discordPublicKey ?? "";
    botConfigForm.discordClientSecret = "";
    botConfigForm.runtimePlanId = "";
}

function applyMainView(view: MainView): void {
    const update = () => { activeMainView.value = view; };
    const transitionDocument = document as Document & {
        startViewTransition?: (callback: () => void) => unknown;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !transitionDocument.startViewTransition) {
        update();
        return;
    }
    transitionDocument.startViewTransition(update);
}

function setMainView(view: MainView): void {
    const featureCode = activeFeatureCode.value;
    const params = { botId: botId.value };
    const destinations = {
        main: { name: "shop-bot-config", params },
        "bot-config": { name: "shop-bot-config-detail", params },
        "runtime-setting": { name: "shop-bot-runtime-setting", params },
        "package-setting": { name: "shop-bot-package-setting", params },
        "core-features": { name: "shop-bot-core-features", params },
        "core-feature": { name: "shop-bot-core-feature", params: { ...params, featureCode } },
        "package-feature": { name: "shop-bot-package-feature", params: { ...params, featureCode } },
        "embed-setting": { name: "shop-bot-embed-setting", params: { ...params, featureCode } },
    } as const;
    const featureViews: MainView[] = ["core-feature", "package-feature", "embed-setting"];
    const safeView = featureViews.includes(view) && !featureCode ? "main" : view;

    void router.push(destinations[safeView]);
}

const routeViewNames: Record<string, MainView> = {
    "shop-bot-config": "main",
    "shop-bot-config-detail": "bot-config",
    "shop-bot-runtime-setting": "runtime-setting",
    "shop-bot-package-setting": "package-setting",
    "shop-bot-package-feature": "package-feature",
    "shop-bot-core-features": "core-features",
    "shop-bot-core-feature": "core-feature",
    "shop-bot-embed-setting": "embed-setting",
};

watch(
    () => [route.name, route.params.featureCode] as const,
    ([routeName, featureCode]) => {
        const nextFeatureCode = String(featureCode ?? "");
        if (nextFeatureCode) activeFeatureCode.value = nextFeatureCode;
        applyMainView(routeViewNames[String(routeName)] ?? "main");
    },
    { immediate: true },
);

function openBotConfig(): void {
    resetBotConfigForm();
    setMainView("bot-config");
}

function openRuntimeSetting(): void {
    setMainView("runtime-setting");
}

function openPackageSetting(): void {
    setMainView("package-setting");
}

function openPackageFeature(featureCode: string): void {
    activeFeatureCode.value = featureCode;
    setMainView("package-feature");
}

function openCoreFeatures(): void {
    setMainView("core-features");
}

function openCoreFeature(featureCode: string): void {
    activeFeatureCode.value = featureCode;
    setMainView("core-feature");
}

function handleBack(): void {
    if (activeMainView.value === "embed-setting") {
        setMainView("package-feature");
        return;
    }
    if (activeMainView.value === "package-feature") {
        setMainView("package-setting");
        return;
    }
    if (activeMainView.value === "core-feature") {
        setMainView("core-features");
        return;
    }
    if (activeMainView.value !== "main") {
        setMainView("main");
        return;
    }
    void router.push({ name: "my-bot" });
}

async function loadPackageAssignments(): Promise<void> {
    const headers = await authHeaders();
    if (!headers) return;
    try {
        const [catalogResponse, subscriptionResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/catalog/features`, { headers }),
            fetch(`${API_BASE_URL}/api/subscriptions/features`, { headers }),
        ]);
        if (!catalogResponse.ok || !subscriptionResponse.ok) return;
        catalogFeatures.value = await catalogResponse.json() as CatalogFeature[];
        featureSubscriptions.value = await subscriptionResponse.json() as FeatureSubscription[];
    } catch { /* non-blocking — config definitions still provide the package list */ }
}

async function removePackage(subscriptionId: string, featureName: string): Promise<void> {
    if (!subscriptionId) return;
    const headers = await authHeaders();
    if (!headers) return;
    packageBusyId.value = subscriptionId;
    try {
        const response = await fetch(`${API_BASE_URL}/api/subscriptions/features/${subscriptionId}/assign`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ externalSubjectId: null }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        notify("success", "นำ Package ออกจากบอทแล้ว", `${featureName} ยังอยู่ใน My Bot และสามารถนำไปใช้กับบอทอื่นได้`);
        await Promise.all([loadConfig(), loadPackageAssignments()]);
    } catch {
        notify("error", "นำ Package ออกไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    } finally {
        packageBusyId.value = "";
    }
}

function confirmRemovePackage(subscriptionId: string, featureName: string): void {
    requestConfirmation(
        "Remove package?",
        `Remove ${featureName} from this bot? The feature will stop working immediately.`,
        "Remove",
        "danger",
        () => removePackage(subscriptionId, featureName),
    );
}

async function controlBot(action: "power" | "restart"): Promise<void> {
    const headers = await authHeaders();
    if (!headers) return;
    const endpoint = action === "restart" ? "restart" : botIsOnline.value ? "stop" : "start";
    botActionBusy.value = true;
    try {
        const response = await fetch(`${API_BASE_URL}/api/bots/${botId.value}/${endpoint}`, { method: "POST", headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        notify("success", "อัปเดตสถานะบอทแล้ว", `${botName.value}: ${endpoint}`);
        await loadBot();
    } catch {
        notify("error", "สั่งบอทไม่สำเร็จ", "กรุณาตรวจสอบ Runtime แล้วลองใหม่อีกครั้ง");
    } finally {
        botActionBusy.value = false;
    }
}

function openSettingSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveBotSettings(payload: CreateBotPayload): Promise<void> {
    if (!payload.name.trim()) {
        notify("error", "กรุณาตั้งชื่อบอท");
        return;
    }
    const headers = await authHeaders();
    if (!headers) return;
    isSavingBot.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/bots/${botId.value}`, {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setMainView("main");
        notify("success", "บันทึกการตั้งค่าบอทแล้ว", "ถ้าบอทกำลังรันอยู่ ให้ restart เพื่อใช้ค่าใหม่");
        await loadBot();
    } catch {
        notify("error", "บันทึกไม่สำเร็จ", "ชื่อบอทอาจซ้ำ — ลองใหม่อีกครั้ง");
    } finally {
        isSavingBot.value = false;
    }
}

function confirmSaveBotSettings(payload: CreateBotPayload): void {
    requestConfirmation(
        "Save bot configuration?",
        "Confirm that you want to update this bot's Discord configuration.",
        "Save",
        "default",
        () => saveBotSettings(payload),
    );
}

async function loadRuntime(): Promise<void> {
    const headers = await authHeaders();
    if (!headers) return;
    try {
        const [subscriptionResponse, nodesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/subscriptions/runtime`, { headers }),
            fetch(`${API_BASE_URL}/api/runtime/vps`, { headers }),
        ]);
        if (!subscriptionResponse.ok) return;
        const subs = (await subscriptionResponse.json()) as RuntimeSubscription[];
        runtimeSub.value = subs.find((s) => s.externalSubjectId === botId.value) ?? null;
        if (nodesResponse.ok) runtimeNodes.value = (await nodesResponse.json()) as RuntimeVpsNode[];
    } catch { /* non-blocking */ }
}

async function removeRuntime(): Promise<void> {
    const sub = runtimeSub.value;
    if (!sub) return;
    const headers = await authHeaders();
    if (!headers) return;
    runtimeBusy.value = true;
    try {
        const response = await fetch(`${API_BASE_URL}/api/runtime/${sub.id}/assign`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ externalSubjectId: null }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        notify("success", "นำ Runtime ออกจากบอทแล้ว", "Runtime ยังอยู่ใน My Bot และสามารถนำไปใช้กับบอทอื่นได้");
        setMainView("main");
        await Promise.all([loadRuntime(), loadBot()]);
    } catch {
        notify("error", "นำ Runtime ออกไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    } finally {
        runtimeBusy.value = false;
    }
}

function confirmRemoveRuntime(): void {
    requestConfirmation(
        "Remove Runtime?",
        "This bot will lose its assigned Runtime and can no longer stay online.",
        "Remove Runtime",
        "danger",
        removeRuntime,
    );
}

async function setAutoRenew(value: boolean): Promise<void> {
    const sub = runtimeSub.value;
    if (!sub) return;
    const headers = await authHeaders();
    if (!headers) return;
    runtimeBusy.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/subscriptions/runtime/${sub.id}/auto-renew`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ autoRenew: value }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        notify("success", value ? "เปิดต่ออัตโนมัติแล้ว" : "ปิดต่ออัตโนมัติแล้ว",
            value ? "ระบบจะตัดเครดิตต่ออายุให้เมื่อใกล้หมด" : "บอทจะหยุดเมื่อ runtime หมดอายุ");
        await loadRuntime();
    } catch {
        notify("error", "อัปเดตไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    } finally {
        runtimeBusy.value = false;
    }
}

async function renewRuntime(): Promise<void> {
    const sub = runtimeSub.value;
    if (!sub) return;
    const headers = await authHeaders();
    if (!headers) return;
    runtimeBusy.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/subscriptions/runtime/${sub.id}/renew`, {
            method: "POST",
            headers,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        notify("success", "ต่ออายุ Runtime แล้ว", "ตัดเครดิตและขยายเวลาเรียบร้อย");
        window.dispatchEvent(new Event("fujipp:wallet-balance-changed"));
        await Promise.all([loadRuntime(), loadBot()]);
    } catch {
        notify("error", "ต่ออายุไม่สำเร็จ", "เครดิตอาจไม่พอ — ลองเติมเงินก่อน");
    } finally {
        runtimeBusy.value = false;
    }
}

async function loadConfig(): Promise<void> {
    isLoading.value = true;
    configError.value = "";
    try {
        const headers = await authHeaders();
        if (!headers) {
            configError.value = "กรุณาเข้าสู่ระบบก่อนตั้งค่าบอท";
            return;
        }
        const res = await fetch(`${API_BASE_URL}/api/bots/${botId.value}/config`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as BotConfigResponse;
        features.value = data.features ?? [];
        values.value = data.values ?? {};
        channels.value = data.channels ?? [];
        roles.value = data.roles ?? [];
    } catch {
        features.value = [];
        values.value = {};
        channels.value = [];
        roles.value = [];
        configError.value = "โหลดการตั้งค่าบอทไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
        notify("error", "โหลดการตั้งค่าไม่สำเร็จ", "ระบบไม่สามารถดึง config ของบอทนี้ได้");
    } finally {
        isLoading.value = false;
    }
}

async function saveFeature(payload: Record<string, string>): Promise<void> {
    isSaving.value = true;
    try {
        const headers = await authHeaders();
        if (!headers) {
            notify("error", "กรุณาเข้าสู่ระบบก่อน");
            return;
        }
        const res = await fetch(`${API_BASE_URL}/api/bots/${botId.value}/config`, {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ values: payload }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        values.value = { ...values.value, ...payload };
        notify("success", "บันทึกการตั้งค่าแล้ว");
    } catch {
        notify("error", "บันทึกไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    } finally {
        isSaving.value = false;
    }
}

function confirmSaveFeature(payload: Record<string, string>): void {
    requestConfirmation(
        "Save feature configuration?",
        `Confirm changes to ${activeFeature.value?.name || "this feature"}.`,
        "Save",
        "default",
        () => saveFeature(payload),
    );
}

async function loadEmbedFeatures(): Promise<void> {
    const headers = await authHeaders();
    if (!headers) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/bots/${botId.value}/embeds`, { headers });
        if (!res.ok) return;
        const slots = (await res.json()) as { featureCode: string }[];
        embedFeatureCodes.value = new Set(slots.map((s) => s.featureCode));
    } catch { /* non-blocking — Embed Setting just stays hidden */ }
}

// Continue the Package setting flow inline, scoped to the active feature's embed slots.
function openEmbedDesigner(): void {
    setMainView("embed-setting");
}

// ── review-credit counter (shop.review_credit_state) ─────────────────────────
const hasReviewCredit = computed(() => features.value.some((f) => f.code === REVIEW_CREDIT));
const reviewCount = ref<number | null>(null);
const reviewCounted = ref(false);
const reviewCountInput = ref("");
const reviewCountBusy = ref(false);

async function loadReviewCount(): Promise<void> {
    const headers = await authHeaders();
    if (!headers) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/bots/${botId.value}/review-credit/count`, { headers });
        if (!res.ok) return;
        const data = await res.json() as { count: number; counted: boolean };
        reviewCount.value = data.count;
        reviewCounted.value = data.counted;
    } catch { /* non-blocking */ }
}

async function saveReviewCount(): Promise<void> {
    const headers = await authHeaders();
    if (!headers) return;
    const n = Number(reviewCountInput.value);
    if (!Number.isInteger(n) || n < 0) {
        notify("error", "ใส่ตัวเลขให้ถูกต้อง", "ตัวเลข credit ต้องเป็นจำนวนเต็ม ≥ 0");
        return;
    }
    reviewCountBusy.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/bots/${botId.value}/review-credit/count`, {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ count: n }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { count: number; counted: boolean };
        reviewCount.value = data.count;
        reviewCounted.value = data.counted;
        reviewCountInput.value = "";
        notify("success", "ตั้งตัวเลข credit แล้ว", "ชื่อห้องจะอัปเดตเมื่อมีรีวิวข้อความถัดไป");
    } catch {
        notify("error", "ตั้งตัวเลขไม่สำเร็จ", "ยังไม่ได้ตั้งห้องรีวิว หรือลองใหม่อีกครั้ง");
    } finally {
        reviewCountBusy.value = false;
    }
}

async function recountReview(): Promise<void> {
    const headers = await authHeaders();
    if (!headers) return;
    reviewCountBusy.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/bots/${botId.value}/review-credit/recount`, {
            method: "POST",
            headers,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        notify("success", "กำลังนับทั้งห้องใหม่…", "บอทกำลัง restart และนับข้อความทั้งหมด รอสักครู่แล้วรีเฟรช");
        reviewCount.value = null;
        reviewCounted.value = false;
        // Give the bot a moment to restart + count, then refresh.
        setTimeout(loadReviewCount, 6000);
    } catch {
        notify("error", "สั่งนับใหม่ไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    } finally {
        reviewCountBusy.value = false;
    }
}

onMounted(async () => {
    await userStore.initAuth();
    if (!userStore.isAuthenticated) {
        await router.push({ name: "login", query: { redirect: route.fullPath } });
        return;
    }
    await Promise.all([loadConfig(), loadBot(), loadRuntime(), loadEmbedFeatures(), loadPackageAssignments()]);
    if (hasReviewCredit.value) await loadReviewCount();
});
</script>

<template>
    <div :class="$style.botConfig">
        <main :class="$style.content">
            <section :class="$style.hero" aria-labelledby="bot-config-title">
                <div :class="$style.heroCopy">
                    <h1 id="bot-config-title" :class="$style.pageTitle" class="type-h1-page-title-eb">Bot setting</h1>
                </div>

                <div :class="$style.heroActions">
                    <PrimaryButton width-mode="hug" :leading-icon="icons.directionLeft" @click="handleBack">
                        Back
                    </PrimaryButton>
                </div>
            </section>

            <section :class="$style.botSummary" aria-label="Bot status and controls">
                <div :class="$style.botIdentity">
                    <img v-if="botAvatarUrl && !botAvatarFailed" :class="$style.botAvatar" :src="botAvatarUrl" :alt="`${botName} avatar`" @error="botAvatarFailed = true">
                    <div v-else :class="[$style.botAvatar, $style.botAvatarFallback]" aria-hidden="true">
                        {{ (botName || 'B').slice(0, 1).toUpperCase() }}
                    </div>
                    <div :class="$style.botCopy">
                        <h2 class="type-h3-card-title-eb">{{ botName || "Untitled bot" }}</h2>
                        <span :class="[$style.botStatus, botIsOnline ? $style.botOnline : $style.botOffline]">
                            {{ botIsOnline ? "online" : "offline" }}
                        </span>
                        <p :class="$style.botRuntime" class="type-body-small-r">
                            <CountdownTimer v-if="botRuntimeUntil" :until="botRuntimeUntil" />
                            <strong v-else>No Runtime</strong>
                        </p>
                    </div>
                </div>
                <div :class="$style.botControls">
                    <SecondaryButton width-mode="fixed" :leading-icon="botIsOnline ? icons.pause : icons.play" :disabled="botActionBusy" @click="controlBot('power')">
                        {{ botIsOnline ? "Stop" : "Start" }}
                    </SecondaryButton>
                    <SecondaryButton width-mode="fixed" :leading-icon="icons.restart" :disabled="botActionBusy" @click="controlBot('restart')">
                        Restart
                    </SecondaryButton>
                </div>
            </section>

            <template v-if="activeMainView === 'main'">
            <section :class="$style.settingMenu" aria-labelledby="main-setting-title">
                <h2 id="main-setting-title" class="type-body-main-sb">Main</h2>
                <div :class="$style.settingGrid">
                    <button type="button" :class="$style.settingCard" @click="openBotConfig">
                        <span :class="$style.settingCardIcon" :style="iconMaskStyle(icons.discord)" aria-hidden="true" />
                        <span>Bot config</span>
                    </button>
                    <button type="button" :class="$style.settingCard" @click="openRuntimeSetting">
                        <span :class="$style.settingCardIcon" :style="iconMaskStyle(icons.shopTime)" aria-hidden="true" />
                        <span>Runtime setting</span>
                    </button>
                    <button type="button" :class="$style.settingCard" @click="openPackageSetting">
                        <span :class="$style.settingCardIcon" :style="iconMaskStyle(icons.package)" aria-hidden="true" />
                        <span>Package setting</span>
                    </button>
                    <button type="button" :class="$style.settingCard" @click="openCoreFeatures">
                        <span :class="$style.settingCardIcon" :style="iconMaskStyle(icons.featureFlag)" aria-hidden="true" />
                        <span>Core features</span>
                    </button>
                </div>
            </section>

            <section v-if="false" :class="$style.sectionHeading" aria-labelledby="advanced-setting-title">
                <div>
                    <span :class="$style.eyebrow" class="type-overline-sb">Advanced setup</span>
                    <h2 id="advanced-setting-title" class="type-h2-section-title-sb">Configuration</h2>
                </div>
                <SecondaryButton width-mode="hug" :leading-icon="icons.edit" @click="openBotConfig">
                    Edit bot
                </SecondaryButton>
            </section>

            <section v-if="false" :class="$style.workspace" aria-label="Bot configuration workspace">
                <aside :class="$style.sidePanel" aria-label="Bot and feature navigation">
                    <div :class="$style.panelSection">
                        <div :class="$style.panelHeader">
                            <span :class="$style.panelIcon" :style="iconMaskStyle(icons.setting)" aria-hidden="true" />
                            <h2 class="type-body-main-sb">Bot Setting</h2>
                        </div>
                        <dl :class="$style.identityList">
                            <div>
                                <dt>Name</dt>
                                <dd>{{ botInitial.name || "—" }}</dd>
                            </div>
                            <div>
                                <dt>Application ID</dt>
                                <dd>{{ botInitial.discordApplicationId || "—" }}</dd>
                            </div>
                            <div>
                                <dt>Guild ID</dt>
                                <dd>{{ botInitial.discordGuildId || "—" }}</dd>
                            </div>
                            <div>
                                <dt>Secret</dt>
                                <dd>Stored securely</dd>
                            </div>
                        </dl>
                    </div>

                    <div :class="$style.panelSection">
                        <div :class="$style.panelHeader">
                            <span :class="$style.panelIcon" :style="iconMaskStyle(icons.featureFlag)" aria-hidden="true" />
                            <h2 class="type-body-main-sb">Features</h2>
                        </div>

                        <p v-if="isLoading" :class="$style.state" class="type-body-small-r">กำลังโหลด…</p>
                        <div v-else-if="configError" :class="$style.statePanel" aria-live="polite">
                            <strong>โหลดการตั้งค่าไม่สำเร็จ</strong>
                            <span>{{ configError }}</span>
                            <SecondaryButton width-mode="hug" :leading-icon="icons.restart" @click="loadConfig">
                                Retry
                            </SecondaryButton>
                        </div>
                        <p v-else-if="features.length === 0" :class="$style.state" class="type-body-small-r">
                            ยังไม่มีฟีเจอร์ที่เปิดใช้งาน
                        </p>

                        <div v-else :class="$style.featureNav" role="tablist" aria-label="ฟีเจอร์ที่เปิดใช้งาน">
                            <button
                                v-for="feature in features"
                                :key="feature.code"
                                type="button"
                                role="tab"
                                :aria-selected="feature.code === activeFeatureCode"
                                :class="[$style.featureTab, feature.code === activeFeatureCode ? $style.featureTabActive : '']"
                                @click="activeFeatureCode = feature.code"
                            >
                                <span :class="$style.featureIcon" :style="iconMaskStyle(icons.featureFlag)" aria-hidden="true" />
                                <span :class="$style.featureCopy">
                                    <strong>{{ feature.name }}</strong>
                                    <span>{{ featureFieldProgress(feature) }} fields</span>
                                </span>
                            </button>
                        </div>
                    </div>

                    <div id="runtime-setting" :class="[$style.panelSection, $style.scrollTarget]">
                        <div :class="$style.panelHeader">
                            <span :class="$style.panelIcon" :style="iconMaskStyle(icons.shopTime)" aria-hidden="true" />
                            <h2 class="type-body-main-sb">Runtime</h2>
                        </div>

                        <template v-if="runtimeSub">
                            <p :class="$style.runtimeRemaining">
                                <CountdownTimer :until="runtimeSub.currentPeriodEnd" />
                            </p>
                            <span :class="$style.metricHint">ต่ออายุ {{ renewPrice }} บาท</span>
                            <label :class="$style.autoRenew">
                                <input
                                    type="checkbox"
                                    :checked="runtimeSub.autoRenew"
                                    :disabled="runtimeBusy"
                                    @change="setAutoRenew(($event.target as HTMLInputElement).checked)"
                                >
                                <span>Auto renew</span>
                            </label>
                            <SecondaryButton
                                width-mode="fill"
                                :disabled="runtimeBusy"
                                :leading-icon="icons.shopRenew"
                                @click="renewRuntime"
                            >
                                {{ runtimeBusy ? "Renewing…" : "Renew now" }}
                            </SecondaryButton>
                        </template>
                        <p v-else :class="$style.state" class="type-body-small-r">
                            ซื้อ runtime ในหน้า Package ก่อนเปิดบอทออนไลน์
                        </p>
                    </div>
                </aside>

                <div id="package-setting" :class="[$style.mainPanel, $style.scrollTarget]">
                    <span id="permission-setting" :class="$style.scrollAnchor" aria-hidden="true" />
                    <header :class="$style.formHeader">
                        <div>
                            <span :class="$style.eyebrow" class="type-overline-sb">
                                Feature {{ activeFeatureIndex + 1 > 0 ? activeFeatureIndex + 1 : "—" }}
                            </span>
                            <h2 class="type-h2-section-title-sb">{{ activeFeature?.name || "Feature Setting" }}</h2>
                            <p class="type-body-small-r">
                                {{ activeFeature ? `${featureFieldProgress(activeFeature)} fields configured` : "เลือกฟีเจอร์เพื่อเริ่มตั้งค่า" }}
                            </p>
                        </div>

                        <PrimaryButton
                            v-if="activeFeatureHasEmbed && activeFeature"
                            width-mode="hug"
                            :leading-icon="icons.comment"
                            @click="openEmbedDesigner"
                        >
                            Embed Setting
                        </PrimaryButton>
                    </header>

                    <div v-if="isLoading" :class="$style.emptyPanel" class="type-body-small-r">กำลังโหลด…</div>
                    <div v-else-if="configError" :class="$style.emptyPanel" aria-live="polite">
                        <span :class="$style.emptyIcon" :style="iconMaskStyle(icons.warning)" aria-hidden="true" />
                        <strong>โหลดการตั้งค่าไม่สำเร็จ</strong>
                        <p>{{ configError }}</p>
                        <SecondaryButton width-mode="hug" :leading-icon="icons.restart" @click="loadConfig">
                            Retry
                        </SecondaryButton>
                    </div>
                    <div v-else-if="features.length === 0" :class="$style.emptyPanel">
                        <span :class="$style.emptyIcon" :style="iconMaskStyle(icons.package)" aria-hidden="true" />
                        <strong>ยังไม่มีฟีเจอร์</strong>
                        <p>ซื้อฟีเจอร์ในหน้า Package แล้วกลับมาตั้งค่าที่นี่</p>
                    </div>

                    <template v-else>
                        <RobloxRobuxConfigForm
                            v-if="activeFeature && activeFeature.code === ROBLOX_ROBUX_PAYOUT"
                            :key="activeFeature.code"
                            :feature="activeFeature"
                            :model-value="values"
                            :channel-options="channelOptions"
                            :saving="isSaving"
                            @submit="confirmSaveFeature"
                        />
                        <FeatureConfigForm
                            v-else-if="activeFeature"
                            :key="activeFeature.code"
                            :feature="activeFeature"
                            :model-value="values"
                            :channel-options="channelOptions"
                            :role-options="roleOptions"
                            :saving="isSaving"
                            @submit="confirmSaveFeature"
                        />
                    </template>

                    <section v-if="activeFeature?.code === REVIEW_CREDIT" :class="$style.utilityCard">
                        <div :class="$style.panelHeader">
                            <span :class="$style.panelIcon" :style="iconMaskStyle(icons.shopStar)" aria-hidden="true" />
                            <h3 class="type-body-main-sb">Review Credit</h3>
                        </div>
                        <p :class="$style.cardLead">
                            ตัวนับปัจจุบัน: <strong :class="$style.countValue">{{ reviewCount ?? "—" }}</strong>
                            <span v-if="reviewCount !== null && !reviewCounted"> · ยังไม่ได้นับทั้งห้อง</span>
                        </p>
                        <div :class="$style.countRow">
                            <input
                                v-model="reviewCountInput"
                                type="number"
                                min="0"
                                inputmode="numeric"
                                :class="$style.countInput"
                                placeholder="ตั้งตัวเลข credit"
                                aria-label="ตั้งตัวเลข credit"
                            >
                            <PrimaryButton width-mode="hug" :disabled="reviewCountBusy" :leading-icon="icons.save" @click="saveReviewCount">
                                ตั้งตัวเลข
                            </PrimaryButton>
                            <SecondaryButton width-mode="hug" :disabled="reviewCountBusy" :leading-icon="icons.restart" @click="recountReview">
                                {{ reviewCountBusy ? "…" : "นับทั้งห้องใหม่" }}
                            </SecondaryButton>
                        </div>
                    </section>
                </div>
            </section>
            </template>

            <template v-else-if="activeMainView === 'bot-config'">
                <nav :class="$style.settingBreadcrumb" class="type-caption-sb" aria-label="Bot setting breadcrumb">
                    <button :class="$style.breadcrumbLink" type="button" @click="setMainView('main')">Main</button>
                    <span :class="$style.breadcrumbTrail">
                        <span aria-hidden="true">&gt;</span>
                        <span>Bot config</span>
                    </span>
                </nav>

                <section :class="$style.botConfigFormCard" aria-labelledby="inline-bot-config-title">
                    <h2 id="inline-bot-config-title" class="type-h2-section-title-sb">Bot config</h2>
                    <form :class="$style.botConfigFields" @submit.prevent="confirmSaveBotSettings({ ...botConfigForm })">
                        <TextField v-model="botConfigForm.name" label="Bot Name" required placeholder="ชื่อบอท" :disabled="isSavingBot" />
                        <TextField v-model="botConfigForm.discordToken" label="Bot Token (Leave blank to keep current)" type="password" placeholder="••••••••••••••••••••••" :disabled="isSavingBot" />
                        <TextField v-model="botConfigForm.discordApplicationId" label="Application ID (Client ID)" placeholder="Application ID" :disabled="isSavingBot" />
                        <TextField v-model="botConfigForm.discordGuildId" label="Server ID (Guild)" placeholder="Server ID" :disabled="isSavingBot" />
                        <TextField v-model="botConfigForm.discordPublicKey" label="Public Key" placeholder="Public Key" :disabled="isSavingBot" />
                        <TextField v-model="botConfigForm.discordClientSecret" label="Client Secret (Leave blank to keep current)" type="password" placeholder="••••••••••••••••••••••" :disabled="isSavingBot" />
                        <div :class="$style.botConfigFormActions">
                            <PrimaryButton type="button" width-mode="fixed" :leading-icon="icons.directionLeft" :disabled="isSavingBot" @click="setMainView('main')">
                                Cancel
                            </PrimaryButton>
                            <PrimaryButton type="submit" width-mode="fixed" :leading-icon="icons.save" :disabled="isSavingBot || !botConfigForm.name.trim()">
                                {{ isSavingBot ? "Saving…" : "Save" }}
                            </PrimaryButton>
                        </div>
                    </form>
                </section>
            </template>

            <template v-else-if="activeMainView === 'runtime-setting'">
                <nav :class="$style.settingBreadcrumb" class="type-caption-sb" aria-label="Bot setting breadcrumb">
                    <button :class="$style.breadcrumbLink" type="button" @click="setMainView('main')">Main</button>
                    <span :class="$style.breadcrumbTrail">
                        <span aria-hidden="true">&gt;</span>
                        <span>Runtime setting</span>
                    </span>
                </nav>

                <section :class="$style.runtimeSettingCard" aria-labelledby="runtime-setting-title">
                    <template v-if="runtimeSub">
                        <span :class="$style.runtimeServerIcon" :style="iconMaskStyle(icons.shopServer)" aria-hidden="true" />
                        <h2 id="runtime-setting-title" class="type-body-main-sb">{{ runtimeSlotLabel }}</h2>
                        <p :class="$style.runtimeExpiry" class="type-body-small-r">
                            <strong>Expired in:</strong>
                            <CountdownTimer :until="runtimeSub.currentPeriodEnd" />
                        </p>
                        <div :class="$style.runtimeAutoRenew">
                            <ToggleSwitch
                                :model-value="runtimeSub.autoRenew"
                                :disabled="runtimeBusy"
                                aria-label="Auto renew Runtime"
                                @update:model-value="setAutoRenew"
                            />
                            <span class="type-body-main-sb">Auto renew</span>
                        </div>
                        <div :class="$style.runtimeSettingActions">
                            <PrimaryButton width-mode="fixed" fixed-width="var(--spacing-space-64)" :leading-icon="icons.directionLeft" :disabled="runtimeBusy" @click="setMainView('main')">
                                Back
                            </PrimaryButton>
                            <PrimaryButton width-mode="fixed" fixed-width="var(--spacing-space-64)" :leading-icon="icons.delete" :disabled="runtimeBusy" @click="confirmRemoveRuntime">
                                Remove Runtime
                            </PrimaryButton>
                            <PrimaryButton width-mode="fixed" fixed-width="var(--spacing-space-64)" :leading-icon="icons.shopRenew" :disabled="runtimeBusy" @click="renewRuntime">
                                {{ runtimeBusy ? "Processing…" : `Renew ${renewPrice} THB` }}
                            </PrimaryButton>
                        </div>
                    </template>
                    <template v-else>
                        <span :class="$style.runtimeServerIcon" :style="iconMaskStyle(icons.shopServer)" aria-hidden="true" />
                        <h2 id="runtime-setting-title" class="type-body-main-sb">No Runtime</h2>
                        <p :class="$style.runtimeExpiry" class="type-body-small-r">เลือก Runtime จากหน้า My Bot เพื่อเปิดใช้งานบอท</p>
                        <PrimaryButton width-mode="fixed" :leading-icon="icons.directionLeft" @click="setMainView('main')">Back</PrimaryButton>
                    </template>
                </section>
            </template>

            <template v-else-if="activeMainView === 'package-setting'">
                <nav :class="$style.settingBreadcrumb" class="type-caption-sb" aria-label="Bot setting breadcrumb">
                    <button :class="$style.breadcrumbLink" type="button" @click="setMainView('main')">Main</button>
                    <span :class="[$style.breadcrumbTrail, $style.packageBreadcrumbBase]">
                        <span aria-hidden="true">&gt;</span>
                        <span>Package setting</span>
                    </span>
                </nav>

                <section :class="$style.packageSettingTable" aria-labelledby="package-setting-title">
                    <h2 id="package-setting-title" :class="$style.visuallyHidden">Packages assigned to this bot</h2>
                    <div :class="$style.packageTableScroll">
                        <table>
                            <colgroup>
                                <col :class="$style.packageNumberColumn">
                                <col :class="$style.packageNameColumn">
                                <col>
                                <col :class="$style.packageActionColumn">
                            </colgroup>
                            <thead>
                                <tr><th>No</th><th>Name</th><th>Description</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                <tr v-for="(row, index) in packageRows" :key="row.feature.code">
                                    <td>{{ index + 1 }}</td>
                                    <td>{{ row.feature.name }}</td>
                                    <td>{{ row.description }}</td>
                                    <td>
                                        <div :class="$style.packageActions">
                                            <PrimaryButton width-mode="fixed" :leading-icon="icons.setting" @click="openPackageFeature(row.feature.code)">
                                                Setting
                                            </PrimaryButton>
                                            <PrimaryButton
                                                width-mode="fixed"
                                                :leading-icon="icons.delete"
                                                :disabled="!row.subscriptionId || packageBusyId === row.subscriptionId"
                                                @click="confirmRemovePackage(row.subscriptionId, row.feature.name)"
                                            >
                                                {{ packageBusyId === row.subscriptionId ? "Removing…" : "Remove" }}
                                            </PrimaryButton>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="!isLoading && packageRows.length === 0">
                                    <td colspan="4" :class="$style.packageEmpty">No package found.</td>
                                </tr>
                                <tr v-else-if="isLoading">
                                    <td colspan="4" :class="$style.packageEmpty">Loading packages…</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </template>

            <template v-else-if="activeMainView === 'package-feature'">
                <nav :class="$style.settingBreadcrumb" class="type-caption-sb" aria-label="Bot setting breadcrumb">
                    <button :class="$style.breadcrumbLink" type="button" @click="setMainView('main')">Main</button>
                    <span :class="$style.packageBreadcrumbBase">
                        <span aria-hidden="true">&gt;</span>
                        <button :class="$style.breadcrumbLink" type="button" @click="setMainView('package-setting')">Package setting</button>
                    </span>
                    <span :class="$style.breadcrumbFeatureTrail">
                        <span aria-hidden="true">&gt;</span>
                        <span>{{ activeFeature?.name || "Feature" }}</span>
                    </span>
                </nav>

                <section :class="$style.packageFeatureCard" :aria-label="`${activeFeature?.name || 'Feature'} settings`">
                    <div v-if="!activeFeature" :class="$style.packageEmpty">Feature not found.</div>
                    <RobloxRobuxConfigForm
                        v-else-if="activeFeature.code === ROBLOX_ROBUX_PAYOUT"
                        :key="activeFeature.code"
                        :feature="activeFeature"
                        :model-value="values"
                        :channel-options="channelOptions"
                        :saving="isSaving"
                        submit-fixed-width="var(--spacing-space-64)"
                        :submit-icon="icons.save"
                        submit-label="Save"
                        submit-width-mode="fixed"
                        @submit="confirmSaveFeature"
                    >
                        <template #actions>
                            <PrimaryButton width-mode="fixed" fixed-width="var(--spacing-space-64)" :leading-icon="icons.directionLeft" :disabled="isSaving" @click="setMainView('package-setting')">Cancel</PrimaryButton>
                            <PrimaryButton width-mode="fixed" fixed-width="var(--spacing-space-64)" :leading-icon="icons.edit" :disabled="isSaving" @click="openEmbedDesigner">Embed setting</PrimaryButton>
                        </template>
                    </RobloxRobuxConfigForm>
                    <FeatureConfigForm
                        v-else-if="activeFeature"
                        :key="activeFeature.code"
                        :feature="activeFeature"
                        :model-value="values"
                        :channel-options="channelOptions"
                        :role-options="roleOptions"
                        :saving="isSaving"
                        submit-fixed-width="var(--spacing-space-64)"
                        :submit-icon="icons.save"
                        submit-label="Save"
                        submit-width-mode="fixed"
                        @submit="confirmSaveFeature"
                    >
                        <template #actions>
                            <PrimaryButton width-mode="fixed" fixed-width="var(--spacing-space-64)" :leading-icon="icons.directionLeft" :disabled="isSaving" @click="setMainView('package-setting')">Cancel</PrimaryButton>
                            <PrimaryButton width-mode="fixed" fixed-width="var(--spacing-space-64)" :leading-icon="icons.edit" :disabled="isSaving" @click="openEmbedDesigner">Embed setting</PrimaryButton>
                        </template>
                    </FeatureConfigForm>
                </section>
            </template>

            <template v-else-if="activeMainView === 'core-features'">
                <nav :class="$style.settingBreadcrumb" class="type-caption-sb" aria-label="Bot setting breadcrumb">
                    <button :class="$style.breadcrumbLink" type="button" @click="setMainView('main')">Main</button>
                    <span :class="$style.breadcrumbTrail">
                        <span aria-hidden="true">&gt;</span>
                        <span>Core features</span>
                    </span>
                </nav>

                <section :class="[$style.packageSettingTable, $style.coreFeaturesPanel]" aria-labelledby="core-features-title">
                    <h2 id="core-features-title" :class="$style.visuallyHidden">Features included with every bot</h2>
                    <div :class="$style.packageTableScroll">
                        <table>
                            <colgroup>
                                <col :class="$style.packageNumberColumn">
                                <col :class="$style.packageNameColumn">
                                <col>
                                <col :class="$style.packageActionColumn">
                            </colgroup>
                            <thead>
                                <tr><th>No</th><th>Name</th><th>Description</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                <tr v-for="(row, index) in coreFeatureRows" :key="row.feature.code">
                                    <td>{{ index + 1 }}</td>
                                    <td>{{ row.feature.name }}</td>
                                    <td>{{ row.description }}</td>
                                    <td>
                                        <div :class="$style.packageActions">
                                            <PrimaryButton width-mode="fixed" :leading-icon="icons.setting" @click="openCoreFeature(row.feature.code)">
                                                Setting
                                            </PrimaryButton>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="!isLoading && coreFeatureRows.length === 0">
                                    <td colspan="4" :class="$style.packageEmpty">No core features found.</td>
                                </tr>
                                <tr v-else-if="isLoading">
                                    <td colspan="4" :class="$style.packageEmpty">Loading core features…</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </template>

            <template v-else-if="activeMainView === 'core-feature'">
                <nav :class="$style.settingBreadcrumb" class="type-caption-sb" aria-label="Bot setting breadcrumb">
                    <button :class="$style.breadcrumbLink" type="button" @click="setMainView('main')">Main</button>
                    <span :class="$style.packageBreadcrumbBase">
                        <span aria-hidden="true">&gt;</span>
                        <button :class="$style.breadcrumbLink" type="button" @click="setMainView('core-features')">Core features</button>
                    </span>
                    <span :class="$style.breadcrumbFeatureTrail">
                        <span aria-hidden="true">&gt;</span>
                        <span>{{ activeFeature?.name || "Feature" }}</span>
                    </span>
                </nav>

                <section :class="[$style.packageFeatureCard, $style.coreFeaturesPanel]" :aria-label="`${activeFeature?.name || 'Core feature'} settings`">
                    <div v-if="!activeFeature" :class="$style.packageEmpty">Feature not found.</div>
                    <FeatureConfigForm
                        v-else
                        :key="activeFeature.code"
                        :feature="activeFeature"
                        :model-value="values"
                        :channel-options="channelOptions"
                        :role-options="roleOptions"
                        :saving="isSaving"
                        submit-fixed-width="var(--spacing-space-64)"
                        :submit-icon="icons.save"
                        submit-label="Save"
                        submit-width-mode="fixed"
                        @submit="confirmSaveFeature"
                    >
                        <template #actions>
                            <PrimaryButton width-mode="fixed" fixed-width="var(--spacing-space-64)" :leading-icon="icons.directionLeft" :disabled="isSaving" @click="setMainView('core-features')">Cancel</PrimaryButton>
                        </template>
                    </FeatureConfigForm>
                </section>
            </template>

            <template v-else-if="activeMainView === 'embed-setting'">
                <nav :class="$style.settingBreadcrumb" class="type-caption-sb" aria-label="Embed setting breadcrumb">
                    <button :class="$style.breadcrumbLink" type="button" @click="setMainView('main')">Main</button>
                    <span :class="$style.packageBreadcrumbBase">
                        <span aria-hidden="true">&gt;</span>
                        <button :class="$style.breadcrumbLink" type="button" @click="setMainView('package-setting')">Package setting</button>
                    </span>
                    <span :class="$style.packageBreadcrumbBase">
                        <span aria-hidden="true">&gt;</span>
                        <button :class="$style.breadcrumbLink" type="button" @click="setMainView('package-feature')">{{ activeFeature?.name || "Feature" }}</button>
                    </span>
                    <span :class="$style.breadcrumbEmbedTrail">
                        <span aria-hidden="true">&gt;</span>
                        <span>Embed setting</span>
                    </span>
                </nav>

                <section :class="$style.embedSettingCard" :aria-label="`${activeFeature?.name || 'Feature'} Embed setting`">
                    <EmbedEditor
                        :bot-id="botId"
                        :feature-code="activeFeatureCode"
                        :preview-config-values="values"
                    />
                </section>
            </template>
        </main>

        <AppFooter />

        <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
            <StatusToast
                :status="toast.status"
                :title="toast.title"
                :description="toast.description"
                @close="toast = null"
            />
        </div>

        <ConfirmModal
            v-if="confirmation"
            :title="confirmation.title"
            :reason="confirmation.reason"
            :confirm-label="confirmation.confirmLabel"
            :variant="confirmation.variant"
            :disabled="confirmationBusy"
            @cancel="confirmation = null"
            @confirm="runConfirmedAction"
        />

    </div>
</template>

<style module>
.botConfig {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    box-sizing: border-box;
    padding-top: 73px;
    background: var(--color-main-background);
    color: var(--color-text-primary);
}

/* Bot setup is an operational workspace. In dark mode its fields should remain
   part of the workspace surface instead of switching to the public light input. */
:global(.dark) .botConfig,
:global([data-theme="dark"]) .botConfig {
    --color-input-background: var(--color-main-surface);
    --color-input-text: var(--color-text-primary);
    --color-input-border: var(--color-main-divider);
    --color-input-title: var(--color-text-secondary);
    --color-input-disabled: var(--color-button-secondary);
    --color-input-bg: var(--color-main-surface);
    --color-text-input: var(--color-text-primary);
    --color-input-placeholder: var(--color-text-secondary);
    --color-input-bg-disabled: var(--color-button-secondary);
    --color-input-border-hover: var(--color-text-secondary);
    --color-input-border-disabled: var(--color-main-divider);
}

.content {
    flex: 1;
    display: flex;
    min-width: 0;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-16) var(--spacing-space-8);
    gap: var(--spacing-space-6);
    transition: margin-left 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sidebarOpen {
    margin-left: 194px;
}

.sidebarClosed {
    margin-left: 44px;
}

.titleSection {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-1);
    width: 100%;
    max-width: 1180px;
    color: var(--color-text-primary);
}

.pageTitle {
    margin: 0;
}

.subtitle {
    margin: 0;
    color: var(--color-text-secondary);
}

.divider {
    margin-top: var(--spacing-space-4);
    height: 1px;
    background-color: var(--color-input-border);
}

.setupPanel {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-3);
    width: 100%;
    max-width: 1180px;
}

.setupItem {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--spacing-space-2);
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
}

.setupItem strong {
    font-size: 17px;
    line-height: 1.2;
}

.setupItem span:last-child {
    color: var(--color-text-secondary);
    font-size: 13px;
    line-height: 1.45;
}

.setupKicker {
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 800;
    line-height: 1;
    text-transform: uppercase;
}

.block {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    width: 100%;
    max-width: 1180px;
}

.blockTitle {
    margin: 0;
}

.card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-5);
    padding: var(--spacing-space-6);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-2xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    box-shadow: none;
}

.cardLead {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 14px;
}

.cardDivider {
    height: 1px;
    background-color: var(--color-input-border);
}

.infoGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--spacing-space-4);
    margin: 0;
}

.infoItem {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-1);
    min-width: 0;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    background: var(--color-main-background);
}

.infoLabel {
    color: var(--color-text-secondary);
    font-size: 13px;
}

.infoValue {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cardActions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-space-3);
}

.primaryAction {
    height: 44px;
    padding: 0 var(--spacing-space-5);
    border: 1px solid var(--color-button-primary-btn-bg);
    border-radius: var(--radius-xl);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
}

.primaryAction:hover {
    border-color: var(--color-button-primary-btn-hover);
    background-color: var(--color-button-primary-btn-hover);
}

.primaryAction:active {
    border-color: var(--color-button-primary-btn-active);
    background-color: var(--color-button-primary-btn-active);
}

.primaryAction:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.primaryAction:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.countValue { color: var(--color-text-primary); font-weight: 800; }

.countRow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-space-3);
}

.countInput {
    box-sizing: border-box;
    width: 200px;
    height: 44px;
    padding: 0 var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    background: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
}

.countInput:focus-visible { outline: none; border-color: var(--color-main-primary); }

.secondaryAction {
    height: 44px;
    padding: 0 var(--spacing-space-5);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s ease;
}

.secondaryAction:hover { border-color: var(--color-main-primary); }
.secondaryAction:disabled { cursor: not-allowed; opacity: 0.55; }

.runtimeHead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-space-4);
}

.runtimeInfo {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-1);
}

.runtimeRemaining {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 28px;
    font-weight: 800;
    line-height: 1.1;
}

.renewPrice {
    align-self: center;
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
}

.autoRenew {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-space-2);
    color: var(--color-text-primary);
    font-size: 14px;
    cursor: pointer;
}

.autoRenew input {
    accent-color: var(--color-main-primary);
    cursor: pointer;
}

.tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-space-2);
}

.tab {
    height: 40px;
    padding: 0 var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-full);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.tab:hover {
    border-color: var(--color-main-primary);
}

.tab:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.tabActive {
    background-color: var(--color-main-primary);
    border-color: var(--color-main-primary);
    color: var(--color-button-primary-btn-text-active);
}

.state {
    color: var(--color-text-primary);
    opacity: 0.7;
}

.statePanel {
    display: flex;
    max-width: 680px;
    flex-direction: column;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
}

.stateTitle,
.stateText {
    margin: 0;
}

.stateTitle {
    font-size: 22px;
    font-weight: 600;
}

.stateText {
    color: var(--color-text-secondary);
    font-size: 16px;
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
    bottom: var(--spacing-space-5);
    right: var(--spacing-space-5);
    z-index: 60;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
}

/* iPad ≈ two columns for the info/settings grids handled by auto-fit above. */
@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-8) var(--spacing-space-4);
        gap: var(--spacing-space-6);
    }

    .sidebarOpen,
    .sidebarClosed {
        margin-left: 44px;
    }

    .card {
        padding: var(--spacing-space-4);
    }

    .toastRegion {
        bottom: var(--spacing-space-3);
        right: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}

@media (max-width: 980px) {
    .setupPanel {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 560px) {
    .setupPanel {
        grid-template-columns: 1fr;
    }
}

.content {
    --panel-shadow: none;

    width: 100%;
    max-width: var(--container-7xl);
    margin: 0 auto;
    transition: none;
}

.hero,
.overviewGrid,
.setupRail,
.workspace {
    width: 100%;
}

.hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-space-5);
}

.heroCopy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--spacing-space-1);
}

.eyebrow {
    color: var(--color-text-secondary);
    text-transform: uppercase;
}

.heroActions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--spacing-space-3);
}

.botSummary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-5);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.botIdentity,
.botControls,
.botCopy {
    display: flex;
}

.botIdentity {
    min-width: 0;
    align-items: center;
    gap: var(--spacing-space-3);
}

.botAvatar {
    width: 100px;
    height: 100px;
    flex: 0 0 100px;
    border-radius: var(--radius-xl);
    object-fit: cover;
}

.botAvatarFallback {
    display: grid;
    place-items: center;
    background: var(--gradient-card-highlight);
    color: var(--color-text-secondary);
    font-size: var(--type-size-h2-section-title);
    font-weight: 800;
}

.botCopy {
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-space-2);
}

.botCopy h2,
.botRuntime,
.settingMenu h2,
.sectionHeading h2 {
    margin: 0;
}

.botStatus {
    font-weight: 800;
    text-transform: lowercase;
}

.botOnline { color: var(--color-status-success); }
.botOffline { color: var(--color-status-error); }
.botRuntime { color: var(--color-text-secondary); }

.botControls {
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--spacing-space-2);
}

.settingMenu {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
}

.settingMenu h2 {
    font-size: var(--type-size-caption);
    font-weight: 600;
    line-height: normal;
}

.settingBreadcrumb {
    display: flex;
    align-items: center;
    margin: 0;
    gap: var(--spacing-space-1);
    color: var(--color-text-primary);
}

.breadcrumbLink {
    display: inline-block;
    box-sizing: border-box;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: inherit;
    text-decoration: none;
    cursor: pointer;
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
    opacity: 0;
    transform: translateX(calc(var(--spacing-space-3) * -1));
    animation: breadcrumb-trail-reveal 320ms cubic-bezier(.2, .8, .2, 1) 80ms forwards;
}

.packageBreadcrumbBase,
.breadcrumbFeatureTrail {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-space-1);
}

.breadcrumbEmbedTrail {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-space-1);
    opacity: 0;
    transform: translateX(calc(var(--spacing-space-3) * -1));
    animation: breadcrumb-trail-reveal 320ms cubic-bezier(.2, .8, .2, 1) 80ms forwards;
}

.embedSettingCard {
    --color-input-background: var(--color-main-background);
    --color-input-bg: var(--color-main-background);
    --color-input-text: var(--color-text-primary);
    --color-text-input: var(--color-text-primary);
    --color-input-title: var(--color-text-primary);
    --color-input-placeholder: var(--color-text-primary);
    --color-input-border: var(--color-main-divider);
    --color-input-border-hover: var(--color-main-primary);
    --color-input-border-focus: var(--color-main-primary);
    --color-input-bg-disabled: var(--color-main-background);
    --color-input-border-disabled: var(--color-main-divider);

    width: 100%;
    box-sizing: border-box;
    padding: var(--spacing-space-5);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    view-transition-name: package-setting-panel;
}

.packageBreadcrumbBase {
    view-transition-name: package-breadcrumb;
}

.breadcrumbFeatureTrail {
    opacity: 0;
    transform: translateX(calc(var(--spacing-space-3) * -1));
    animation: breadcrumb-trail-reveal 320ms cubic-bezier(.2, .8, .2, 1) 80ms forwards;
}

@keyframes breadcrumb-trail-reveal {
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.botConfigFormCard {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    gap: var(--spacing-space-5);
    padding: var(--spacing-space-6) var(--spacing-space-4);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    view-transition-name: bot-config-panel;
}

.botConfigFormCard h2 {
    width: min(100%, 480px);
    margin: 0;
    animation: bot-config-content-reveal 260ms 160ms both;
}

.botConfigFields {
    display: flex;
    width: min(100%, 480px);
    flex-direction: column;
    gap: var(--spacing-space-2);
    animation: bot-config-content-reveal 260ms 200ms both;
}

.botConfigFormActions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-space-2);
    padding-top: var(--spacing-space-2);
}

.settingGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-8);
}

.settingCard {
    display: flex;
    min-height: var(--spacing-space-64);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    font: inherit;
    cursor: pointer;
    transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
}

.settingCard:first-child {
    view-transition-name: bot-config-panel;
}

.settingCard:nth-child(2) {
    view-transition-name: runtime-setting-panel;
}

.settingCard:nth-child(3) {
    view-transition-name: package-setting-panel;
}

.settingCard:nth-child(4),
.coreFeaturesPanel {
    view-transition-name: core-features-panel;
}

@keyframes bot-config-content-reveal {
    from {
        opacity: 0;
        transform: translateY(var(--spacing-space-2));
    }
}

:global(::view-transition-group(bot-config-panel)) {
    z-index: 1;
    overflow: clip;
    border-radius: var(--radius-xl);
    animation-duration: 420ms;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

:global(::view-transition-group(runtime-setting-panel)) {
    z-index: 1;
    overflow: clip;
    border-radius: var(--radius-xl);
    animation-duration: 420ms;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

:global(::view-transition-group(package-setting-panel)) {
    z-index: 1;
    overflow: clip;
    border-radius: var(--radius-xl);
    animation-duration: 420ms;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

:global(::view-transition-group(core-features-panel)) {
    z-index: 1;
    overflow: clip;
    border-radius: var(--radius-xl);
    animation-duration: 420ms;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

:global(::view-transition-group(package-breadcrumb)) {
    z-index: 1;
    animation-duration: 320ms;
    animation-timing-function: cubic-bezier(.2, .8, .2, 1);
}

:global(::view-transition-group(app-navbar)) {
    z-index: 2;
    animation: none;
}

:global(::view-transition-old(app-navbar)),
:global(::view-transition-new(app-navbar)) {
    animation: none;
}

:global(::view-transition-old(bot-config-panel)),
:global(::view-transition-new(bot-config-panel)),
:global(::view-transition-old(runtime-setting-panel)),
:global(::view-transition-new(runtime-setting-panel)),
:global(::view-transition-old(package-setting-panel)),
:global(::view-transition-new(package-setting-panel)),
:global(::view-transition-old(core-features-panel)),
:global(::view-transition-new(core-features-panel)) {
    animation-duration: 420ms;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

.packageSettingTable,
.packageFeatureCard {
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    view-transition-name: package-setting-panel;
}

.packageSettingTable.coreFeaturesPanel,
.packageFeatureCard.coreFeaturesPanel {
    view-transition-name: core-features-panel;
}

.packageTableScroll {
    width: 100%;
    overflow: visible;
}

.packageSettingTable table {
    width: 100%;
    min-width: 760px;
    border-collapse: collapse;
    table-layout: fixed;
}

.packageSettingTable th,
.packageSettingTable td {
    padding: var(--spacing-space-3) var(--spacing-space-4);
    text-align: left;
    vertical-align: middle;
}

.packageSettingTable th {
    border-bottom: 1px solid var(--color-main-divider);
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-main);
    font-weight: 600;
}

.packageSettingTable tbody tr + tr td {
    border-top: 1px solid var(--color-main-divider);
}

.packageSettingTable td {
    color: var(--color-text-primary);
    font-size: var(--type-size-caption);
}

.packageNumberColumn { width: var(--spacing-space-16); }
.packageNameColumn { width: var(--spacing-space-64); }
.packageActionColumn { width: var(--spacing-space-80); }

.packageActions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--spacing-space-2);
}

.packageEmpty {
    height: var(--spacing-space-96);
    color: var(--color-text-secondary);
    text-align: center !important;
    font-weight: 300;
}

.packageFeatureCard {
    overflow: visible;
    padding: var(--spacing-space-3) var(--spacing-space-4);
}

.visuallyHidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
}

.runtimeSettingCard {
    display: flex;
    width: 100%;
    min-height: var(--spacing-space-96);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    gap: var(--spacing-space-2);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    text-align: center;
    view-transition-name: runtime-setting-panel;
}

.runtimeSettingCard h2,
.runtimeExpiry {
    margin: 0;
}

.runtimeServerIcon {
    width: var(--spacing-space-40);
    height: var(--spacing-space-40);
    background-color: var(--color-text-primary);
    mask: var(--icon-src) center / contain no-repeat;
    -webkit-mask: var(--icon-src) center / contain no-repeat;
}

.runtimeExpiry {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-space-1);
    color: var(--color-text-secondary);
}

.runtimeAutoRenew,
.runtimeSettingActions {
    display: flex;
    align-items: center;
}

.runtimeAutoRenew {
    gap: var(--spacing-space-2);
}

.runtimeSettingActions {
    max-width: 100%;
    flex-wrap: nowrap;
    justify-content: center;
    gap: var(--spacing-space-2);
    overflow: visible;
    padding-top: var(--spacing-space-2);
    padding-bottom: var(--spacing-space-3);
}

.settingCard:hover {
    border-color: var(--color-main-primary);
    background: var(--color-main-surface);
    color: var(--color-text-secondary);
    transform: translateY(-2px);
}

.settingCard:hover .settingCardIcon {
    background-color: var(--color-text-secondary);
}

.settingCard:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.settingCardIcon {
    width: var(--spacing-icon-lg);
    height: var(--spacing-icon-lg);
    background-color: var(--color-text-primary);
    mask: var(--icon-src) center / contain no-repeat;
    -webkit-mask: var(--icon-src) center / contain no-repeat;
}

.sectionHeading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-space-4);
    padding-top: var(--spacing-space-4);
    border-top: 1px solid var(--color-main-divider);
}

.scrollAnchor,
.scrollTarget {
    scroll-margin-top: calc(63px + var(--spacing-space-5));
}

.overviewGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.statusCard {
    display: flex;
    align-items: flex-start;
    min-width: 0;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-5);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    box-shadow: none;
}

.success {
    border-color: color-mix(in srgb, var(--color-status-success) 36%, var(--color-input-border));
}

.warning {
    border-color: color-mix(in srgb, var(--color-status-warning) 44%, var(--color-input-border));
}

.cardIcon,
.stepIcon,
.panelIcon,
.featureIcon,
.emptyIcon {
    flex-shrink: 0;
    background-color: var(--color-text-primary);
    mask: var(--icon-src) center / contain no-repeat;
    -webkit-mask: var(--icon-src) center / contain no-repeat;
}

.cardIcon {
    width: var(--spacing-icon-lg);
    height: var(--spacing-icon-lg);
    margin-top: var(--spacing-space-1);
    background-color: var(--color-text-primary);
}

.metricLabel,
.metricValue,
.metricHint {
    margin: 0;
}

.metricValue,
.metricHint {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.metricHint {
    margin-top: var(--spacing-space-1);
    color: var(--color-text-secondary);
    font-size: 13px;
    line-height: 1.4;
}

.setupRail {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-3);
}

.setupStep {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.stepDone {
    background: var(--color-main-background);
    border-color: color-mix(in srgb, var(--color-status-success) 38%, var(--color-input-border));
}

.stepNumber {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    background: var(--color-button-secondary);
    color: var(--color-text-primary);
    font-size: 13px;
    font-weight: 800;
}

.stepIcon {
    width: var(--spacing-icon-sm);
    height: var(--spacing-icon-sm);
}

.stepCopy {
    display: flex;
    min-width: 0;
    flex-direction: column;
}

.stepCopy strong,
.featureCopy strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.stepLabel,
.featureCopy span,
.identityList dt {
    color: var(--color-text-secondary);
    font-size: 12px;
}

.workspace {
    display: grid;
    grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
    align-items: start;
    gap: var(--spacing-space-5);
}

.sidePanel,
.mainPanel,
.utilityCard {
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-2xl);
    background: var(--color-main-background);
    box-shadow: var(--panel-shadow);
}

.sidePanel {
    position: sticky;
    top: var(--spacing-space-5);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-1);
    overflow: hidden;
}

.panelSection {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-5);
}

.panelSection + .panelSection {
    border-top: 1px solid var(--color-main-divider);
}

.panelHeader {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-2);
}

.panelHeader h2,
.panelHeader h3 {
    margin: 0;
}

.panelIcon,
.featureIcon {
    width: var(--spacing-icon-sm);
    height: var(--spacing-icon-sm);
    background-color: var(--color-text-primary);
}

.identityList {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
    margin: 0;
}

.identityList div {
    min-width: 0;
}

.identityList dd {
    margin: 0;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.featureNav {
    display: grid;
    gap: var(--spacing-space-2);
}

.featureTab {
    display: flex;
    align-items: center;
    width: 100%;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    text-align: left;
    cursor: pointer;
    transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
}

.featureTab:hover {
    border-color: var(--color-main-primary);
    transform: translateY(-1px);
}

.featureTab:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.featureTabActive {
    border-color: var(--color-main-primary);
    background: var(--color-button-secondary);
}

.featureCopy {
    display: flex;
    min-width: 0;
    flex-direction: column;
}

.mainPanel {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--spacing-space-5);
    padding: var(--spacing-space-6);
}

.formHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-space-5);
    padding-bottom: var(--spacing-space-5);
    border-bottom: 1px solid var(--color-main-divider);
}

.formHeader h2,
.formHeader p {
    margin: 0;
}

.formHeader p {
    color: var(--color-text-secondary);
}

.emptyPanel {
    display: flex;
    min-height: 280px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-5);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    text-align: center;
}

.emptyPanel p,
.statePanel span,
.cardLead {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 14px;
    line-height: 1.5;
}

.emptyIcon {
    width: var(--spacing-icon-xl);
    height: var(--spacing-icon-xl);
    background-color: var(--color-text-primary);
}

.utilityCard {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-5);
}

.state {
    margin: 0;
}

.statePanel {
    padding: var(--spacing-space-4);
}

.countInput:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
    border-color: var(--color-main-primary);
}

@media (max-width: 1080px) {
    .overviewGrid,
    .workspace {
        grid-template-columns: 1fr;
    }

    .sidePanel {
        position: static;
    }

    .setupRail {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .settingGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--spacing-space-4);
    }
}

@media (max-width: 760px) {
    .hero,
    .formHeader,
    .botSummary,
    .sectionHeading {
        align-items: stretch;
        flex-direction: column;
    }

    .heroActions {
        justify-content: flex-start;
    }

    .overviewGrid,
    .setupRail {
        grid-template-columns: 1fr;
    }

    .mainPanel,
    .panelSection,
    .utilityCard {
        padding: var(--spacing-space-4);
    }

    .countInput {
        width: 100%;
    }

    .botControls {
        justify-content: flex-start;
    }

    .botControls > * {
        flex: 1;
    }

    .settingGrid {
        grid-template-columns: 1fr;
    }

    .settingCard {
        min-height: var(--spacing-space-32);
    }

    .botConfigFormCard {
        padding: var(--spacing-space-4);
    }

    .runtimeSettingCard {
        min-height: var(--spacing-space-80);
        padding: var(--spacing-space-6) var(--spacing-space-4);
    }

    .runtimeSettingActions {
        width: 100%;
        flex-direction: row;
        justify-content: flex-start;
        overflow-x: auto;
        padding-inline: var(--spacing-space-2);
    }

    .packageFeatureCard {
        padding: var(--spacing-space-4);
    }

    .botConfigFormActions {
        flex-direction: column-reverse;
    }

    .botConfigFormActions > * {
        width: 100%;
    }
}

@media (prefers-reduced-motion: reduce) {
    .breadcrumbTrail,
    .breadcrumbFeatureTrail,
    .breadcrumbEmbedTrail {
        opacity: 1;
        transform: none;
        animation: none;
    }

    .botConfigFormCard h2,
    .botConfigFields {
        animation: none;
    }
}
</style>
