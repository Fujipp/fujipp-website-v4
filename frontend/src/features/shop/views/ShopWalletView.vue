<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
    ShopSidebar,
    WalletBalanceCard,
    WalletTopupCard,
} from "@/features/shop/components";
import { StatusToast } from "@/shared/ui";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { useUserStore } from "@/stores";
import { API_BASE_URL } from "@/config";

const MIN_TOPUP_THB = 50;
const quickAmounts = [50, 100, 250, 500, 1000] as const;
const supportedSlipTypes = ["image/png", "image/jpeg", "image/webp"];

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

const isSidebarOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);
const balanceSatang = ref(0);
const selectedAmount = ref<number | null>(MIN_TOPUP_THB);
const customAmount = ref(String(MIN_TOPUP_THB));
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
const walletBalance = computed(() => formatMoney(balanceSatang.value));
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
    return new Intl.NumberFormat("th-TH", {
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
        return "กรุณาเข้าสู่ระบบใหม่ แล้วลองทำรายการอีกครั้ง";
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
        return "ระบบกระเป๋าเงินยังไม่พร้อมใช้งาน กรุณาเปิด billing-service ที่พอร์ต 8081";
    }
    if (lowerMessage.includes("minimum top-up") || lowerMessage.includes("minimum amount")) {
        return "ยอดเติมขั้นต่ำคือ 50 บาท";
    }
    if (lowerMessage.includes("unauthorized") || lowerMessage.includes("jwt")) {
        return "กรุณาเข้าสู่ระบบใหม่ แล้วลองทำรายการอีกครั้ง";
    }
    if (lowerMessage.includes("already been used") || lowerMessage.includes("1012")) {
        return "สลิปนี้ถูกใช้งานไปแล้ว กรุณาใช้สลิปใหม่";
    }
    if (lowerMessage.includes("amount") || lowerMessage.includes("1013")) {
        return "ยอดเงินในสลิปไม่ตรงกับยอด QR Code นี้";
    }
    if (lowerMessage.includes("receiver") || lowerMessage.includes("1014")) {
        return "บัญชีผู้รับในสลิปไม่ตรงกับบัญชีร้าน";
    }
    if (lowerMessage.includes("bank delay") || lowerMessage.includes("1010")) {
        return "ธนาคารยังตรวจสอบสลิปไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่";
    }
    if (lowerMessage.includes("could not read slip")) {
        return "อ่านรูปสลิปไม่ได้ กรุณาอัปโหลดรูปที่ชัดกว่านี้";
    }
    if (lowerMessage.includes("provide exactly one")) {
        return "กรุณาส่งสลิปเพียงไฟล์เดียวต่อการยืนยันหนึ่งครั้ง";
    }
    if (lowerMessage.includes("top-up is already")) {
        return "รายการเติมเงินนี้ถูกดำเนินการไปแล้ว กรุณาสร้าง QR Code ใหม่";
    }

    return messageText.length > 180 ? fallback : messageText;
}

function mapSlipOkCode(code: string): string {
    const slipOkMessages: Record<string, string> = {
        "1000": "ไม่พบข้อมูลสลิปนี้ กรุณาตรวจสอบรูปสลิปอีกครั้ง",
        "1001": "รูปสลิปไม่ถูกต้องหรืออ่านข้อมูลไม่ได้ กรุณาอัปโหลดรูปใหม่",
        "1002": "รูปสลิปไม่ชัดเจน กรุณาใช้ภาพต้นฉบับจากแอปธนาคาร",
        "1003": "ไม่พบ QR ในสลิป กรุณาอัปโหลดสลิปที่มี QR ครบถ้วน",
        "1004": "รูปสลิปมีรูปแบบไม่ถูกต้อง กรุณาใช้ไฟล์ PNG, JPG หรือ WebP",
        "1005": "ข้อมูลสลิปไม่ครบ กรุณาตรวจสอบว่าสลิปเป็นรายการโอนเงินสำเร็จ",
        "1010": "ธนาคารยังตรวจสอบสลิปไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่",
        "1011": "ไม่สามารถตรวจสอบสลิปนี้ได้ กรุณาลองใหม่หรือใช้สลิปอื่น",
        "1012": "สลิปนี้ถูกใช้งานไปแล้ว กรุณาใช้สลิปใหม่",
        "1013": "ยอดเงินในสลิปไม่ตรงกับยอด QR Code นี้",
        "1014": "บัญชีผู้รับในสลิปไม่ตรงกับบัญชีร้าน",
    };

    return slipOkMessages[code] ?? "";
}

async function readResponseError(response: Response, fallback: string): Promise<string> {
    const rawMessage = await response.text();
    const statusMessage = response.status === 401 || response.status === 403
        ? "กรุณาเข้าสู่ระบบใหม่ แล้วลองทำรายการอีกครั้ง"
        : fallback;

    return normalizeErrorMessage(rawMessage, statusMessage);
}

async function getAuthHeaders(): Promise<Record<string, string> | null> {
    await userStore.initAuth();

    if (!userStore.accessToken) {
        showToast("warning", "กรุณาเข้าสู่ระบบ", "ต้องเข้าสู่ระบบก่อนใช้งานกระเป๋าเงิน");
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
            throw new Error(await readResponseError(response, "โหลด Wallet ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
        }

        const wallet = await response.json() as WalletResponse;
        balanceSatang.value = wallet.balanceSatang;
    } catch (error) {
        walletError.value = error instanceof Error && error.message
            ? error.message
            : "โหลด Wallet ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
        showToast("error", "โหลด Wallet ไม่สำเร็จ", walletError.value);
    } finally {
        isLoadingWallet.value = false;
    }
}

function selectAmount(amount: number): void {
    selectedAmount.value = amount;
    customAmount.value = String(amount);
    topup.value = null;
    clearToast();
}

function handleCustomAmountInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    customAmount.value = target.value.replace(/[^\d]/g, "");
    const numericValue = Number(customAmount.value);

    selectedAmount.value = quickAmounts.includes(numericValue as typeof quickAmounts[number])
        ? numericValue
        : null;

    topup.value = null;
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
            throw new Error(await readResponseError(response, "สร้าง QR Code ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
        }

        topup.value = await response.json() as TopupInitResponse;
        showToast(
            "success",
            "สร้าง QR Code สำเร็จ",
            "ชำระเงินด้วย QR Code นี้ แล้วอัปโหลดสลิปเพื่อยืนยัน",
        );
    } catch (error) {
        showToast(
            "error",
            "สร้าง QR Code ไม่สำเร็จ",
            error instanceof Error && error.message
            ? error.message
            : "กรุณาลองใหม่อีกครั้ง",
        );
    } finally {
        isGeneratingQr.value = false;
    }
}

function setSlipFile(file: File | null): void {
    clearToast();
    if (file && !supportedSlipTypes.includes(file.type)) {
        slipFile.value = null;
        showToast("warning", "ไฟล์ไม่รองรับ", "กรุณาอัปโหลดสลิปเป็นไฟล์ PNG, JPG หรือ WebP");
        return;
    }

    slipFile.value = file;
    if (file) {
        showToast("info", "เลือกสลิปแล้ว", file.name);
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
        showToast("warning", "กรุณาสร้าง QR ก่อน", "ต้องสร้าง QR Code ก่อนยืนยันสลิป");
        return;
    }
    if (!slipFile.value) {
        showToast("warning", "กรุณาเลือกสลิป", "ต้องอัปโหลดสลิปก่อนกดยืนยัน");
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
            throw new Error(await readResponseError(response, "ยืนยันสลิปไม่สำเร็จ กรุณาตรวจสอบสลิปแล้วลองใหม่"));
        }

        showToast("success", "ยืนยันสลิปสำเร็จ", "ระบบเติมเงินเข้ากระเป๋าให้แล้ว");
        slipFile.value = null;
        topup.value = null;
        await loadWallet();
    } catch (error) {
        showToast(
            "error",
            "ยืนยันสลิปไม่สำเร็จ",
            error instanceof Error && error.message
            ? error.message
            : "กรุณาตรวจสอบสลิปแล้วลองใหม่",
        );
    } finally {
        isVerifyingSlip.value = false;
    }
}

async function requireSignIn(): Promise<void> {
    if (userStore.isAuthenticated) return;

    await router.push({ name: "login", query: { redirect: "/shop/wallet" } });
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
        <ShopSidebar v-model="isSidebarOpen" />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.titleSection">
                <div :class="$style.titleRow">
                    <h1 :class="$style.pageTitle" class="type-h1-page-title-sb">Wallet</h1>
                    <div :class="$style.titleActions">
                        <PrimaryButton :to="{ name: 'shop-package' }">ไป Package</PrimaryButton>
                        <SecondaryButton :to="{ name: 'shop-guide' }">ดูคู่มือ</SecondaryButton>
                    </div>
                </div>
                <div :class="$style.divider" aria-hidden="true" />
            </section>

            <section v-if="walletError" :class="$style.statePanel" aria-live="polite">
                <h2 :class="$style.stateTitle">โหลด Wallet ไม่สำเร็จ</h2>
                <p :class="$style.stateText">{{ walletError }}</p>
                <PrimaryButton @click="loadWallet">ลองใหม่</PrimaryButton>
            </section>

            <section :class="$style.walletGrid" aria-label="Wallet top up">
                <WalletBalanceCard
                    :avatar-url="walletAvatarUrl"
                    :balance="walletBalance"
                    :loading="isLoadingWallet"
                    :username="walletUsername"
                />

                <WalletTopupCard
                    :quick-amounts="quickAmounts"
                    :selected-amount="selectedAmount"
                    :custom-amount="customAmount"
                    :amount-error="amountError"
                    :qr-image-url="qrImageUrl"
                    :topup-amount="topupAmount"
                    :topup-reference="topup?.reference"
                    :can-generate="canGenerateQr"
                    :drag-active="dragActive"
                    :file-name="slipFile?.name"
                    :generating="isGeneratingQr"
                    :verifying="isVerifyingSlip"
                    @drag-active-change="dragActive = $event"
                    @drop-file="handleDrop"
                    @file-change="handleFileChange"
                    @select-amount="selectAmount"
                    @input-amount="handleCustomAmountInput"
                    @generate="userStore.isAuthenticated ? generateQr() : requireSignIn()"
                    @verify="verifySlip"
                />
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

    display: flex;
    min-height: 100vh;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

:global(.dark) .shopWallet,
:global([data-theme="dark"]) .shopWallet {
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

.titleSection {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
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
    font-size: 32px;
    font-weight: 600;
    line-height: 1.15;
}

.divider {
    height: 1px;
    background-color: var(--color-main-divider);
}

.walletGrid {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: var(--spacing-space-5);
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
    line-height: 1.2;
}

.stateText {
    color: var(--shop-card-muted, var(--color-text-secondary));
    font-size: 18px;
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
        padding: var(--spacing-space-5) var(--spacing-space-3) var(--spacing-space-10);
    }

    .sidebarOpen,
    .sidebarClosed {
        margin-left: 44px;
    }

    .walletGrid {
        justify-content: center;
    }

    .titleRow {
        flex-direction: column;
        gap: var(--spacing-space-3);
    }

    .titleActions {
        justify-content: flex-start;
    }

    .toastRegion {
        bottom: var(--spacing-space-3);
        right: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}
</style>
