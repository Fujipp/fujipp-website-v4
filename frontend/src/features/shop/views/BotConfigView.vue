<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
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
import CountdownTimer from "@/features/shop/components/CountdownTimer.vue";

type ToastStatus = "info" | "success" | "warning" | "error";

// Feature codes that render through a bespoke form instead of the generic,
// template-driven FeatureConfigForm.
const ROBLOX_ROBUX_PAYOUT = "roblox-robux-payout";
const REVIEW_CREDIT = "review-credit";

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

// Runtime subscription for this bot — lifecycle (auto-renew / renew now) lives here
// rather than on the dashboard runtime card.
interface RuntimeSubscription {
    id: string;
    externalSubjectId: string;
    currentPeriodEnd: string | null;
    autoRenew: boolean;
    renewPriceSatang: number | null;
    status: string;
}
const runtimeSub = ref<RuntimeSubscription | null>(null);
const runtimeBusy = ref(false);
const renewPrice = computed(() =>
    ((runtimeSub.value?.renewPriceSatang ?? 0) / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
);

// Which feature tab is active in the Feature Setting section.
const activeFeatureCode = ref("");
const activeFeature = computed<FeatureDefinition | null>(
    () => features.value.find((f) => f.code === activeFeatureCode.value) ?? null,
);

// Feature codes that own at least one embed slot — drives whether the Embed Setting
// panel shows for the selected feature.
const embedFeatureCodes = ref<Set<string>>(new Set());
const activeFeatureHasEmbed = computed(() => embedFeatureCodes.value.has(activeFeatureCode.value));

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

async function loadRuntime(): Promise<void> {
    const headers = await authHeaders();
    if (!headers) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/subscriptions/runtime`, { headers });
        if (!res.ok) return;
        const subs = (await res.json()) as RuntimeSubscription[];
        runtimeSub.value = subs.find((s) => s.externalSubjectId === botId.value) ?? null;
    } catch { /* non-blocking */ }
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
        await loadRuntime();
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

// Open the designer scoped to the active feature so it shows only that feature's embeds.
function openEmbedDesigner(): void {
    router.push({
        name: "shop-bot-embeds",
        params: { botId: botId.value },
        query: activeFeatureCode.value ? { feature: activeFeatureCode.value } : {},
    });
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
        await router.push({ name: "login", query: { redirect: `/shop/bots/${botId.value}/config` } });
        return;
    }
    await Promise.all([loadConfig(), loadBot(), loadRuntime(), loadEmbedFeatures()]);
    if (hasReviewCredit.value) await loadReviewCount();
});
</script>

<template>
    <div :class="$style.botConfig">

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.titleSection">
                <h1 :class="$style.pageTitle" class="type-h1-page-title-sb">BOT CONFIG</h1>
                <p :class="$style.subtitle" class="type-body-small-r">
                    ตั้งค่าข้อมูลบอท, runtime, feature และ embed ก่อนกด start · {{ botName || botId || "—" }}
                </p>
                <div :class="$style.divider" />
            </section>

            <section :class="$style.setupPanel" aria-label="Bot setup checklist">
                <article :class="$style.setupItem">
                    <span :class="$style.setupKicker">Step 1</span>
                    <strong>Bot identity</strong>
                    <span>Token, application id และ guild id ต้องถูกต้องก่อนเริ่มรัน</span>
                </article>
                <article :class="$style.setupItem">
                    <span :class="$style.setupKicker">Step 2</span>
                    <strong>Runtime</strong>
                    <span>บอทต้องมี runtime active ไม่อย่างนั้นเปิดออนไลน์ไม่ได้</span>
                </article>
                <article :class="$style.setupItem">
                    <span :class="$style.setupKicker">Step 3</span>
                    <strong>Features</strong>
                    <span>ตั้งค่า channel, role, package และข้อความตาม feature ที่ซื้อ</span>
                </article>
                <article :class="$style.setupItem">
                    <span :class="$style.setupKicker">Step 4</span>
                    <strong>Embed</strong>
                    <span>ปรับหน้าตา panel/แจ้งเตือนให้ตรงร้านก่อนใช้งานจริง</span>
                </article>
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

            <!-- ── Runtime ─────────────────────────────────────────────────── -->
            <section :class="$style.block">
                <h2 :class="$style.blockTitle" class="type-subtitle-sb">Runtime</h2>
                <div :class="$style.card">
                    <template v-if="runtimeSub">
                        <div :class="$style.runtimeHead">
                            <div :class="$style.runtimeInfo">
                                <p :class="$style.cardLead">เวลาที่เหลือก่อนบอทหยุดทำงาน</p>
                                <p :class="$style.runtimeRemaining">
                                    <CountdownTimer :until="runtimeSub.currentPeriodEnd" />
                                </p>
                            </div>
                            <span :class="$style.renewPrice">ต่ออายุ {{ renewPrice }} บาท</span>
                        </div>
                        <div :class="$style.cardDivider" />
                        <div :class="$style.cardActions">
                            <label :class="$style.autoRenew">
                                <input
                                    type="checkbox"
                                    :checked="runtimeSub.autoRenew"
                                    :disabled="runtimeBusy"
                                    @change="setAutoRenew(($event.target as HTMLInputElement).checked)"
                                >
                                <span>ต่ออัตโนมัติ</span>
                            </label>
                            <button type="button" :class="$style.primaryAction" :disabled="runtimeBusy" @click="renewRuntime">
                                {{ runtimeBusy ? "กำลังต่ออายุ…" : "ต่ออายุตอนนี้" }}
                            </button>
                        </div>
                    </template>
                    <p v-else :class="$style.cardLead">บอทนี้ยังไม่มี runtime — ซื้อ runtime ในหน้า Package ก่อน</p>
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

            <!-- ── Review Credit counter — only under the selected Review Credit feature ── -->
            <section v-if="activeFeature?.code === REVIEW_CREDIT" :class="$style.block">
                <h2 :class="$style.blockTitle" class="type-subtitle-sb">Review Credit — ตัวนับรีวิว</h2>
                <div :class="$style.card">
                    <p :class="$style.cardLead">
                        ตัวนับปัจจุบัน: <strong :class="$style.countValue">{{ reviewCount ?? "—" }}</strong>
                        <span v-if="reviewCount !== null && !reviewCounted"> · ยังไม่ได้นับทั้งห้อง</span>
                    </p>
                    <div :class="$style.cardDivider" />
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
                        <button type="button" :class="$style.primaryAction" :disabled="reviewCountBusy" @click="saveReviewCount">
                            ตั้งตัวเลข
                        </button>
                        <button type="button" :class="$style.secondaryAction" :disabled="reviewCountBusy" @click="recountReview">
                            {{ reviewCountBusy ? "…" : "นับทั้งห้องใหม่" }}
                        </button>
                    </div>
                    <p :class="$style.cardLead">
                        "นับทั้งห้องใหม่" จะให้บอทนับข้อความสมาชิกทั้งห้องอีกครั้ง (บอทจะ restart สักครู่) — ใช้ตอนตั้งค่าครั้งแรก
                    </p>
                </div>
            </section>

            <!-- ── Embed Setting — only for the selected feature that has embeds ── -->
            <section v-if="activeFeatureHasEmbed && activeFeature" :class="$style.block">
                <h2 :class="$style.blockTitle" class="type-subtitle-sb">Embed Setting</h2>
                <div :class="$style.card">
                    <p :class="$style.cardLead">
                        ออกแบบหน้าตา embed ของฟีเจอร์ <strong>{{ activeFeature.name }}</strong> ด้วย Embed Designer
                    </p>
                    <div :class="$style.cardActions">
                        <button type="button" :class="$style.primaryAction" @click="openEmbedDesigner">
                            เปิด Embed Designer — {{ activeFeature.name }}
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
    background: color-mix(in srgb, var(--color-main-background) 92%, var(--color-main-primary) 8%);
    color: var(--color-text-primary);
}

.setupItem strong {
    font-size: 17px;
    line-height: 1.2;
}

.setupItem span:last-child {
    color: var(--color-text-disabled);
    font-size: 13px;
    line-height: 1.45;
}

.setupKicker {
    color: var(--color-main-primary);
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
    color: var(--color-text-disabled);
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
</style>
