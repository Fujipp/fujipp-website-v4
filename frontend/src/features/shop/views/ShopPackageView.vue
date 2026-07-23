<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { PurchaseDialog, type PackageOption } from "@/features/shop/components";
import { StatusToast, SearchField } from "@/shared/ui";
import { PrimaryButton } from "@/shared/ui/buttons";
import { AppFooter } from "@/shared/layout";
import { useUserStore } from "@/stores";
import { API_BASE_URL, icons, resolveShopFeatureIcon } from "@/config";
import { localizeCatalogFeature, priceKindLabel, type CatalogFeature } from "@/features/shop/config/catalog";

type ToastStatus = "info" | "success" | "warning" | "error";

const SKELETON_COUNT = 6;

const router = useRouter();
const userStore = useUserStore();
const { locale, t } = useI18n();

const features = ref<CatalogFeature[]>([]);
const balanceSatang = ref(0);
const isLoading = ref(false);
const isSubmitting = ref(false);
const catalogError = ref("");
const searchQuery = ref("");
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;

const dialog = ref<{ open: boolean; title: string; option: PackageOption | null }>({ open: false, title: "", option: null });

function formatPrice(satang: number): string {
    return `${(satang / 100).toLocaleString(locale.value === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 2 })} THB`;
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
        label: priceKindLabel(price.kind, locale.value) + (price.durationMonths ? ` · ${price.durationMonths} ${t("shop.common.months")}` : ""),
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
    features.value.flatMap((rawFeature) => {
        const feature = localizeCatalogFeature(rawFeature, locale.value);
        return featureOptions(feature).map((option) => ({
            id: option.id,
            title: feature.name,
            description: feature.description,
            icon: resolveShopFeatureIcon(feature.iconKey),
            price: formatPrice(option.priceSatang),
            option,
        }));
    }),
);

const filteredFeatureCards = computed(() => {
    const query = searchQuery.value.trim().toLocaleLowerCase();
    if (!query) return featureCards.value;
    return featureCards.value.filter((card) => card.title.toLocaleLowerCase().includes(query));
});

async function loadCatalog(): Promise<void> {
    isLoading.value = true;
    catalogError.value = "";
    try {
        const headers = await authHeaders();
        if (!headers) {
            catalogError.value = t("shop.packages.signInRequired");
            return;
        }
        const [fRes, wRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/catalog/features`, { headers }),
            fetch(`${API_BASE_URL}/api/wallet`, { headers }),
        ]);
        if (!fRes.ok || !wRes.ok) throw new Error("catalog unavailable");
        features.value = (await fRes.json()) as CatalogFeature[];
        balanceSatang.value = wRes.ok ? ((await wRes.json()).balanceSatang ?? 0) : 0;
    } catch {
        features.value = [];
        balanceSatang.value = 0;
        catalogError.value = t("shop.packages.loadFailed");
        notify("error", t("shop.packages.loadFailed"), t("shop.packages.connectionFailed"));
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
            notify("error", t("shop.packages.signInFirst"));
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
        notify("success", t("shop.packages.purchasedTitle"), t("shop.packages.purchasedBody"));
        window.dispatchEvent(new Event("fujipp:wallet-balance-changed"));
        await loadCatalog();
    } catch {
        notify("error", t("shop.packages.purchaseFailedTitle"), t("shop.packages.purchaseFailedBody"));
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
        await router.push({ name: "login", query: { redirect: "/store/packages" } });
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
                    <h1 id="shop-package-title" :class="$style.pageTitle">{{ t("shop.common.allProducts") }}</h1>
                    <div :class="$style.backButton">
                        <PrimaryButton width-mode="hug" :leading-icon="icons.directionLeft" @click="goBack">
                            Back
                        </PrimaryButton>
                    </div>
                </div>
            </section>

            <section :class="$style.section" aria-labelledby="shop-package-features-title">
                <div :class="$style.controlsRow">
                    <h2 id="shop-package-features-title" :class="$style.sectionTitle" class="type-caption-sb">
                        <RouterLink :class="$style.breadcrumbLink" :to="{ name: 'shop-dashboard' }">{{ t("shop.common.main") }}</RouterLink>
                        <span :class="$style.breadcrumbTrail">
                            <span aria-hidden="true">&gt;</span>
                            <span>{{ t("shop.dashboard.packages") }}</span>
                        </span>
                    </h2>
                    <SearchField
                        v-model="searchQuery"
                        :aria-label="t('shop.common.search')"
                        :placeholder="t('shop.common.search')"
                    />
                </div>

                <div v-if="isLoading" :class="$style.cardGrid">
                    <div v-for="n in SKELETON_COUNT" :key="`sk-${n}`" :class="[$style.packageCard, $style.skeletonCard]" />
                </div>

                <section v-else-if="catalogError" :class="$style.statePanel" aria-live="polite">
                    <h3 :class="$style.stateTitle">{{ t("shop.packages.stateTitle") }}</h3>
                    <p :class="$style.stateText">{{ catalogError }}</p>
                    <PrimaryButton type="button" width-mode="hug" @click="loadCatalog">{{ t("shop.common.retry") }}</PrimaryButton>
                </section>

                <template v-else>
                    <div :class="$style.cardGrid">
                        <article
                            v-for="card in filteredFeatureCards"
                            :key="card.id"
                            :class="$style.packageCard"
                        >
                            <div :class="$style.packageImage">
                                <span
                                    :class="$style.packageIcon"
                                    :style="{ '--package-icon': `url(${card.icon})` }"
                                    aria-hidden="true"
                                />
                                <span :class="$style.imageStatus">{{ t("shop.common.artworkComingSoon") }}</span>
                            </div>
                            <div :class="$style.packageBody">
                                <div :class="$style.packageCopy">
                                    <h3 :class="$style.packageTitle">{{ card.title }}</h3>
                                    <p :class="$style.packageDescription">{{ card.description }}</p>
                                </div>
                                <div :class="$style.packageDivider" aria-hidden="true" />
                                <PrimaryButton :leading-icon="icons.buy" @click="openBuy(card.title, card.option)">
                                    {{ card.price }}
                                </PrimaryButton>
                            </div>
                        </article>
                    </div>

                    <p v-if="filteredFeatureCards.length === 0" :class="$style.emptyText">
                        {{ searchQuery.trim() ? `No packages found for “${searchQuery.trim()}”` : t("shop.packages.empty") }}
                    </p>

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
    padding: var(--spacing-space-16) var(--spacing-space-8);
    gap: var(--spacing-space-8);
}

.section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-8);
}

.titleRow {
    display: flex;
    width: 100%;
    height: var(--spacing-space-12);
    flex: 0 0 var(--spacing-space-12);
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.backButton {
    flex: 0 0 auto;
}

.pageTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
    line-height: normal;
}

.controlsRow {
    display: flex;
    width: 100%;
    height: var(--spacing-space-12);
    flex: 0 0 var(--spacing-space-12);
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-space-5);
}

.sectionTitle {
    display: flex;
    align-items: center;
    margin: 0;
    gap: var(--spacing-space-1);
    color: var(--color-text-primary);
}

.breadcrumbLink {
    display: inline-block;
    box-sizing: border-box;
    color: inherit;
    line-height: inherit;
    text-decoration: none;
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

@keyframes breadcrumb-trail-reveal {
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .breadcrumbTrail {
        opacity: 1;
        transform: none;
        animation: none;
    }
}

/* The supplied Store layout uses 352px product cards: three columns on wide
   screens, two on compact desktop, and one centered column on small screens. */
.cardGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 352px));
    align-items: stretch;
    justify-content: space-between;
    gap: var(--spacing-space-8) var(--spacing-space-5);
}

.packageCard {
    min-height: 427px;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    display: flex;
    flex-direction: column;
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
    flex: 0 0 auto;
    background-color: currentColor;
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

.packageTitle,
.packageDescription {
    margin: 0;
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

.skeletonCard {
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
        grid-template-columns: repeat(2, minmax(0, 352px));
    }
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-8) var(--spacing-space-4);
    }

    .controlsRow {
        align-items: flex-start;
        flex-direction: column;
    }

    .cardGrid {
        grid-template-columns: minmax(0, 352px);
        justify-content: center;
    }

    .toastRegion {
        bottom: var(--spacing-space-3);
        right: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}

@media (max-width: 480px) {
    .cardGrid {
        grid-template-columns: minmax(0, 1fr);
        justify-content: stretch;
    }
}
</style>
