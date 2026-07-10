<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
    FeatureConfigForm,
    RobloxRobuxConfigForm,
    CreateBotDialog,
    type CreateBotPayload,
} from "@/features/shop/components";
import { AppFooter } from "@/shared/layout";
import { PrimaryButton, SecondaryButton, StatusToast, type SelectFieldOption } from "@/shared/ui";
import { useUserStore } from "@/stores";
import { API_BASE_URL, icons } from "@/config";
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
const activeFeatureIndex = computed(() => features.value.findIndex((f) => f.code === activeFeatureCode.value));
const configuredFeatureCount = computed(() =>
    features.value.filter((feature) =>
        feature.fields.some((field) => String(values.value[field.variableKey] ?? "").trim()),
    ).length,
);
const totalFieldCount = computed(() => features.value.reduce((sum, feature) => sum + feature.fields.length, 0));
const identityReady = computed(() =>
    Boolean(
        botInitial.value.name?.trim() &&
        botInitial.value.discordApplicationId?.trim() &&
        botInitial.value.discordGuildId?.trim(),
    ),
);
const runtimeState = computed(() => {
    if (!runtimeSub.value) {
        return {
            label: "ยังไม่มี Runtime",
            tone: "warning",
            detail: "ซื้อ runtime ก่อนเปิดบอทออนไลน์",
        };
    }

    const status = runtimeSub.value.status.toLowerCase();
    if (status.includes("expired") || status.includes("cancel")) {
        return {
            label: "Runtime ต้องต่ออายุ",
            tone: "warning",
            detail: "ต่ออายุเพื่อให้บอทกลับมาพร้อมใช้งาน",
        };
    }

    return {
        label: runtimeSub.value.autoRenew ? "Runtime พร้อมต่ออายุอัตโนมัติ" : "Runtime พร้อมใช้งาน",
        tone: "success",
        detail: runtimeSub.value.autoRenew ? "ระบบจะดูแลรอบถัดไปให้" : "เปิดต่ออัตโนมัติได้ถ้าต้องการ",
    };
});
const setupSteps = computed(() => [
    {
        label: "Bot",
        title: "Identity",
        icon: icons.shopBot,
        done: identityReady.value,
    },
    {
        label: "Host",
        title: "Runtime",
        icon: icons.shopServer,
        done: Boolean(runtimeSub.value),
    },
    {
        label: "Feature",
        title: `${configuredFeatureCount.value}/${features.value.length || 0}`,
        icon: icons.featureFlag,
        done: features.value.length > 0 && configuredFeatureCount.value === features.value.length,
    },
    {
        label: "Embed",
        title: activeFeatureHasEmbed.value ? "Ready" : "Optional",
        icon: icons.comment,
        done: activeFeatureHasEmbed.value,
    },
]);

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
        <main :class="$style.content">
            <section :class="$style.hero" aria-labelledby="bot-config-title">
                <div :class="$style.heroCopy">
                    <span :class="$style.eyebrow" class="type-overline-sb">Discord bot setup</span>
                    <h1 id="bot-config-title" :class="$style.pageTitle" class="type-h1-page-title-sb">BOT CONFIG</h1>
                    <p :class="$style.subtitle" class="type-body-small-r">
                        {{ botName || botInitial.name || "Untitled bot" }}
                    </p>
                </div>

                <div :class="$style.heroActions">
                    <SecondaryButton width-mode="hug" :leading-icon="icons.arrowBack" @click="router.push({ name: 'shop-dashboard' })">
                        Dashboard
                    </SecondaryButton>
                    <PrimaryButton width-mode="hug" :leading-icon="icons.edit" @click="showEditBot = true">
                        Edit bot
                    </PrimaryButton>
                </div>
            </section>

            <section :class="$style.overviewGrid" aria-label="Bot configuration overview">
                <article :class="$style.statusCard">
                    <span :class="$style.cardIcon" :style="iconMaskStyle(icons.shopBot)" aria-hidden="true" />
                    <div>
                        <p :class="$style.metricLabel" class="type-overline-sb">Bot</p>
                        <strong :class="$style.metricValue" class="type-body-main-sb">
                            {{ identityReady ? "พร้อมตั้งค่า" : "ต้องเติมข้อมูล" }}
                        </strong>
                        <span :class="$style.metricHint">{{ botId }}</span>
                    </div>
                </article>
                <article :class="[$style.statusCard, $style[runtimeState.tone]]">
                    <span :class="$style.cardIcon" :style="iconMaskStyle(icons.shopServer)" aria-hidden="true" />
                    <div>
                        <p :class="$style.metricLabel" class="type-overline-sb">Runtime</p>
                        <strong :class="$style.metricValue" class="type-body-main-sb">{{ runtimeState.label }}</strong>
                        <span :class="$style.metricHint">{{ runtimeState.detail }}</span>
                    </div>
                </article>
                <article :class="$style.statusCard">
                    <span :class="$style.cardIcon" :style="iconMaskStyle(icons.featureFlag)" aria-hidden="true" />
                    <div>
                        <p :class="$style.metricLabel" class="type-overline-sb">Features</p>
                        <strong :class="$style.metricValue" class="type-body-main-sb">
                            {{ features.length }} active · {{ totalFieldCount }} fields
                        </strong>
                        <span :class="$style.metricHint">{{ configuredFeatureCount }} feature configured</span>
                    </div>
                </article>
            </section>

            <section :class="$style.setupRail" aria-label="Setup progress">
                <article
                    v-for="(step, index) in setupSteps"
                    :key="step.label"
                    :class="[$style.setupStep, step.done ? $style.stepDone : '']"
                >
                    <span :class="$style.stepNumber">{{ index + 1 }}</span>
                    <span :class="$style.stepIcon" :style="iconMaskStyle(step.icon)" aria-hidden="true" />
                    <span :class="$style.stepCopy">
                        <span :class="$style.stepLabel">{{ step.label }}</span>
                        <strong>{{ step.title }}</strong>
                    </span>
                </article>
            </section>

            <section :class="$style.workspace" aria-label="Bot configuration workspace">
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

                    <div :class="$style.panelSection">
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

                <div :class="$style.mainPanel">
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
    padding-bottom: var(--spacing-space-5);
    border-bottom: 1px solid var(--color-main-divider);
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
}

@media (max-width: 760px) {
    .hero,
    .formHeader {
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
}
</style>
