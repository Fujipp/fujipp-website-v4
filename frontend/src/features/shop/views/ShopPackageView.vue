<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ShopSidebar, PackageCard, PackageRuntimeCard, PurchaseDialog, type PackageOption } from "@/features/shop/components";
import { StatusToast } from "@/shared/ui";
import { useUserStore } from "@/stores";
import { API_BASE_URL } from "@/config";
import {
    priceKindLabel,
    priceNeedsSubject,
    type BotOption,
    type CatalogFeature,
    type RuntimePlan,
} from "@/features/shop/config/catalog";

type ToastStatus = "info" | "success" | "warning" | "error";

const router = useRouter();
const userStore = useUserStore();

const isSidebarOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);
const features = ref<CatalogFeature[]>([]);
const runtimePlans = ref<RuntimePlan[]>([]);
const bots = ref<BotOption[]>([]);
const balanceSatang = ref(0);
const isLoading = ref(false);
const isSubmitting = ref(false);
const catalogError = ref("");
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;

const dialog = ref<{ open: boolean; title: string; option: PackageOption | null }>({ open: false, title: "", option: null });

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

function featureOptions(feature: CatalogFeature): PackageOption[] {
    return feature.prices.map((price) => ({
        id: price.id,
        label: priceKindLabel(price.kind) + (price.durationMonths ? ` · ${price.durationMonths} เดือน` : ""),
        priceSatang: price.effectivePriceSatang,
        promotionLabel: price.promotionLabel,
        requiresSubject: priceNeedsSubject(price.kind),
        payload: { priceId: price.id },
    }));
}

function planOption(plan: RuntimePlan): PackageOption {
    return {
        id: plan.id,
        label: `${plan.durationMonths} เดือน`,
        priceSatang: plan.effectivePriceSatang,
        promotionLabel: plan.promotionLabel,
        requiresSubject: true,
        payload: { runtimePlanId: plan.id },
    };
}

const dialogProps = computed(() => {
    const option = dialog.value.option;
    return {
        title: dialog.value.title,
        optionLabel: option?.label ?? "",
        priceSatang: option?.priceSatang ?? 0,
        requiresSubject: option?.requiresSubject ?? false,
    };
});

const packageSummary = computed(() => [
    {
        label: "Credit",
        value: `${(balanceSatang.value / 100).toLocaleString("th-TH")} บาท`,
        detail: "ใช้สำหรับ runtime และ feature",
    },
    {
        label: "Bot targets",
        value: `${bots.value.length.toLocaleString("th-TH")} bot`,
        detail: bots.value.length === 0 ? "สร้างบอทก่อนซื้อรายการที่ผูกบอท" : "พร้อมเลือกตอนยืนยันซื้อ",
    },
    {
        label: "Catalog",
        value: `${featureCards.value.length + runtimeCards.value.length} items`,
        detail: "แสดงเฉพาะรายการที่ backend เปิดขาย",
    },
]);

const featureCards = computed(() =>
    features.value.flatMap((feature) =>
        featureOptions(feature).map((option) => ({
            id: option.id,
            title: feature.name,
            description: feature.description,
            helper: option.requiresSubject
                ? "ต้องเลือกบอทปลายทางตอนซื้อ ฟีเจอร์นี้จะติดกับบอทตัวนั้น"
                : "ซื้อแล้วใช้กับบัญชีนี้",
            option,
        })),
    ),
);

const runtimeCards = computed(() =>
    runtimePlans.value.map((plan) => ({
        id: plan.id,
        title: `Runtime ${plan.durationMonths} month`,
        option: planOption(plan),
        name: plan.name,
        helper: "เติมเวลาออนไลน์ให้บอท เลือกบอทปลายทางตอนซื้อ",
    })),
);

async function loadCatalog(): Promise<void> {
    isLoading.value = true;
    catalogError.value = "";
    try {
        const headers = await authHeaders();
        if (!headers) {
            catalogError.value = "กรุณาเข้าสู่ระบบก่อนดูแพ็กเกจ";
            return;
        }
        const [fRes, rRes, wRes, bRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/catalog/features`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/runtime-plans`, { headers }),
            fetch(`${API_BASE_URL}/api/wallet`, { headers }),
            fetch(`${API_BASE_URL}/api/bots`, { headers }),
        ]);
        if (!fRes.ok || !rRes.ok || !wRes.ok || !bRes.ok) throw new Error("catalog unavailable");
        features.value = (await fRes.json()) as CatalogFeature[];
        runtimePlans.value = (await rRes.json()) as RuntimePlan[];
        balanceSatang.value = wRes.ok ? ((await wRes.json()).balanceSatang ?? 0) : 0;
        bots.value = bRes.ok ? ((await bRes.json()) as BotOption[]) : [];
    } catch {
        features.value = [];
        runtimePlans.value = [];
        bots.value = [];
        balanceSatang.value = 0;
        catalogError.value = "โหลดแพ็กเกจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
        notify("error", "โหลดแพ็กเกจไม่สำเร็จ", "ระบบไม่สามารถเชื่อมต่อ catalog หรือ wallet ได้");
    } finally {
        isLoading.value = false;
    }
}

function openBuy(title: string, option: PackageOption): void {
    dialog.value = { open: true, title, option };
}

async function confirmPurchase(botId: string | null): Promise<void> {
    const option = dialog.value.option;
    if (!option) return;
    isSubmitting.value = true;
    try {
        const headers = await authHeaders();
        if (!headers) {
            notify("error", "กรุณาเข้าสู่ระบบก่อน");
            return;
        }
        const res = await fetch(`${API_BASE_URL}/api/orders`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                idempotencyKey: crypto.randomUUID(),
                items: [{ ...option.payload, externalSubjectId: botId ?? undefined }],
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        dialog.value.open = false;
        notify("success", "สั่งซื้อสำเร็จ", "ตัดเครดิตและออกสิทธิ์ให้แล้ว");
        await loadCatalog();
    } catch {
        notify("error", "สั่งซื้อไม่สำเร็จ", "เครดิตอาจไม่พอ หรือรายการซ้ำ — ลองใหม่อีกครั้ง");
    } finally {
        isSubmitting.value = false;
    }
}

onMounted(async () => {
    await userStore.initAuth();
    if (!userStore.isAuthenticated) {
        await router.push({ name: "login", query: { redirect: "/shop/package" } });
        return;
    }
    await loadCatalog();
});

onUnmounted(clearToast);
</script>

<template>
    <div :class="$style.shopPackage">
        <ShopSidebar v-model="isSidebarOpen" />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.packageSection" aria-labelledby="shop-package-title">
                <div :class="$style.titleRow">
                    <div :class="$style.titleCopy">
                        <h1 id="shop-package-title" :class="$style.pageTitle">PACKAGE</h1>
                        <p :class="$style.pageLead">
                            Runtime คือเวลาออนไลน์ของบอท ส่วน Feature คือความสามารถที่ซื้อถาวรต่อบอทหนึ่งตัว
                        </p>
                    </div>
                    <div :class="$style.balancePill" aria-label="เครดิตคงเหลือ">
                        <span :class="$style.balanceLabel">เครดิตคงเหลือ</span>
                        <span :class="$style.balanceValue">{{ (balanceSatang / 100).toLocaleString("th-TH") }}</span>
                        <span :class="$style.balanceLabel">บาท</span>
                    </div>
                </div>
                <div :class="$style.packageSummaryGrid" aria-label="Package buying summary">
                    <article v-for="item in packageSummary" :key="item.label" :class="$style.summaryCard">
                        <span :class="$style.summaryLabel">{{ item.label }}</span>
                        <strong :class="$style.summaryValue">{{ item.value }}</strong>
                        <span :class="$style.summaryDetail">{{ item.detail }}</span>
                    </article>
                    <div :class="$style.summaryActions">
                        <RouterLink :class="$style.summaryButton" :to="{ name: 'shop-wallet' }">เติม Wallet</RouterLink>
                        <RouterLink :class="$style.summaryButtonSecondary" :to="{ name: 'shop-guide' }">ดูคู่มือ</RouterLink>
                    </div>
                </div>
            </section>

            <template v-if="isLoading">
                <section :class="$style.sectionGroup" aria-labelledby="shop-package-features-title">
                    <h2 id="shop-package-features-title" :class="$style.sectionTitle">Features</h2>
                    <div :class="$style.packageGrid">
                        <PackageCard
                            v-for="n in 8"
                            :key="`feature-skeleton-${n}`"
                            mode="skeleton"
                        />
                    </div>
                </section>

                <section :class="$style.sectionGroup" aria-labelledby="shop-package-runtime-title">
                    <h2 id="shop-package-runtime-title" :class="$style.sectionTitle">Runtime</h2>
                    <div :class="$style.packageGrid">
                        <PackageRuntimeCard
                            v-for="n in 4"
                            :key="`runtime-skeleton-${n}`"
                            mode="skeleton"
                        />
                    </div>
                </section>
            </template>

            <section v-else-if="catalogError" :class="$style.statePanel" aria-live="polite">
                <h2 :class="$style.stateTitle">โหลดข้อมูลร้านไม่สำเร็จ</h2>
                <p :class="$style.stateText">{{ catalogError }}</p>
                <button type="button" :class="$style.retryButton" @click="loadCatalog">ลองใหม่</button>
            </section>

            <template v-else>
                <section :class="$style.sectionGroup" aria-labelledby="shop-package-features-title">
                    <h2 id="shop-package-features-title" :class="$style.sectionTitle">Features</h2>
                    <div :class="$style.packageGrid">
                        <PackageCard
                            v-for="card in featureCards"
                            :key="card.id"
                            eyebrow="Feature"
                            :title="card.title"
                            :description="card.description"
                            :meta="card.option.label"
                            :helper="card.helper"
                            :option="card.option"
                            button-label="ซื้อ Feature"
                            @select="(option) => openBuy(card.title, option)"
                        />
                    </div>
                    <section v-if="featureCards.length === 0" :class="$style.statePanel">
                        <h3 :class="$style.stateTitle">ยังไม่มีฟีเจอร์ที่เปิดขาย</h3>
                        <p :class="$style.stateText">เมื่อ backend catalog เปิดฟีเจอร์ active แล้ว รายการจะแสดงที่นี่</p>
                    </section>
                </section>

                <section :class="$style.sectionGroup" aria-labelledby="shop-package-runtime-title">
                    <h2 id="shop-package-runtime-title" :class="$style.sectionTitle">Runtime</h2>
                    <div :class="$style.packageGrid">
                        <PackageRuntimeCard
                            v-for="card in runtimeCards"
                            :key="card.id"
                            eyebrow="Runtime"
                            :title="card.title"
                            :meta="card.option.label"
                            :helper="card.helper"
                            :option="card.option"
                            button-label="ซื้อ Runtime"
                            @select="(option) => openBuy(card.name, option)"
                        />
                    </div>
                    <section v-if="runtimeCards.length === 0" :class="$style.statePanel">
                        <h3 :class="$style.stateTitle">ยังไม่มี runtime plan</h3>
                        <p :class="$style.stateText">เพิ่ม runtime plan ที่ billing-service แล้วรายการจะแสดงที่นี่</p>
                    </section>
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

        <PurchaseDialog
            :open="dialog.open"
            :title="dialogProps.title"
            :option-label="dialogProps.optionLabel"
            :price-satang="dialogProps.priceSatang"
            :requires-subject="dialogProps.requiresSubject"
            :bots="bots"
            :balance-satang="balanceSatang"
            :submitting="isSubmitting"
            @confirm="confirmPurchase"
            @cancel="dialog.open = false"
        />

    </div>
</template>

<style module>
.shopPackage {
    display: flex;
    min-height: 100vh;
    background: var(--color-main-background);
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

.packageSection,
.sectionGroup {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
}

.packageSection {
    justify-content: center;
}

.statePanel {
    display: flex;
    max-width: 680px;
    flex-direction: column;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-4);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.stateTitle,
.stateText {
    margin: 0;
}

.stateTitle {
    font-size: 24px;
    font-weight: 600;
}

.stateText {
    color: var(--color-text-secondary);
    font-size: 18px;
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

.titleRow {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-space-5);
}

.titleCopy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.pageTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 32px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0;
}

.pageLead {
    max-width: 680px;
    margin: 0;
    color: var(--color-text-disabled);
    font-size: 16px;
    line-height: 1.5;
}

.packageSummaryGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    align-items: stretch;
    gap: var(--spacing-space-3);
}

.summaryCard,
.summaryActions {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: var(--spacing-space-2);
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.summaryLabel,
.summaryDetail {
    color: color-mix(in srgb, var(--color-text-secondary) 72%, transparent);
    font-size: 13px;
    line-height: 1.45;
}

.summaryLabel {
    font-weight: 700;
    text-transform: uppercase;
}

.summaryValue {
    color: var(--color-text-secondary);
    font-size: 22px;
    font-weight: 800;
    line-height: 1.1;
}

.summaryActions {
    min-width: 156px;
}

.summaryButton,
.summaryButtonSecondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 0 var(--spacing-space-4);
    border-radius: var(--radius-lg);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
}

.summaryButton {
    border: 0;
    background-color: var(--color-main-primary);
    color: var(--color-button-primary-btn-text-active);
}

.summaryButtonSecondary {
    border: 1px solid var(--color-main-divider);
    color: var(--color-text-secondary);
}

.balancePill {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: var(--spacing-space-3);
    gap: var(--spacing-space-3);
    overflow: hidden;
    border-radius: var(--radius-3xl);
    background-color: var(--color-button-secondary-btn-bg);
    color: var(--color-button-secondary-btn-text);
    text-align: left;
}

.balanceLabel,
.balanceValue {
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: normal;
    letter-spacing: 0;
    white-space: nowrap;
}

.balanceLabel {
    font-weight: 300;
}

.balanceValue {
    font-weight: 600;
}

.divider {
    height: 1px;
    background-color: var(--color-main-divider);
}

.sectionTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 28px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0;
}

.packageGrid {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: var(--spacing-space-5);
    padding-inline: var(--spacing-space-5);
}

.toastRegion {
    position: fixed;
    bottom: var(--spacing-space-5);
    right: var(--spacing-space-5);
    z-index: 60;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
}

@media (max-width: 920px) {
    .packageGrid,
    .packageSummaryGrid {
        padding-inline: 0;
    }

    .packageSummaryGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-5) var(--spacing-space-3) var(--spacing-space-10);
    }

    .sidebarOpen,
    .sidebarClosed {
        margin-left: 44px;
    }

    .titleRow {
        flex-direction: column;
        gap: var(--spacing-space-3);
    }

    .balancePill {
        align-self: flex-start;
        flex-wrap: wrap;
    }

    .packageGrid {
        justify-content: center;
    }

    .packageSummaryGrid {
        grid-template-columns: 1fr;
    }

    .toastRegion {
        bottom: var(--spacing-space-3);
        right: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}
</style>
