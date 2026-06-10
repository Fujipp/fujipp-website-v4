<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
    ShopSidebar,
    FeatureConfigForm,
    RobloxRobuxConfigForm,
    CreateBotDialog,
    type CreateBotPayload,
} from "@/features/shop/components";
import { StatusToast, type SelectFieldOption } from "@/shared/ui";
import { useUserStore } from "@/stores";
import { API_BASE_URL } from "@/config";
import {
    type BotConfigResponse,
    type FeatureDefinition,
} from "@/features/shop/config/featureConfig";

type ToastStatus = "info" | "success" | "warning" | "error";

// Feature codes that render through a bespoke form instead of the generic,
// template-driven FeatureConfigForm.
const ROBLOX_ROBUX_PAYOUT = "roblox-robux-payout";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const botId = computed(() => String(route.params.botId ?? ""));

const isSidebarOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);
const features = ref<FeatureDefinition[]>([]);
const values = ref<Record<string, string>>({});
const channels = ref<{ id: string; name: string }[]>([]);
const roles = ref<{ id: string; name: string }[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const configError = ref("");
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);

const botName = ref("");
const botInitial = ref<Partial<CreateBotPayload>>({});
const showEditBot = ref(false);
const isSavingBot = ref(false);

// Which feature tab is active in the Feature Setting section.
const activeFeatureCode = ref("");
const activeFeature = computed<FeatureDefinition | null>(
    () => features.value.find((f) => f.code === activeFeatureCode.value) ?? null,
);

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
        botInitial.value = {
            name: b.name ?? "",
            discordApplicationId: b.discordApplicationId ?? "",
            discordGuildId: b.discordGuildId ?? "",
        };
    } catch { /* non-blocking */ }
}

async function saveBotSettings(payload: CreateBotPayload): Promise<void> {
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
        showEditBot.value = false;
        notify("success", "บันทึกการตั้งค่าบอทแล้ว", "ถ้าบอทกำลังรันอยู่ ให้ restart เพื่อใช้ค่าใหม่");
        await loadBot();
    } catch {
        notify("error", "บันทึกไม่สำเร็จ", "ชื่อบอทอาจซ้ำ — ลองใหม่อีกครั้ง");
    } finally {
        isSavingBot.value = false;
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

function openEmbedDesigner(): void {
    router.push({ name: "shop-bot-embeds", params: { botId: botId.value } });
}

onMounted(async () => {
    await userStore.initAuth();
    if (!userStore.isAuthenticated) {
        await router.push({ name: "login", query: { redirect: `/shop/bots/${botId.value}/config` } });
        return;
    }
    await Promise.all([loadConfig(), loadBot()]);
});
</script>

<template>
    <div :class="$style.botConfig">
        <ShopSidebar v-model="isSidebarOpen" />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.titleSection">
                <h1 :class="$style.pageTitle" class="type-h1-page-title-sb">BOT CONFIG</h1>
                <p :class="$style.subtitle" class="type-body-small-r">ตั้งค่าฟีเจอร์ของบอท · {{ botName || botId || "—" }}</p>
                <div :class="$style.divider" />
            </section>

            <!-- ── Bot Setting ─────────────────────────────────────────────── -->
            <section :class="$style.block">
                <h2 :class="$style.blockTitle" class="type-subtitle-sb">Bot Setting</h2>
                <div :class="$style.card">
                    <p :class="$style.cardLead">กรอกข้อมูลบอทจาก Discord Developer Portal - token จะถูกเข้ารหัสก่อนเก็บ</p>
                    <div :class="$style.cardDivider" />
                    <dl :class="$style.infoGrid">
                        <div :class="$style.infoItem">
                            <dt :class="$style.infoLabel">ชื่อบอท</dt>
                            <dd :class="$style.infoValue">{{ botInitial.name || "—" }}</dd>
                        </div>
                        <div :class="$style.infoItem">
                            <dt :class="$style.infoLabel">Application ID</dt>
                            <dd :class="$style.infoValue">{{ botInitial.discordApplicationId || "—" }}</dd>
                        </div>
                        <div :class="$style.infoItem">
                            <dt :class="$style.infoLabel">Server ID (Guild)</dt>
                            <dd :class="$style.infoValue">{{ botInitial.discordGuildId || "—" }}</dd>
                        </div>
                        <div :class="$style.infoItem">
                            <dt :class="$style.infoLabel">Bot Token / Client Secret</dt>
                            <dd :class="$style.infoValue">••••••••</dd>
                        </div>
                    </dl>
                    <div :class="$style.cardActions">
                        <button type="button" :class="$style.primaryAction" @click="showEditBot = true">
                            แก้ไขข้อมูลบอท / เปลี่ยน Token
                        </button>
                    </div>
                </div>
            </section>

            <!-- ── Feature Setting ─────────────────────────────────────────── -->
            <section :class="$style.block">
                <h2 :class="$style.blockTitle" class="type-subtitle-sb">Feature Setting</h2>

                <p v-if="isLoading" :class="$style.state" class="type-body-small-r">กำลังโหลด…</p>
                <div v-else-if="configError" :class="$style.statePanel" aria-live="polite">
                    <h3 :class="$style.stateTitle">โหลดการตั้งค่าไม่สำเร็จ</h3>
                    <p :class="$style.stateText">{{ configError }}</p>
                    <button type="button" :class="$style.retryButton" @click="loadConfig">ลองใหม่</button>
                </div>
                <p v-else-if="features.length === 0" :class="$style.state" class="type-body-small-r">
                    บอทนี้ยังไม่มีฟีเจอร์ที่เปิดใช้งาน — ซื้อฟีเจอร์ในหน้า Package ก่อน
                </p>

                <template v-else>
                    <div :class="$style.tabs" role="tablist" aria-label="ฟีเจอร์ที่เปิดใช้งาน">
                        <button
                            v-for="feature in features"
                            :key="feature.code"
                            type="button"
                            role="tab"
                            :aria-selected="feature.code === activeFeatureCode"
                            :class="[$style.tab, feature.code === activeFeatureCode ? $style.tabActive : '']"
                            @click="activeFeatureCode = feature.code"
                        >
                            {{ feature.name }}
                        </button>
                    </div>

                    <RobloxRobuxConfigForm
                        v-if="activeFeature && activeFeature.code === ROBLOX_ROBUX_PAYOUT"
                        :key="activeFeature.code"
                        :feature="activeFeature"
                        :model-value="values"
                        :channel-options="channelOptions"
                        :saving="isSaving"
                        @submit="saveFeature"
                    />
                    <FeatureConfigForm
                        v-else-if="activeFeature"
                        :key="activeFeature.code"
                        :feature="activeFeature"
                        :model-value="values"
                        :channel-options="channelOptions"
                        :role-options="roleOptions"
                        :saving="isSaving"
                        @submit="saveFeature"
                    />
                </template>
            </section>

            <!-- ── Embed Setting ───────────────────────────────────────────── -->
            <section :class="$style.block">
                <h2 :class="$style.blockTitle" class="type-subtitle-sb">Embed Setting</h2>
                <div :class="$style.card">
                    <p :class="$style.cardLead">ออกแบบหน้าตา embed ของบอท (panel ร้าน, การเติมเงิน, แจ้งเตือน) ด้วย Embed Designer</p>
                    <div :class="$style.cardActions">
                        <button type="button" :class="$style.primaryAction" @click="openEmbedDesigner">
                            เปิด Embed Designer
                        </button>
                    </div>
                </div>
            </section>
        </main>

        <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
            <StatusToast
                :status="toast.status"
                :title="toast.title"
                :description="toast.description"
                @close="toast = null"
            />
        </div>

        <CreateBotDialog
            :open="showEditBot"
            mode="edit"
            :initial="botInitial"
            :submitting="isSavingBot"
            @submit="saveBotSettings"
            @cancel="showEditBot = false"
        />
    </div>
</template>

<style module>
.botConfig {
    display: flex;
    min-height: 100vh;
    background: var(--color-main-background);
    color: var(--color-text-primary);
}

.content {
    flex: 1;
    display: flex;
    min-width: 0;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-8) var(--spacing-space-10);
    gap: var(--spacing-space-8);
    transition: margin-left 180ms ease;
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
    color: var(--color-text-disabled);
}

.divider {
    margin-top: var(--spacing-space-4);
    height: 1px;
    background-color: var(--color-input-border);
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
    background: color-mix(in srgb, var(--color-main-background) 96%, var(--color-main-primary) 4%);
    color: var(--color-text-primary);
    box-shadow: 0 18px 48px color-mix(in srgb, var(--color-text-primary) 8%, transparent);
}

.cardLead {
    margin: 0;
    color: var(--color-text-disabled);
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
    color: var(--color-text-disabled);
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
    background-color: color-mix(in srgb, var(--color-main-background) 96%, var(--color-main-primary) 4%);
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
    color: var(--color-text-disabled);
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
        padding: var(--spacing-space-5);
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
</style>
