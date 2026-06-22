<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ShopSidebar, PackageCard, PurchaseDialog, type PackageOption } from "@/features/shop/components";
import { StatusToast } from "@/shared/ui";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { useUserStore } from "@/stores";
import { API_BASE_URL } from "@/config";
import {
    priceKindLabel,
    priceNeedsSubject,
    type BotOption,
    type CatalogFeature,
} from "@/features/shop/config/catalog";

type ToastStatus = "info" | "success" | "warning" | "error";

const router = useRouter();
const userStore = useUserStore();

const isSidebarOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);
const features = ref<CatalogFeature[]>([]);
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

const dialogProps = computed(() => {
    const option = dialog.value.option;
    return {
        title: dialog.value.title,
        optionLabel: option?.label ?? "",
        priceSatang: option?.priceSatang ?? 0,
        requiresSubject: option?.requiresSubject ?? false,
    };
});

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

async function loadCatalog(): Promise<void> {
    isLoading.value = true;
    catalogError.value = "";
    try {
        const headers = await authHeaders();
        if (!headers) {
            catalogError.value = "กรุณาเข้าสู่ระบบก่อนดูแพ็กเกจ";
            return;
        }
        const [fRes, wRes, bRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/catalog/features`, { headers }),
            fetch(`${API_BASE_URL}/api/wallet`, { headers }),
            fetch(`${API_BASE_URL}/api/bots`, { headers }),
        ]);
        if (!fRes.ok || !wRes.ok || !bRes.ok) throw new Error("catalog unavailable");
        features.value = (await fRes.json()) as CatalogFeature[];
        balanceSatang.value = wRes.ok ? ((await wRes.json()).balanceSatang ?? 0) : 0;
        bots.value = bRes.ok ? ((await bRes.json()) as BotOption[]) : [];
    } catch {
        features.value = [];
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
                    <h1 id="shop-package-title" :class="$style.pageTitle">Package</h1>
                    <div :class="$style.titleActions">
                        <div :class="$style.balancePill" aria-label="เครดิตคงเหลือ">
                            <span :class="$style.balanceLabel">เครดิต</span>
                            <span :class="$style.balanceValue">{{ (balanceSatang / 100).toLocaleString("th-TH") }}</span>
                            <span :class="$style.balanceLabel">บาท</span>
                        </div>
                        <PrimaryButton :to="{ name: 'shop-wallet' }">เติม Wallet</PrimaryButton>
                        <SecondaryButton :to="{ name: 'shop-guide' }">ดูคู่มือ</SecondaryButton>
                    </div>
                </div>
                <div :class="$style.divider" aria-hidden="true" />
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
            </template>

            <section v-else-if="catalogError" :class="$style.statePanel" aria-live="polite">
                <h2 :class="$style.stateTitle">โหลดข้อมูลร้านไม่สำเร็จ</h2>
                <p :class="$style.stateText">{{ catalogError }}</p>
                <PrimaryButton @click="loadCatalog">ลองใหม่</PrimaryButton>
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

                <section :class="$style.statePanel">
                    <h3 :class="$style.stateTitle">มองหา Runtime อยู่?</h3>
                    <p :class="$style.stateText">Runtime ย้ายไปซื้อจาก "ตู้ Server" ในหน้า Runtime แล้ว — เลือกช่องว่างในตู้ VPS ได้เลย</p>
                    <RouterLink :to="{ name: 'shop-runtime' }" :class="$style.runtimeLink">ไปหน้า Runtime →</RouterLink>
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
    /* Page-scoped card theme (mirrors the Dashboard) so Package cards read light in
       light mode instead of always-dark. Components consume var(--shop-*, <fallback>). */
    --shop-card-bg: var(--color-neutral-50);
    --shop-card-border: var(--color-input-border);
    --shop-card-text: var(--color-text-primary);
    --shop-card-muted: var(--color-neutral-600);

    display: flex;
    min-height: 100vh;
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
    min-width: 0;
    flex: 1;
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
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
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
    color: var(--shop-card-muted, var(--color-text-secondary));
    font-size: 18px;
}

.runtimeLink {
    align-self: flex-start;
    color: var(--color-main-primary);
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
}

.runtimeLink:hover {
    text-decoration: underline;
}

.titleRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-space-4);
}

.titleActions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--spacing-space-3);
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
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 300px));
    align-items: stretch;
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
    .packageGrid {
        padding-inline: 0;
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

    .titleActions {
        justify-content: flex-start;
    }

    .balancePill {
        align-self: flex-start;
        flex-wrap: wrap;
    }

    .packageGrid {
        grid-template-columns: 1fr;
    }

    .toastRegion {
        bottom: var(--spacing-space-3);
        right: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}
</style>
