<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { API_BASE_URL, icons } from "@/config";
import { BotControlCard, CreateBotDialog, type BotControlAction, type CreateBotPayload } from "@/features/shop/components";
import type { CatalogFeature, RuntimePlan } from "@/features/shop/config/catalog";
import { AppFooter } from "@/shared/layout";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { SearchField, SelectField } from "@/shared/ui/fields";
import { BaseDialog } from "@/shared/ui/modals";
import { TablePagination } from "@/shared/ui/paginations";
import { StatusToast } from "@/shared/ui/toasts";
import { useUserStore } from "@/stores";

interface BotItem {
    id: string;
    name: string;
    status: string;
    runtimeStatus: string | null;
    runtimeExpiresAt: string | null;
    avatarUrl?: string | null;
}

interface FeatureSubscription {
    id: string;
    featureId: string;
    externalSubjectId: string | null;
    billingType: string;
    status: string;
    currentPeriodEnd: string | null;
}

interface RuntimeSubscription {
    id: string;
    runtimePlanId: string | null;
    externalSubjectId: string | null;
    status: string;
    currentPeriodEnd: string | null;
}

type AssignmentKind = "feature" | "runtime";

const PAGE_SIZE = 8;
const router = useRouter();
const userStore = useUserStore();

const bots = ref<BotItem[]>([]);
const features = ref<CatalogFeature[]>([]);
const plans = ref<RuntimePlan[]>([]);
const featureSubscriptions = ref<FeatureSubscription[]>([]);
const runtimeSubscriptions = ref<RuntimeSubscription[]>([]);
const loading = ref(true);
const busyBotId = ref("");
const assigning = ref(false);
const renewingRuntimeId = ref("");
const creating = ref(false);
const createDialogOpen = ref(false);
const packageSearch = ref("");
const runtimeSearch = ref("");
const packagePage = ref(1);
const runtimePage = ref(1);
const currentTime = ref(Date.now());
const assignment = ref<{ open: boolean; kind: AssignmentKind; id: string; title: string; botId: string }>({
    open: false,
    kind: "feature",
    id: "",
    title: "",
    botId: "",
});
const toast = ref<{ status: "success" | "error"; title: string; description: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let runtimeClockTimer: ReturnType<typeof setInterval> | undefined;

const featureMap = computed(() => new Map(features.value.map((item) => [item.id, item])));
const planMap = computed(() => new Map(plans.value.map((item) => [item.id, item])));
const botMap = computed(() => new Map(bots.value.map((item) => [item.id, item])));
const botOptions = computed(() => bots.value.map((bot) => ({ label: bot.name, value: bot.id })));
const runtimeBotOptions = computed(() => [
    { label: "ไม่ใช้งาน", value: "" },
    ...botOptions.value,
]);

const packageRows = computed(() => {
    const stackByFeature = new Map<string, {
        id: string;
        featureId: string;
        name: string;
        description: string;
        stack: number;
    }>();

    for (const subscription of featureSubscriptions.value) {
        const feature = featureMap.value.get(subscription.featureId);
        const isSystemFeature = ["runtime-expiry-alert", "runtime-monitor"].includes(feature?.code ?? "");
        const isAvailable = !subscription.externalSubjectId && ["ACTIVE", "PAST_DUE"].includes(subscription.status);
        if (isSystemFeature || !isAvailable) continue;

        const existing = stackByFeature.get(subscription.featureId);
        if (existing) {
            existing.stack += 1;
            continue;
        }
        stackByFeature.set(subscription.featureId, {
            id: subscription.id,
            featureId: subscription.featureId,
            name: feature?.name ?? "Package",
            description: feature?.description ?? "—",
            stack: 1,
        });
    }

    const query = packageSearch.value.trim().toLowerCase();
    return [...stackByFeature.values()]
        .filter((row) => `${row.name} ${row.description}`.toLowerCase().includes(query));
});

const runtimeRows = computed(() => runtimeSubscriptions.value.map((subscription) => ({
    ...subscription,
    name: subscription.runtimePlanId ? planMap.value.get(subscription.runtimePlanId)?.name ?? "Runtime" : "Runtime",
    usedBy: subscription.externalSubjectId ? botMap.value.get(subscription.externalSubjectId)?.name ?? "Unknown bot" : "Available",
})).filter((row) => `${row.name} ${row.usedBy}`.toLowerCase().includes(runtimeSearch.value.trim().toLowerCase())));

const packagePageCount = computed(() => Math.max(1, Math.ceil(packageRows.value.length / PAGE_SIZE)));
const runtimePageCount = computed(() => Math.max(1, Math.ceil(runtimeRows.value.length / PAGE_SIZE)));
const visiblePackages = computed(() => packageRows.value.slice((packagePage.value - 1) * PAGE_SIZE, packagePage.value * PAGE_SIZE));
const visibleRuntimes = computed(() => runtimeRows.value.slice((runtimePage.value - 1) * PAGE_SIZE, runtimePage.value * PAGE_SIZE));

watch(packageSearch, () => { packagePage.value = 1; });
watch(runtimeSearch, () => { runtimePage.value = 1; });
watch(packagePageCount, (count) => { if (packagePage.value > count) packagePage.value = count; });
watch(runtimePageCount, (count) => { if (runtimePage.value > count) runtimePage.value = count; });

function notify(status: "success" | "error", title: string, description: string): void {
    if (toastTimer) clearTimeout(toastTimer);
    toast.value = { status, title, description };
    toastTimer = setTimeout(() => { toast.value = null; }, status === "success" ? 2_600 : 5_200);
}

function authHeaders(json = false): Record<string, string> {
    return {
        Authorization: `Bearer ${userStore.accessToken}`,
        ...(json ? { "Content-Type": "application/json" } : {}),
    };
}

async function loadData(): Promise<void> {
    loading.value = true;
    try {
        await userStore.initAuth();
        if (!userStore.accessToken) {
            await router.push({ name: "login", query: { redirect: "/my-bot" } });
            return;
        }
        const headers = authHeaders();
        const responses = await Promise.all([
            fetch(`${API_BASE_URL}/api/bots`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/features`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/runtime-plans`, { headers }),
            fetch(`${API_BASE_URL}/api/subscriptions/features`, { headers }),
            fetch(`${API_BASE_URL}/api/subscriptions/runtime`, { headers }),
        ]);
        if (responses.some((response) => !response.ok)) throw new Error("My Bot data unavailable");
        const [botData, featureData, planData, featureSubscriptionData, runtimeSubscriptionData] = await Promise.all([
            responses[0].json() as Promise<BotItem[]>,
            responses[1].json() as Promise<CatalogFeature[]>,
            responses[2].json() as Promise<RuntimePlan[]>,
            responses[3].json() as Promise<FeatureSubscription[]>,
            responses[4].json() as Promise<RuntimeSubscription[]>,
        ]);
        bots.value = botData;
        features.value = featureData;
        plans.value = planData;
        featureSubscriptions.value = featureSubscriptionData;
        runtimeSubscriptions.value = runtimeSubscriptionData;
    } catch {
        bots.value = [];
        features.value = [];
        plans.value = [];
        featureSubscriptions.value = [];
        runtimeSubscriptions.value = [];
        notify("error", "โหลด My Bot ไม่สำเร็จ", "ระบบไม่สามารถโหลดบอทและรายการที่ซื้อได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
        loading.value = false;
    }
}

function runtimeParts(bot: BotItem): { days: string; clock: string } {
    if (!bot.runtimeExpiresAt) return { days: "No Runtime", clock: "" };
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(bot.runtimeExpiresAt);
    const expiry = new Date(isDateOnly ? `${bot.runtimeExpiresAt}T00:00:00` : bot.runtimeExpiresAt);
    if (isDateOnly) expiry.setDate(expiry.getDate() + 1);
    const remaining = expiry.getTime() - currentTime.value;
    if (remaining <= 0) return { days: "Expired", clock: "" };
    const days = Math.floor(remaining / 86_400_000);
    const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1_000);
    return { days: `${days} Days`, clock: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` };
}

async function controlBot(bot: BotItem, action: BotControlAction): Promise<void> {
    if (action === "edit") {
        await router.push({ name: "shop-bot-config", params: { botId: bot.id } });
        return;
    }
    const endpoint = action === "restart" ? "restart" : bot.runtimeStatus === "ONLINE" ? "stop" : "start";
    busyBotId.value = bot.id;
    try {
        const response = await fetch(`${API_BASE_URL}/api/bots/${bot.id}/${endpoint}`, { method: "POST", headers: authHeaders() });
        if (!response.ok) throw new Error("Bot action failed");
        notify("success", "อัปเดตสถานะบอทแล้ว", `${bot.name}: ${endpoint}`);
        await loadData();
    } catch {
        notify("error", "สั่งบอทไม่สำเร็จ", "กรุณาตรวจสอบ Runtime และลองใหม่อีกครั้ง");
    } finally {
        busyBotId.value = "";
    }
}

async function createBot(payload: CreateBotPayload): Promise<void> {
    creating.value = true;
    try {
        const response = await fetch(`${API_BASE_URL}/api/bots`, {
            method: "POST",
            headers: authHeaders(true),
            body: JSON.stringify({
                name: payload.name,
                discordToken: payload.discordToken,
                discordApplicationId: payload.discordApplicationId,
                discordGuildId: payload.discordGuildId,
                discordPublicKey: payload.discordPublicKey,
                discordClientSecret: payload.discordClientSecret,
            }),
        });
        if (!response.ok) throw new Error("Create bot failed");
        createDialogOpen.value = false;
        notify("success", "สร้างบอทแล้ว", "บอทใหม่พร้อมให้เลือกใช้ Package และ Runtime");
        await loadData();
    } catch {
        notify("error", "สร้างบอทไม่สำเร็จ", "กรุณาตรวจสอบ Bot Token และ Application ID");
    } finally {
        creating.value = false;
    }
}

function openAssignment(kind: AssignmentKind, id: string, title: string, currentBotId: string | null): void {
    assignment.value = { open: true, kind, id, title, botId: currentBotId ?? "" };
}

async function saveAssignment(): Promise<void> {
    if (assignment.value.kind === "feature" && !assignment.value.botId) return;
    assigning.value = true;
    try {
        const url = assignment.value.kind === "feature"
            ? `${API_BASE_URL}/api/subscriptions/features/${assignment.value.id}/assign`
            : `${API_BASE_URL}/api/runtime/${assignment.value.id}/assign`;
        const response = await fetch(url, {
            method: "POST",
            headers: authHeaders(true),
            body: JSON.stringify({ externalSubjectId: assignment.value.botId || null }),
        });
        if (!response.ok) throw new Error("Assignment failed");
        assignment.value.open = false;
        const description = assignment.value.botId
            ? `${assignment.value.title} ถูกผูกกับบอทที่เลือกแล้ว`
            : `${assignment.value.title} ถูกเปลี่ยนเป็นไม่ใช้งานแล้ว`;
        notify("success", "อัปเดตการใช้งานแล้ว", description);
        await loadData();
    } catch {
        notify("error", "ใช้งานรายการนี้ไม่สำเร็จ", "บอทอาจมี Package หรือ Runtime ประเภทเดียวกันอยู่แล้ว");
    } finally {
        assigning.value = false;
    }
}

async function renewRuntime(subscription: RuntimeSubscription): Promise<void> {
    renewingRuntimeId.value = subscription.id;
    try {
        const response = await fetch(`${API_BASE_URL}/api/subscriptions/runtime/${subscription.id}/renew`, {
            method: "POST",
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error("Runtime renewal failed");
        notify("success", "ต่อ Runtime สำเร็จ", "วันหมดอายุของ Runtime ถูกอัปเดตแล้ว");
        window.dispatchEvent(new Event("fujipp:wallet-balance-changed"));
        await loadData();
    } catch {
        notify("error", "ต่อ Runtime ไม่สำเร็จ", "กรุณาตรวจสอบเครดิตคงเหลือแล้วลองใหม่อีกครั้ง");
    } finally {
        renewingRuntimeId.value = "";
    }
}

function formatDate(value: string | null): string {
    if (!value) return "Permanent";
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

onMounted(() => {
    void loadData();
    runtimeClockTimer = setInterval(() => { currentTime.value = Date.now(); }, 1_000);
});
onUnmounted(() => {
    if (toastTimer) clearTimeout(toastTimer);
    if (runtimeClockTimer) clearInterval(runtimeClockTimer);
});
</script>

<template>
    <div :class="$style.page">
        <main :class="$style.content">
            <section :class="$style.section" aria-labelledby="my-bot-title">
                <div :class="$style.headingRow">
                    <h1 id="my-bot-title" :class="$style.pageTitle">My bot</h1>
                    <PrimaryButton width-mode="hug" :leading-icon="icons.add" @click="createDialogOpen = true">New bot</PrimaryButton>
                </div>

                <div :class="$style.botGrid">
                    <BotControlCard v-for="bot in bots" :key="bot.id" :name="bot.name" :avatar="bot.avatarUrl ?? ''" :status="bot.runtimeStatus === 'ONLINE' ? 'online' : 'offline'" :runtime-days="runtimeParts(bot).days" :runtime-clock="runtimeParts(bot).clock" :disabled="busyBotId === bot.id" @control="controlBot(bot, $event)" />
                    <BotControlCard v-for="index in loading ? 3 : 0" :key="`bot-skeleton-${index}`" mode="skeleton" />
                </div>
                <p v-if="!loading && bots.length === 0" :class="$style.emptyState">No bot found.</p>
            </section>

            <section :class="$style.section" aria-labelledby="my-purchases-title">
                <div :class="$style.headingRow">
                    <h2 id="my-purchases-title" :class="$style.sectionTitle">My Purchases</h2>
                    <PrimaryButton width-mode="hug" :leading-icon="icons.package" :to="{ name: 'shop-dashboard' }">Store</PrimaryButton>
                </div>

                <div :class="$style.tableSection">
                    <h3 :class="$style.tableTitle">Package</h3>
                    <SearchField v-model="packageSearch" :class="$style.search" placeholder="Search Package" />
                    <div :class="$style.tableScroll">
                        <table :class="$style.table">
                            <colgroup><col :class="$style.numberColumn"><col :class="$style.nameColumn"><col><col :class="$style.metaColumn"><col :class="$style.actionColumn"></colgroup>
                            <thead><tr><th>No</th><th>Name</th><th>Description</th><th>Stack</th><th>Action</th></tr></thead>
                            <tbody>
                                <tr v-for="(row, index) in visiblePackages" :key="row.id">
                                    <td>{{ (packagePage - 1) * PAGE_SIZE + index + 1 }}</td><td>{{ row.name }}</td><td>{{ row.description }}</td><td>{{ row.stack }}</td>
                                    <td><PrimaryButton width-mode="hug" :disabled="bots.length === 0" @click="openAssignment('feature', row.id, row.name, null)">Use</PrimaryButton></td>
                                </tr>
                                <tr v-if="!loading && visiblePackages.length === 0"><td colspan="5" :class="$style.emptyCell">No package found.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <TablePagination v-if="packagePageCount > 1" v-model="packagePage" :page-count="packagePageCount" />
                </div>

                <div :class="$style.tableSection">
                    <h3 :class="$style.tableTitle">Runtime</h3>
                    <SearchField v-model="runtimeSearch" :class="$style.search" placeholder="Search Runtime" />
                    <div :class="$style.tableScroll">
                        <table :class="$style.table">
                            <colgroup><col :class="$style.numberColumn"><col :class="$style.nameColumn"><col><col :class="$style.metaColumn"><col :class="$style.actionColumn"></colgroup>
                            <thead><tr><th>No</th><th>Name</th><th>Expired</th><th>Use by</th><th>Action</th></tr></thead>
                            <tbody>
                                <tr v-for="(row, index) in visibleRuntimes" :key="row.id">
                                    <td>{{ (runtimePage - 1) * PAGE_SIZE + index + 1 }}</td><td>{{ row.name }}</td><td>{{ formatDate(row.currentPeriodEnd) }}</td><td>{{ row.usedBy }}</td>
                                    <td>
                                        <div :class="$style.runtimeActions">
                                            <PrimaryButton width-mode="hug" :leading-icon="row.externalSubjectId ? icons.edit : undefined" :disabled="bots.length === 0 && !row.externalSubjectId" @click="openAssignment('runtime', row.id, row.name, row.externalSubjectId)">{{ row.externalSubjectId ? 'Edit' : 'Use' }}</PrimaryButton>
                                            <PrimaryButton width-mode="hug" :leading-icon="icons.shopRenew" :disabled="renewingRuntimeId === row.id" @click="renewRuntime(row)">{{ renewingRuntimeId === row.id ? 'Renewing…' : 'Renew Runtime' }}</PrimaryButton>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="!loading && visibleRuntimes.length === 0"><td colspan="5" :class="$style.emptyCell">No runtime found.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <TablePagination v-if="runtimePageCount > 1" v-model="runtimePage" :page-count="runtimePageCount" />
                </div>
            </section>
        </main>

        <AppFooter />

        <CreateBotDialog :open="createDialogOpen" :submitting="creating" @submit="createBot" @cancel="createDialogOpen = false" />

        <BaseDialog v-if="assignment.open" size="small" aria-labelled-by="assignment-title" @close="assignment.open = false">
            <div :class="$style.dialogContent">
                <h2 id="assignment-title" :class="$style.dialogTitle">{{ assignment.kind === 'runtime' ? 'Select Runtime Bot' : 'Use Package' }}</h2>
                <p :class="$style.dialogDescription">{{ assignment.title }}</p>
                <SelectField v-model="assignment.botId" label="Bot" :options="assignment.kind === 'runtime' ? runtimeBotOptions : botOptions" placeholder="Select bot" />
                <div :class="$style.dialogActions">
                    <SecondaryButton width-mode="hug" @click="assignment.open = false">Cancel</SecondaryButton>
                    <PrimaryButton width-mode="hug" :disabled="(assignment.kind === 'feature' && !assignment.botId) || assigning" @click="saveAssignment">{{ assigning ? 'Saving…' : 'Confirm' }}</PrimaryButton>
                </div>
            </div>
        </BaseDialog>

        <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
            <StatusToast :status="toast.status" :title="toast.title" :description="toast.description" @close="toast = null" />
        </div>
    </div>
</template>

<style module>
.page { min-height: 100vh; box-sizing: border-box; padding-top: 73px; background-color: var(--color-main-background); color: var(--color-text-primary); }
.content { display: flex; width: min(100%, var(--container-7xl)); flex-direction: column; box-sizing: border-box; margin: 0 auto; padding: var(--spacing-space-16) var(--spacing-space-8); gap: var(--spacing-space-16); }
.section { display: flex; flex-direction: column; gap: var(--spacing-space-8); }
.headingRow { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-space-5); }
.pageTitle, .sectionTitle, .tableTitle, .dialogTitle, .dialogDescription { margin: 0; }
.pageTitle { font-size: var(--type-size-h1-page-title); font-weight: 800; }
.sectionTitle { font-size: var(--type-size-h2-section-title); font-weight: 800; }
.tableTitle { font-size: var(--type-size-subtitle); font-weight: 600; }
.botGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-space-5); }
.emptyState { margin: 0; padding: var(--spacing-space-10); border: 1px solid var(--color-main-divider); border-radius: var(--radius-xl); color: var(--color-text-muted); text-align: center; }
.tableSection { display: flex; flex-direction: column; gap: var(--spacing-space-2); }
.search { align-self: flex-end; }
.tableScroll { overflow-x: auto; border: 1px solid var(--color-main-border); border-radius: var(--radius-xl); background-color: var(--color-main-background); }
.table { width: 100%; min-width: 1080px; table-layout: fixed; border-collapse: collapse; color: var(--color-text-primary); }
.numberColumn { width: 64px; }
.nameColumn { width: 32%; }
.metaColumn { width: 160px; }
.actionColumn { width: 320px; }
.table th, .table td { padding: var(--spacing-space-3) var(--spacing-space-4); border-bottom: 1px solid var(--color-main-divider); text-align: left; vertical-align: middle; }
.table th { color: var(--color-text-muted); font-size: var(--type-size-body-main); font-weight: 600; }
.table td { font-size: var(--type-size-caption); }
.table th:last-child, .table td:last-child { text-align: center; }
.table tbody tr:last-child td { border-bottom: 0; }
.runtimeActions { display: flex; align-items: center; justify-content: center; flex-wrap: nowrap; gap: var(--spacing-space-2); }
.emptyCell { height: 220px; color: var(--color-text-muted); text-align: center !important; }
.dialogContent { display: flex; flex-direction: column; padding: var(--spacing-space-5); gap: var(--spacing-space-4); }
.dialogTitle { font-size: var(--type-size-h3-card-title); font-weight: 800; }
.dialogDescription { color: var(--color-dialog-text-secondary); }
.dialogActions { display: flex; justify-content: flex-end; gap: var(--spacing-space-2); }
.toastRegion { position: fixed; z-index: 1100; top: calc(63px + var(--spacing-space-4)); right: var(--spacing-space-4); width: min(420px, calc(100vw - var(--spacing-space-8))); }

@media (max-width: 960px) { .botGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) {
    .content { padding: var(--spacing-space-8) var(--spacing-space-4) var(--spacing-space-10); gap: var(--spacing-space-10); }
    .headingRow { align-items: flex-start; flex-direction: column; }
    .botGrid { grid-template-columns: minmax(0, 1fr); }
    .headingRow > :last-child { width: 100%; }
    .dialogActions { flex-direction: column-reverse; }
    .dialogActions > * { width: 100%; }
    .toastRegion { top: calc(55px + var(--spacing-space-3)); right: var(--spacing-space-3); width: calc(100vw - var(--spacing-space-6)); }
}
</style>
