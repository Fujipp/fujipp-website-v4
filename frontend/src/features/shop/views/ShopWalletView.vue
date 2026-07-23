<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
    WalletCreditCard,
    WalletTopupPanel,
} from "@/features/shop/components";
import { StatusToast } from "@/shared/ui";
import { PrimaryButton } from "@/shared/ui/buttons";
import { AppFooter } from "@/shared/layout";
import { useUserStore } from "@/stores";
import { API_BASE_URL } from "@/config";

const MIN_TOPUP_THB = 50;
const supportedSlipTypes = ["image/png", "image/jpeg", "image/webp"];
type TopupStep = 1 | 2 | 3;

interface WalletResponse {
    balanceSatang: number;
    currency: string;
}

interface TopupInitResponse {
    reference: string;
    amountSatang: number;
    promptPayPayload: string;
}

type ToastStatus = "info" | "success" | "warning" | "error";

interface WalletToast {
    description?: string;
    status: ToastStatus;
    title: string;
}

interface BackendErrorPayload {
    code?: number | string;
    error?: string;
    message?: string;
    status?: number;
}

interface NormalizedBackendError {
    code?: string;
    message: string;
    status?: number;
}

const router = useRouter();
const userStore = useUserStore();
const { locale, t } = useI18n();

const balanceSatang = ref(0);
const customAmount = ref(String(MIN_TOPUP_THB));
const currentStep = ref<TopupStep>(1);
const topup = ref<TopupInitResponse | null>(null);
const slipFile = ref<File | null>(null);
const dragActive = ref(false);
const isLoadingWallet = ref(false);
const isGeneratingQr = ref(false);
const isVerifyingSlip = ref(false);
const walletError = ref("");
const toast = ref<WalletToast | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;

const amountThb = computed(() => {
    const value = Number(customAmount.value);
    return Number.isFinite(value) ? Math.floor(value) : 0;
});
const amountError = computed(() => (
    amountThb.value < MIN_TOPUP_THB ? `Minimum amount is ${MIN_TOPUP_THB}` : ""
));
const canGenerateQr = computed(() => (
    !isGeneratingQr.value
    && amountThb.value >= MIN_TOPUP_THB
));
const canVerifySlip = computed(() => (
    !!topup.value?.reference
    && !!slipFile.value
    && !isVerifyingSlip.value
));
const walletBalance = computed(() => balanceSatang.value / 100);
const topupAmount = computed(() => formatMoney(topup.value?.amountSatang ?? amountThb.value * 100));
const walletUsername = computed(() => (
    userStore.profile?.username
    ?? userStore.profile?.displayName
    ?? userStore.user?.email?.split("@")[0]
    ?? "Username"
));
const walletAvatarUrl = computed(() => (
    userStore.profile?.avatarUrl
    ?? "/images/users/fujipp/profile-fujipp.png"
));
const qrImageUrl = computed(() => {
    if (!topup.value?.promptPayPayload) return "";

    const params = new URLSearchParams({
        size: "260x260",
        margin: "12",
        data: topup.value.promptPayPayload,
    });

    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
});

function formatMoney(satang: number): string {
    return new Intl.NumberFormat(locale.value === "th" ? "th-TH" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(satang / 100);
}

function clearToast(): void {
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = undefined;
    }

    toast.value = null;
}

function showToast(status: ToastStatus, title: string, description = ""): void {
    clearToast();
    toast.value = { status, title, description };
    toastTimeout = setTimeout(clearToast, status === "success" ? 2600 : 5200);
}

function extractBackendError(rawMessage: string): NormalizedBackendError {
    if (!rawMessage) return { message: "" };

    try {
        const payload = JSON.parse(rawMessage) as BackendErrorPayload;
        const message = payload.message || payload.error || rawMessage;
        const code = payload.code != null ? String(payload.code) : extractSlipCode(message);

        return { code, message, status: payload.status };
    } catch {
        return { code: extractSlipCode(rawMessage), message: rawMessage };
    }
}

function extractSlipCode(message: string): string | undefined {
    return message.match(/\b10\d{2}\b/)?.[0];
}

function normalizeErrorMessage(rawMessage: string, fallback: string): string {
    const backendError = extractBackendError(rawMessage);
    const messageText = backendError.message;
    const lowerMessage = messageText.toLowerCase();

    if (!messageText) return fallback;
    if (backendError.status === 401 || backendError.status === 403) {
        return t("shop.wallet.errors.signInAgain");
    }
    if (backendError.code) {
        const codeMessage = mapSlipOkCode(backendError.code);
        if (codeMessage) return codeMessage;
    }
    if (
        lowerMessage.includes("connection refused")
        || lowerMessage.includes("resourceaccessexception")
        || lowerMessage.includes("localhost:8081")
    ) {
        return t("shop.wallet.errors.unavailable");
    }
    if (lowerMessage.includes("minimum top-up") || lowerMessage.includes("minimum amount")) {
        return t("shop.wallet.errors.minimum", { amount: MIN_TOPUP_THB });
    }
    if (lowerMessage.includes("unauthorized") || lowerMessage.includes("jwt")) {
        return t("shop.wallet.errors.signInAgain");
    }
    if (lowerMessage.includes("already been used") || lowerMessage.includes("1012")) {
        return t("shop.wallet.errors.usedSlip");
    }
    if (lowerMessage.includes("amount") || lowerMessage.includes("1013")) {
        return t("shop.wallet.errors.amountMismatch");
    }
    if (lowerMessage.includes("receiver") || lowerMessage.includes("1014")) {
        return t("shop.wallet.errors.receiverMismatch");
    }
    if (lowerMessage.includes("bank delay") || lowerMessage.includes("1010")) {
        return t("shop.wallet.errors.bankDelay");
    }
    if (lowerMessage.includes("could not read slip")) {
        return t("shop.wallet.errors.unreadableSlip");
    }
    if (lowerMessage.includes("provide exactly one")) {
        return t("shop.wallet.errors.oneFile");
    }
    if (lowerMessage.includes("top-up is already")) {
        return t("shop.wallet.errors.alreadyProcessed");
    }

    return messageText.length > 180 ? fallback : messageText;
}

function mapSlipOkCode(code: string): string {
    const slipOkMessages: Record<string, string> = {
        "1000": t("shop.wallet.slipCodes.1000"),
        "1001": t("shop.wallet.slipCodes.1001"),
        "1002": t("shop.wallet.slipCodes.1002"),
        "1003": t("shop.wallet.slipCodes.1003"),
        "1004": t("shop.wallet.slipCodes.1004"),
        "1005": t("shop.wallet.slipCodes.1005"),
        "1010": t("shop.wallet.slipCodes.1010"),
        "1011": t("shop.wallet.slipCodes.1011"),
        "1012": t("shop.wallet.slipCodes.1012"),
        "1013": t("shop.wallet.slipCodes.1013"),
        "1014": t("shop.wallet.slipCodes.1014"),
    };

    return slipOkMessages[code] ?? "";
}

async function readResponseError(response: Response, fallback: string): Promise<string> {
    const rawMessage = await response.text();
    const statusMessage = response.status === 401 || response.status === 403
        ? t("shop.wallet.errors.signInAgain")
        : fallback;

    return normalizeErrorMessage(rawMessage, statusMessage);
}

async function getAuthHeaders(): Promise<Record<string, string> | null> {
    await userStore.initAuth();

    if (!userStore.accessToken) {
        showToast("warning", t("shop.wallet.signInTitle"), t("shop.wallet.signInBody"));
        return null;
    }

    return { Authorization: `Bearer ${userStore.accessToken}` };
}

async function loadWallet(): Promise<void> {
    const headers = await getAuthHeaders();
    if (!headers) return;

    isLoadingWallet.value = true;
    walletError.value = "";
    try {
        const response = await fetch(`${API_BASE_URL}/api/wallet`, { headers });
        if (!response.ok) {
            throw new Error(await readResponseError(response, t("shop.wallet.loadFailed")));
        }

        const wallet = await response.json() as WalletResponse;
        balanceSatang.value = wallet.balanceSatang;
    } catch (error) {
        walletError.value = error instanceof Error && error.message
            ? error.message
            : t("shop.wallet.loadFailed");
        showToast("error", t("shop.wallet.loadFailedTitle"), walletError.value);
    } finally {
        isLoadingWallet.value = false;
    }
}

function handleCustomAmountInput(value: string): void {
    customAmount.value = value.replace(/[^\d]/g, "");

    topup.value = null;
    currentStep.value = 1;
    clearToast();
}

async function generateQr(): Promise<void> {
    clearToast();
    if (!canGenerateQr.value) return;

    const headers = await getAuthHeaders();
    if (!headers) return;

    isGeneratingQr.value = true;
    try {
        const response = await fetch(`${API_BASE_URL}/api/wallet/topup`, {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ amountSatang: amountThb.value * 100 }),
        });

        if (!response.ok) {
            throw new Error(await readResponseError(response, t("shop.wallet.qrFailed")));
        }

        topup.value = await response.json() as TopupInitResponse;
        currentStep.value = 2;
        showToast(
            "success",
            t("shop.wallet.qrSuccessTitle"),
            t("shop.wallet.qrSuccessBody"),
        );
    } catch (error) {
        showToast(
            "error",
            t("shop.wallet.qrFailedTitle"),
            error instanceof Error && error.message
            ? error.message
            : t("shop.common.retry"),
        );
    } finally {
        isGeneratingQr.value = false;
    }
}

function previousStep(): void {
    if (currentStep.value === 1) {
        goBack();
        return;
    }

    currentStep.value = (currentStep.value - 1) as TopupStep;
}

function nextStep(): void {
    if (currentStep.value === 2) currentStep.value = 3;
}

function setSlipFile(file: File | null): void {
    clearToast();
    if (file && !supportedSlipTypes.includes(file.type)) {
        slipFile.value = null;
        showToast("warning", t("shop.wallet.unsupportedTitle"), t("shop.wallet.unsupportedBody"));
        return;
    }

    slipFile.value = file;
    if (file) {
        showToast("info", t("shop.wallet.slipSelected"), file.name);
    }
}

function handleFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    setSlipFile(target.files?.[0] ?? null);
}

function handleDrop(event: DragEvent): void {
    dragActive.value = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    setSlipFile(file);
}

async function verifySlip(): Promise<void> {
    clearToast();
    const headers = await getAuthHeaders();
    if (!headers) return;

    if (!topup.value) {
        showToast("warning", t("shop.wallet.createQrFirstTitle"), t("shop.wallet.createQrFirstBody"));
        return;
    }
    if (!slipFile.value) {
        showToast("warning", t("shop.wallet.selectSlipTitle"), t("shop.wallet.selectSlipBody"));
        return;
    }
    if (!canVerifySlip.value) return;

    const body = new FormData();
    body.append("reference", topup.value.reference);
    body.append("file", slipFile.value);

    isVerifyingSlip.value = true;
    try {
        const response = await fetch(`${API_BASE_URL}/api/wallet/topup/verify`, {
            method: "POST",
            headers,
            body,
        });

        if (!response.ok) {
            throw new Error(await readResponseError(response, t("shop.wallet.verifyFailed")));
        }

        showToast("success", t("shop.wallet.verifySuccessTitle"), t("shop.wallet.verifySuccessBody"));
        slipFile.value = null;
        topup.value = null;
        currentStep.value = 1;
        await loadWallet();
        window.dispatchEvent(new Event("fujipp:wallet-balance-changed"));
    } catch (error) {
        showToast(
            "error",
            t("shop.wallet.verifyFailedTitle"),
            error instanceof Error && error.message
            ? error.message
            : t("shop.wallet.verifyFailed"),
        );
    } finally {
        isVerifyingSlip.value = false;
    }
}

async function requireSignIn(): Promise<void> {
    if (userStore.isAuthenticated) return;

    await router.push({ name: "login", query: { redirect: "/add-credit" } });
}

function goBack(): void {
    void router.push({ name: "shop-dashboard" });
}

onMounted(async () => {
    await userStore.initAuth();
    if (userStore.isAuthenticated) {
        await loadWallet();
    }
});

onUnmounted(() => {
    clearToast();
});
</script>

<template>
    <div :class="$style.shopWallet">
        <main :class="$style.content">
            <section :class="$style.section" aria-labelledby="shop-wallet-title">
                <h1 id="shop-wallet-title" :class="$style.pageTitle">{{ t("shop.wallet.credit") }}</h1>
            </section>

            <section :class="$style.section" aria-labelledby="shop-wallet-topup-title">
                <section v-if="walletError" :class="$style.statePanel" aria-live="polite">
                    <h2 :class="$style.stateTitle">{{ t("shop.wallet.loadFailedTitle") }}</h2>
                    <p :class="$style.stateText">{{ walletError }}</p>
                    <PrimaryButton @click="loadWallet">{{ t("shop.common.retry") }}</PrimaryButton>
                </section>

                <section :class="$style.walletFlow" :aria-label="t('shop.wallet.topUpLabel')">
                    <WalletCreditCard :class="$style.creditCard" :balance="walletBalance" :holder="walletUsername" :emblem="walletAvatarUrl" />

                    <h2 id="shop-wallet-topup-title" :class="$style.sectionTitle">{{ t("shop.wallet.topUp") }}</h2>

                    <WalletTopupPanel
                        :step="currentStep"
                        :custom-amount="customAmount"
                        :amount-error="amountError"
                        :qr-image-url="qrImageUrl"
                        :topup-amount="topupAmount"
                        :can-generate="canGenerateQr"
                        :can-verify="canVerifySlip"
                        :drag-active="dragActive"
                        :file-name="slipFile?.name"
                        :generating="isGeneratingQr"
                        :verifying="isVerifyingSlip"
                        @back="previousStep"
                        @next="nextStep"
                        @drag-active-change="dragActive = $event"
                        @drop-file="handleDrop"
                        @file-change="handleFileChange"
                        @input-amount="handleCustomAmountInput"
                        @generate="userStore.isAuthenticated ? generateQr() : requireSignIn()"
                        @verify="verifySlip"
                    />

                    <aside :class="$style.instructions">
                        <strong>{{ t("shop.wallet.instructionsTitle") }}</strong>
                        <span>{{ t("shop.wallet.instructionOne") }}</span>
                        <span>{{ t("shop.wallet.instructionTwo") }}</span>
                    </aside>
                </section>
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
    </div>
</template>

<style module>
.shopWallet {
    /* Page-scoped card theme (mirrors the Dashboard/Package) — light in light mode.
       The credit card (WalletBalanceCard) intentionally stays a dark gradient hero. */
    --shop-card-bg: var(--color-neutral-50);
    --shop-card-border: var(--color-input-border);
    --shop-card-text: var(--color-text-primary);
    --shop-card-muted: var(--color-neutral-600);
    --shop-card-inset: var(--color-main-surface);

    display: flex;
    flex-direction: column;
    min-height: 100vh;
    box-sizing: border-box;
    /* Clear the fixed AppNavbar. */
    padding-top: 73px;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

:global(.dark) .shopWallet,
:global([data-theme="dark"]) .shopWallet {
    --shop-card-bg: var(--color-main-surface);
    --shop-card-border: var(--color-main-border);
    --shop-card-text: var(--color-text-secondary);
    --shop-card-muted: var(--color-text-secondary);
    --shop-card-inset: var(--color-main-surface);
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

.pageTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
    line-height: normal;
}

.sectionTitle {
    align-self: stretch;
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h2-section-title);
    font-weight: 800;
    line-height: normal;
}

.walletFlow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-space-8);
}

.creditCard {
    width: min(100%, 472px);
}

.instructions {
    display: flex;
    align-self: stretch;
    flex-direction: column;
    padding: var(--spacing-space-3);
    gap: var(--spacing-space-1);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-size: var(--type-size-caption);
    font-weight: 300;
    line-height: 1.5;
}

.instructions strong {
    font-size: var(--type-size-body-main);
    font-weight: 600;
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
    font-size: var(--type-size-h3-card-title);
    font-weight: 600;
    line-height: 1.2;
}

.stateText {
    color: var(--shop-card-muted, var(--color-text-secondary));
    font-size: var(--type-size-body-small);
    line-height: 1.4;
}

.toastRegion {
    position: fixed;
    bottom: var(--spacing-space-5);
    right: var(--spacing-space-5);
    z-index: 60;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-8) var(--spacing-space-4) var(--spacing-space-10);
    }

    .toastRegion {
        bottom: var(--spacing-space-3);
        right: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}
</style>
