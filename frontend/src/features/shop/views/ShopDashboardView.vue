<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { API_BASE_URL, icons, resolveShopFeatureIcon } from "@/config";
import { PurchaseDialog, type PackageOption } from "@/features/shop/components";
import { priceKindLabel, thb, type CatalogFeature, type RuntimePlan } from "@/features/shop/config/catalog";
import { AppFooter } from "@/shared/layout";
import { PrimaryButton } from "@/shared/ui/buttons";
import { StatusToast } from "@/shared/ui/toasts";
import { useUserStore } from "@/stores";

interface ShopOverviewResponse {
    users: number;
    bots: number;
}

interface ShopMetric {
    label: string;
    value: number;
    icon: string;
}

interface HeroSlide {
    eyebrow: string;
    title: string;
    description: string;
}

const HERO_INTERVAL_MS = 5_000;
const RECOMMENDED_LIMIT = 6;

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const isStoreMenu = computed(() => route.name === "shop-dashboard");

const activeSlide = ref(0);
const catalogFeatures = ref<CatalogFeature[]>([]);
const runtimePlans = ref<RuntimePlan[]>([]);
const platformOverview = ref<ShopOverviewResponse>({ users: 0, bots: 0 });
const balanceSatang = ref(0);
const isLoading = ref(true);
const isSubmitting = ref(false);
const loadError = ref("");
const purchaseDialog = ref<{ open: boolean; title: string; option: PackageOption | null }>({
    open: false,
    title: "",
    option: null,
});
const toast = ref<{ status: "success" | "error"; title: string; description: string } | null>(null);
let heroTimer: ReturnType<typeof setInterval> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const heroSlides: HeroSlide[] = [
    {
        eyebrow: "FUJIPP SHOP",
        title: "Discord bot features that are ready to work",
        description: "เลือกฟีเจอร์ที่ต้องการ แล้วเพิ่มความสามารถให้บอทของคุณได้จากที่เดียว",
    },
    {
        eyebrow: "BUILD YOUR BOT",
        title: "Start small. Add only what your community needs.",
        description: "ซื้อฟีเจอร์แยกตามงาน พร้อมนำไปใช้กับบอทที่คุณเป็นเจ้าของ",
    },
    {
        eyebrow: "RUN WITH CONFIDENCE",
        title: "Features, runtime, and bot management in one platform",
        description: "จัดการบริการสำหรับ Discord bot อย่างเป็นระบบและขยายต่อได้เมื่อพร้อม",
    },
];

const recommendedFeatures = computed(() => [...catalogFeatures.value]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, RECOMMENDED_LIMIT));

const metrics = computed<ShopMetric[]>(() => [
    { label: "Users", value: platformOverview.value.users, icon: icons.user },
    { label: "Packages", value: catalogFeatures.value.length, icon: icons.package },
    { label: "Runtime", value: runtimePlans.value.length, icon: icons.shopServer },
    { label: "Bots", value: platformOverview.value.bots, icon: icons.shopBot },
]);

const purchaseDialogProps = computed(() => ({
    title: purchaseDialog.value.title,
    optionLabel: purchaseDialog.value.option?.label ?? "",
    priceSatang: purchaseDialog.value.option?.priceSatang ?? 0,
}));

function featurePrice(feature: CatalogFeature): string {
    const prices = feature.prices
        .map((price) => price.effectivePriceSatang)
        .filter((price) => Number.isFinite(price));

    if (prices.length === 0) return "ดูราคา";
    return thb(Math.min(...prices));
}

function cheapestOption(feature: CatalogFeature): PackageOption | null {
    const price = [...feature.prices]
        .sort((a, b) => a.effectivePriceSatang - b.effectivePriceSatang)[0];

    if (!price) return null;
    return {
        id: price.id,
        label: priceKindLabel(price.kind) + (price.durationMonths ? ` · ${price.durationMonths} เดือน` : ""),
        priceSatang: price.effectivePriceSatang,
        promotionLabel: price.promotionLabel,
        requiresSubject: false,
        payload: { priceId: price.id },
    };
}

function notify(status: "success" | "error", title: string, description: string): void {
    if (toastTimer) clearTimeout(toastTimer);
    toast.value = { status, title, description };
    toastTimer = setTimeout(() => { toast.value = null; }, status === "success" ? 2_600 : 5_200);
}

function openPurchase(feature: CatalogFeature): void {
    const option = cheapestOption(feature);
    if (!option) {
        notify("error", "ยังไม่สามารถซื้อรายการนี้ได้", "Feature นี้ยังไม่มีราคาที่เปิดขาย");
        return;
    }
    purchaseDialog.value = { open: true, title: feature.name, option };
}

function setSlide(index: number): void {
    activeSlide.value = index;
    restartHeroTimer();
}

function restartHeroTimer(): void {
    if (heroTimer) clearInterval(heroTimer);
    heroTimer = setInterval(() => {
        activeSlide.value = (activeSlide.value + 1) % heroSlides.length;
    }, HERO_INTERVAL_MS);
}

async function loadShopMain(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";

    try {
        await userStore.initAuth();
        if (!userStore.accessToken) {
            await router.push({ name: "login", query: { redirect: "/store" } });
            return;
        }

        const headers = { Authorization: `Bearer ${userStore.accessToken}` };
        const [featuresResponse, runtimesResponse, overviewResponse, walletResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/catalog/features`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/runtime-plans`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/overview`, { headers }),
            fetch(`${API_BASE_URL}/api/wallet`, { headers }),
        ]);

        if (!featuresResponse.ok || !runtimesResponse.ok || !overviewResponse.ok || !walletResponse.ok) {
            throw new Error("Shop data is unavailable");
        }

        catalogFeatures.value = await featuresResponse.json() as CatalogFeature[];
        runtimePlans.value = await runtimesResponse.json() as RuntimePlan[];
        platformOverview.value = await overviewResponse.json() as ShopOverviewResponse;
        balanceSatang.value = ((await walletResponse.json()).balanceSatang as number) ?? 0;
    } catch {
        catalogFeatures.value = [];
        runtimePlans.value = [];
        platformOverview.value = { users: 0, bots: 0 };
        balanceSatang.value = 0;
        loadError.value = "ไม่สามารถโหลดรายการสินค้าได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
    } finally {
        isLoading.value = false;
    }
}

async function confirmPurchase(): Promise<void> {
    const option = purchaseDialog.value.option;
    if (!option || isSubmitting.value) return;
    purchaseDialog.value.open = false;
    isSubmitting.value = true;

    try {
        await userStore.initAuth();
        if (!userStore.accessToken) throw new Error("Unauthenticated");
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${userStore.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                idempotencyKey: crypto.randomUUID(),
                items: [{ ...option.payload }],
            }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        notify("success", "สั่งซื้อสำเร็จ", "Feature ถูกเก็บไว้ในคลังของคุณแล้ว");
        window.dispatchEvent(new Event("fujipp:wallet-balance-changed"));
        await loadShopMain();
    } catch {
        notify("error", "สั่งซื้อไม่สำเร็จ", "เครดิตอาจไม่เพียงพอ กรุณาตรวจสอบยอดเงินแล้วลองใหม่อีกครั้ง");
    } finally {
        isSubmitting.value = false;
    }
}

function goToWallet(): void {
    purchaseDialog.value.open = false;
    void router.push({ name: "shop-wallet" });
}

onMounted(() => {
    if (isStoreMenu.value) return;
    restartHeroTimer();
    void loadShopMain();
});

onUnmounted(() => {
    if (heroTimer) clearInterval(heroTimer);
    if (toastTimer) clearTimeout(toastTimer);
});
</script>

<template>
    <div v-if="isStoreMenu" :class="$style.storeMenuPage">
        <main :class="$style.storeMenuHero">
            <div :class="$style.storeMenuTitleRow">
                <h1 :class="$style.storeMenuTitle">All Products</h1>
            </div>
            <div :class="$style.storeMenuControlsRow">
                <p :class="$style.storeMenuSectionTitle" class="type-caption-sb">Main</p>
            </div>

            <nav :class="$style.storeMenuGrid" aria-label="Store categories">
                <RouterLink :class="$style.storeMenuCard" :to="{ name: 'shop-package' }">
                    <span :class="$style.storeMenuIcon" :style="{ '--store-menu-icon': `url(${icons.package})` }" aria-hidden="true" />
                    <span>Packages</span>
                </RouterLink>
                <RouterLink :class="$style.storeMenuCard" :to="{ name: 'shop-runtime' }">
                    <span :class="$style.storeMenuIcon" :style="{ '--store-menu-icon': `url(${icons.shopServer})` }" aria-hidden="true" />
                    <span>Runtime</span>
                </RouterLink>
            </nav>
        </main>
        <AppFooter />
    </div>

    <div v-else :class="$style.shopMain">
        <main>
            <section :class="$style.heroSection" aria-label="Shop highlights">
                <div :class="$style.heroViewport">
                    <article
                        v-for="(slide, index) in heroSlides"
                        :key="slide.title"
                        :class="[$style.heroSlide, { [$style.heroSlideActive]: activeSlide === index }]"
                        :aria-hidden="activeSlide !== index"
                    >
                        <div :class="$style.heroArtwork" aria-hidden="true">
                            <span :class="$style.heroOrb" />
                            <span :class="$style.heroGrid" />
                        </div>
                        <div :class="$style.heroCopy">
                            <p :class="$style.heroEyebrow">{{ slide.eyebrow }}</p>
                            <h1 :class="$style.heroTitle">{{ slide.title }}</h1>
                            <p :class="$style.heroDescription">{{ slide.description }}</p>
                        </div>
                    </article>

                    <div :class="$style.heroDots" aria-label="เลือก Shop highlight">
                        <button
                            v-for="(_, index) in heroSlides"
                            :key="index"
                            type="button"
                            :class="[$style.heroDot, { [$style.heroDotActive]: activeSlide === index }]"
                            :aria-label="`แสดงสไลด์ที่ ${index + 1}`"
                            :aria-current="activeSlide === index ? 'true' : undefined"
                            @click="setSlide(index)"
                        />
                    </div>
                </div>
            </section>

            <section :class="$style.metricsSection" aria-label="Shop overview">
                <div :class="$style.metricsGrid">
                    <article v-for="metric in metrics" :key="metric.label" :class="$style.metricCard">
                        <div :class="$style.metricCopy">
                            <span :class="$style.metricLabel">{{ metric.label }}</span>
                            <strong :class="$style.metricValue">{{ metric.value }}</strong>
                        </div>
                        <span
                            :class="$style.metricIcon"
                            :style="{ '--metric-icon': `url(${metric.icon})` }"
                            aria-hidden="true"
                        />
                    </article>
                </div>
            </section>

            <section :class="$style.recommendedSection" aria-labelledby="recommended-packages-title">
                <div :class="$style.recommendedContent">
                    <h2 id="recommended-packages-title" :class="$style.sectionTitle">Recommended Packages</h2>

                    <p v-if="loadError" :class="$style.stateMessage" role="status">{{ loadError }}</p>

                    <div v-else :class="$style.packageGrid">
                        <article
                            v-for="feature in recommendedFeatures"
                            :key="feature.id"
                            :class="$style.packageCard"
                        >
                            <div :class="$style.packageImage">
                                <span
                                    :class="$style.packageIcon"
                                    :style="{ '--package-icon': `url(${resolveShopFeatureIcon(feature.iconKey)})` }"
                                    aria-hidden="true"
                                />
                                <span :class="$style.imageStatus">Feature artwork coming soon</span>
                            </div>
                            <div :class="$style.packageBody">
                                <div :class="$style.packageCopy">
                                    <h3 :class="$style.packageTitle">{{ feature.name }}</h3>
                                    <p :class="$style.packageDescription">{{ feature.description }}</p>
                                </div>
                                <div :class="$style.packageDivider" aria-hidden="true" />
                                <PrimaryButton :leading-icon="icons.buy" @click="openPurchase(feature)">
                                    {{ featurePrice(feature) }}
                                </PrimaryButton>
                            </div>
                        </article>

                        <article v-for="index in isLoading ? RECOMMENDED_LIMIT : 0" :key="`loading-${index}`" :class="[$style.packageCard, $style.packageSkeleton]" aria-hidden="true">
                            <div :class="$style.packageImage" />
                            <div :class="$style.packageBody">
                                <span :class="$style.skeletonLine" />
                                <span :class="[$style.skeletonLine, $style.skeletonLineShort]" />
                            </div>
                        </article>
                    </div>
                </div>
            </section>
        </main>

        <AppFooter />

        <PurchaseDialog
            :open="purchaseDialog.open"
            :title="purchaseDialogProps.title"
            :option-label="purchaseDialogProps.optionLabel"
            :price-satang="purchaseDialogProps.priceSatang"
            :balance-satang="balanceSatang"
            :submitting="isSubmitting"
            @confirm="confirmPurchase"
            @cancel="purchaseDialog.open = false"
            @topup="goToWallet"
        />

        <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
            <StatusToast
                :status="toast.status"
                :title="toast.title"
                :description="toast.description"
                @close="toast = null"
            />
        </div>
    </div>
</template>

<style module>
.storeMenuPage {
    position: relative;
    display: flex;
    width: 100%;
    min-height: 100vh;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    padding-top: 73px;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    text-align: left;
}

.storeMenuHero {
    display: flex;
    width: 100%;
    max-width: var(--container-7xl);
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    margin: 0 auto;
    padding: var(--spacing-space-16) var(--spacing-space-8);
    gap: var(--spacing-space-8);
}

.storeMenuTitle,
.storeMenuSectionTitle {
    margin: 0;
}

.storeMenuTitleRow,
.storeMenuControlsRow {
    display: flex;
    width: 100%;
    height: var(--spacing-space-12);
    flex: 0 0 var(--spacing-space-12);
    justify-content: space-between;
}

.storeMenuTitleRow {
    align-items: center;
}

.storeMenuControlsRow {
    align-items: flex-start;
}

.storeMenuTitle {
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.storeMenuSectionTitle {
    font-size: var(--type-size-caption);
    font-weight: 600;
}

.storeMenuGrid {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-space-8);
}

.storeMenuCard {
    display: flex;
    width: var(--spacing-space-64);
    height: var(--spacing-space-64);
    flex: 0 0 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--spacing-space-3);
    gap: var(--spacing-space-3);
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-size: var(--type-size-caption);
    font-weight: 400;
    text-decoration: none;
    transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
}

.storeMenuCard:hover {
    border-color: var(--color-text-primary);
    background-color: var(--color-table-row-hover);
    transform: translateY(-2px);
}

.storeMenuCard:active {
    background-color: var(--color-table-row-active);
    transform: translateY(0);
}

.storeMenuCard:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 3px;
}

.storeMenuIcon {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    background-color: currentColor;
    mask: var(--store-menu-icon) center / contain no-repeat;
    -webkit-mask: var(--store-menu-icon) center / contain no-repeat;
}

.shopMain {
    min-height: 100vh;
    padding-top: 73px;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

.heroSection,
.recommendedSection {
    box-sizing: border-box;
    width: 100%;
    padding: var(--spacing-space-16) var(--spacing-space-8);
}

.heroViewport,
.recommendedContent,
.metricsGrid {
    width: 100%;
    max-width: var(--container-7xl);
    margin: 0 auto;
}

.heroViewport {
    position: relative;
    height: min(663.5px, calc(100vh - 137px));
    min-height: 480px;
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-neutral-900);
}

.heroSlide {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    box-sizing: border-box;
    padding: var(--spacing-space-16);
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    transform: scale(1.02);
    transition: opacity 600ms ease, transform 900ms ease;
}

.heroSlideActive {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1);
}

.heroArtwork,
.heroGrid,
.heroOrb {
    position: absolute;
}

.heroArtwork {
    inset: 0;
    background: linear-gradient(135deg, color-mix(in srgb, var(--color-main-primary) 22%, var(--color-neutral-900)), var(--color-neutral-900) 62%);
}

.heroGrid {
    inset: 0;
    opacity: 0.18;
    background-image: linear-gradient(color-mix(in srgb, var(--color-neutral-50) 20%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-neutral-50) 20%, transparent) 1px, transparent 1px);
    background-size: var(--spacing-space-8) var(--spacing-space-8);
    mask-image: linear-gradient(to bottom, black, transparent 82%);
}

.heroOrb {
    top: 12%;
    right: 8%;
    width: min(36vw, 480px);
    aspect-ratio: 1;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-main-primary) 42%, transparent);
    filter: blur(24px);
}

.heroCopy {
    position: relative;
    z-index: 1;
    display: flex;
    max-width: 760px;
    flex-direction: column;
    gap: var(--spacing-space-3);
    color: var(--color-neutral-50);
}

.heroEyebrow,
.heroTitle,
.heroDescription,
.sectionTitle,
.packageTitle,
.packageDescription {
    margin: 0;
}

.heroEyebrow {
    font-size: var(--type-size-overline);
    font-weight: 800;
    letter-spacing: 0.12em;
}

.heroTitle {
    font-size: clamp(2rem, 5vw, 4.5rem);
    font-weight: 800;
    line-height: 1.05;
}

.heroDescription {
    max-width: 640px;
    color: var(--color-neutral-200);
    font-size: var(--type-size-body-main);
    line-height: 1.55;
}

.heroDots {
    position: absolute;
    right: var(--spacing-space-6);
    bottom: var(--spacing-space-6);
    z-index: 2;
    display: flex;
    gap: var(--spacing-space-2);
}

.heroDot {
    width: var(--spacing-space-2);
    height: var(--spacing-space-2);
    padding: 0;
    border: 0;
    border-radius: var(--radius-full);
    background-color: color-mix(in srgb, var(--color-neutral-50) 42%, transparent);
    cursor: pointer;
    transition: width 180ms ease, background-color 180ms ease;
}

.heroDotActive {
    width: var(--spacing-space-6);
    background-color: var(--color-neutral-50);
}

.heroDot:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 3px;
}

.metricsSection {
    box-sizing: border-box;
    width: 100%;
    padding: var(--spacing-space-16) var(--spacing-space-8);
    background-color: var(--color-main-surface);
}

.metricsGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 255px));
    justify-content: center;
    gap: var(--spacing-space-3);
}

.metricCard {
    display: flex;
    min-height: 90px;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    padding: var(--spacing-space-3);
    gap: var(--spacing-space-5);
    border: 1px solid var(--color-neutral-600);
    border-radius: var(--radius-xl);
    color: var(--color-neutral-400);
}

.metricCopy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.metricLabel {
    font-size: var(--type-size-body-main);
    font-weight: 400;
}

.metricValue {
    color: var(--color-text-secondary);
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.metricIcon,
.packageIcon {
    flex: 0 0 auto;
    background-color: currentColor;
}

.metricIcon {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    mask: var(--metric-icon) center / contain no-repeat;
    -webkit-mask: var(--metric-icon) center / contain no-repeat;
}

.recommendedSection {
    background-color: var(--color-main-background);
}

.recommendedContent {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-8);
}

.sectionTitle {
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.packageGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 352px));
    justify-content: center;
    gap: var(--spacing-space-8);
}

.packageCard {
    display: flex;
    min-width: 0;
    min-height: 427px;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

.packageImage {
    display: flex;
    min-height: 213px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-space-3);
    background-color: var(--color-main-surface);
    color: var(--color-neutral-300);
}

.packageIcon {
    width: var(--spacing-icon-xl);
    height: var(--spacing-icon-xl);
    mask: var(--package-icon) center / contain no-repeat;
    -webkit-mask: var(--package-icon) center / contain no-repeat;
}

.imageStatus {
    font-size: var(--type-size-support);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.packageBody {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    gap: var(--spacing-space-3);
}

.packageCopy {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.packageTitle {
    font-size: var(--type-size-h3-card-title);
    font-weight: 400;
}

.packageDescription {
    display: -webkit-box;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: var(--type-size-caption);
    font-weight: 400;
    line-height: 1.45;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
}

.packageDivider {
    height: 1px;
    background-color: var(--color-main-border);
}

.stateMessage {
    margin: 0;
    padding: var(--spacing-space-6);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    color: var(--color-text-secondary);
    text-align: center;
}

.toastRegion {
    position: fixed;
    right: var(--spacing-space-5);
    bottom: var(--spacing-space-5);
    z-index: 1100;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
}

.packageSkeleton {
    pointer-events: none;
}

.packageSkeleton .packageImage,
.skeletonLine {
    background: linear-gradient(100deg, var(--color-main-surface) 20%, var(--color-main-background) 48%, var(--color-main-surface) 76%);
    background-size: 220% 100%;
    animation: shop-main-shimmer 1.6s ease-in-out infinite;
}

.skeletonLine {
    display: block;
    width: 100%;
    height: var(--spacing-space-4);
    border-radius: var(--radius-md);
}

.skeletonLineShort {
    width: 68%;
}

@keyframes shop-main-shimmer {
    to { background-position: -220% 0; }
}

@media (max-width: 900px) {
    .metricsGrid {
        grid-template-columns: repeat(2, minmax(0, 255px));
    }

    .packageGrid {
        grid-template-columns: repeat(2, minmax(0, 352px));
    }
}

@media (max-width: 640px) {
    .storeMenuHero {
        padding: var(--spacing-space-8) var(--spacing-space-4);
    }

    .storeMenuGrid {
        width: 100%;
        flex-direction: column;
        gap: var(--spacing-space-4);
    }

    .storeMenuCard {
        width: 100%;
        height: var(--spacing-space-40);
    }

    .heroSection,
    .metricsSection,
    .recommendedSection {
        padding: var(--spacing-space-8) var(--spacing-space-4);
    }

    .heroViewport {
        min-height: 520px;
    }

    .heroSlide {
        padding: var(--spacing-space-6);
    }

    .heroDots {
        right: var(--spacing-space-4);
        bottom: var(--spacing-space-4);
    }

    .metricsGrid,
    .packageGrid {
        grid-template-columns: 1fr;
    }

    .metricCard {
        width: 100%;
        max-width: 352px;
        margin: 0 auto;
    }

    .packageCard {
        width: 100%;
        max-width: 352px;
        margin: 0 auto;
    }
}

@media (prefers-reduced-motion: reduce) {
    .heroSlide,
    .heroDot {
        transition: none;
    }

    .packageSkeleton .packageImage,
    .skeletonLine {
        animation: none;
    }
}
</style>
