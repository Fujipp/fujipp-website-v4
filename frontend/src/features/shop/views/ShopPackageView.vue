<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { FeatureCard, PurchaseDialog, type PackageOption } from "@/features/shop/components";
import { StatusToast, ReadMoreModal } from "@/shared/ui";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { TablePagination } from "@/shared/ui/paginations";
import { AppFooter } from "@/shared/layout";
import { useUserStore } from "@/stores";
import { API_BASE_URL, icons, resolveShopFeatureIcon } from "@/config";
import { priceKindLabel, type CatalogFeature } from "@/features/shop/config/catalog";

type ToastStatus = "info" | "success" | "warning" | "error";

const PAGE_SIZE = 8;

const router = useRouter();
const userStore = useUserStore();

const features = ref<CatalogFeature[]>([]);
const balanceSatang = ref(0);
const isLoading = ref(false);
const isSubmitting = ref(false);
const catalogError = ref("");
const page = ref(1);
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;

const dialog = ref<{ open: boolean; title: string; option: PackageOption | null }>({ open: false, title: "", option: null });
const readMore = ref<{ title: string; body: string } | null>(null);

function formatPrice(satang: number): string {
    return `฿ ${(satang / 100).toLocaleString("th-TH")}`;
}

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
        requiresSubject: false,
        payload: { priceId: price.id },
    }));
}

const dialogProps = computed(() => {
    const option = dialog.value.option;
    return {
        title: dialog.value.title,
        optionLabel: option?.label ?? "",
        priceSatang: option?.priceSatang ?? 0,
    };
});

// One sell card per (feature × price option) so multi-price features stay buyable
// through the existing PurchaseDialog flow.
const featureCards = computed(() =>
    features.value.flatMap((feature) =>
        featureOptions(feature).map((option) => ({
            id: option.id,
            title: feature.name,
            description: feature.description,
            icon: resolveShopFeatureIcon(feature.iconKey),
            price: formatPrice(option.priceSatang),
            option,
        })),
    ),
);

const pageCount = computed(() => Math.max(1, Math.ceil(featureCards.value.length / PAGE_SIZE)));
const pagedCards = computed(() => featureCards.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));

async function loadCatalog(): Promise<void> {
    isLoading.value = true;
    catalogError.value = "";
    try {
        const headers = await authHeaders();
        if (!headers) {
            catalogError.value = "กรุณาเข้าสู่ระบบก่อนดูแพ็กเกจ";
            return;
        }
        const [fRes, wRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/catalog/features`, { headers }),
            fetch(`${API_BASE_URL}/api/wallet`, { headers }),
        ]);
        if (!fRes.ok || !wRes.ok) throw new Error("catalog unavailable");
        features.value = (await fRes.json()) as CatalogFeature[];
        balanceSatang.value = wRes.ok ? ((await wRes.json()).balanceSatang ?? 0) : 0;
        page.value = 1;
    } catch {
        features.value = [];
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

// Buy into the user's stack (no bot binding) — assign to a bot later from the Dashboard.
async function confirmPurchase(): Promise<void> {
    const option = dialog.value.option;
    if (!option) return;
    // Close right away — success or failure is reported via toast.
    dialog.value.open = false;

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
                items: [{ ...option.payload }],
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        notify("success", "สั่งซื้อสำเร็จ", "เก็บไว้ในคลังแล้ว — กด Use ที่หน้า Dashboard เพื่อผูกกับบอท");
        await loadCatalog();
    } catch {
        notify("error", "สั่งซื้อไม่สำเร็จ", "เครดิตอาจไม่พอ หรือรายการซ้ำ — ลองใหม่อีกครั้ง");
    } finally {
        isSubmitting.value = false;
    }
}

function goToWallet(): void {
    void router.push({ name: "shop-wallet" });
}

function goBack(): void {
    void router.push({ name: "shop-dashboard" });
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
        <main :class="$style.content">
            <section :class="$style.section" aria-labelledby="shop-package-title">
                <div :class="$style.titleRow">
                    <h1 id="shop-package-title" :class="$style.pageTitle">ฟีเจอร์เสริม</h1>
                    <SecondaryButton width-mode="hug" :leading-icon="icons.arrowBack" @click="goBack">
                        กลับ
                    </SecondaryButton>
                </div>
            </section>

            <section :class="$style.section" aria-labelledby="shop-package-features-title">
                <div :class="$style.sectionHeading">
                    <h2 id="shop-package-features-title" :class="$style.sectionTitle">เลือกฟีเจอร์สำหรับบอท</h2>
                    <div :class="$style.headingRule" aria-hidden="true" />
                </div>

                <div v-if="isLoading" :class="$style.cardGrid">
                    <div v-for="n in PAGE_SIZE" :key="`sk-${n}`" :class="[$style.cardItem, $style.skeletonCard]" />
                </div>

                <section v-else-if="catalogError" :class="$style.statePanel" aria-live="polite">
                    <h3 :class="$style.stateTitle">โหลดข้อมูลร้านไม่สำเร็จ</h3>
                    <p :class="$style.stateText">{{ catalogError }}</p>
                    <PrimaryButton type="button" width-mode="hug" @click="loadCatalog">ลองใหม่</PrimaryButton>
                </section>

                <template v-else>
                    <div :class="$style.cardGrid">
                        <FeatureCard
                            v-for="card in pagedCards"
                            :key="card.id"
                            :class="$style.cardItem"
                            variant="sell"
                            :icon="card.icon"
                            :price="card.price"
                            :title="card.title"
                            :description="card.description"
                            buy-label="ซื้อฟีเจอร์"
                            @buy="openBuy(card.title, card.option)"
                            @read-more="readMore = { title: card.title, body: card.description }"
                        />
                    </div>

                    <p v-if="featureCards.length === 0" :class="$style.emptyText">
                        ยังไม่มีฟีเจอร์ที่เปิดขาย — เมื่อ catalog เปิดฟีเจอร์ active แล้ว รายการจะแสดงที่นี่
                    </p>

                    <TablePagination v-if="pageCount > 1" v-model="page" :page-count="pageCount" />
                </template>
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

        <AppFooter />

        <PurchaseDialog
            :open="dialog.open"
            :title="dialogProps.title"
            :option-label="dialogProps.optionLabel"
            :price-satang="dialogProps.priceSatang"
            :balance-satang="balanceSatang"
            :submitting="isSubmitting"
            @confirm="confirmPurchase"
            @cancel="dialog.open = false"
            @topup="goToWallet"
        />

        <ReadMoreModal
            v-if="readMore"
            :title="readMore.title"
            :body="readMore.body"
            @close="readMore = null"
        />
    </div>
</template>

<style module>
.shopPackage {
    /* Page-scoped card theme (mirrors the Dashboard) so cards read light in light
       mode instead of always-dark. Components consume var(--shop-*, <fallback>). */
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
    background: var(--color-main-background);
    color: var(--color-text-primary);
}

:global(.dark) .shopPackage,
:global([data-theme="dark"]) .shopPackage {
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
    height: 328px;
    border-radius: var(--radius-xl);
    background: linear-gradient(110deg, var(--color-main-surface) 0%, var(--color-main-background) 48%, var(--color-main-surface) 100%);
    background-size: 220% 100%;
    animation: shop-package-shimmer 1800ms ease-in-out infinite;
}

@keyframes shop-package-shimmer {
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
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-4);
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
    font-size: 18px;
}

.toastRegion {
    position: fixed;
    bottom: var(--spacing-space-5);
    right: var(--spacing-space-5);
    z-index: 60;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
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
        bottom: var(--spacing-space-3);
        right: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}

@media (max-width: 480px) {
    .cardGrid {
        grid-template-columns: 1fr;
    }
}
</style>
