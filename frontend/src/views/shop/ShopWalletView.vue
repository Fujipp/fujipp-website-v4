<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter, type RouteLocationRaw } from "vue-router";
import ShopSidebar from "@/components/layout/AppSidebar/ShopSidebar.vue";
import StatusToast from "@/components/ui/toasts/StatusToast.vue";
import { useUserStore } from "@/stores";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080";
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
const toast = ref<WalletToast | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;

const shopNavItems: readonly { label: string; icon: string; to?: RouteLocationRaw }[] = [
    { label: "Dashboard", icon: "/images/icons/sidebar/home.svg", to: { name: "shop-dashboard" } },
    { label: "Package", icon: "/images/icons/sidebar/package.svg" },
    { label: "WALLET", icon: "/images/icons/sidebar/wallet.svg", to: { name: "shop-wallet" } },
    { label: "History", icon: "/images/icons/sidebar/history.svg" },
];

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
    try {
        const response = await fetch(`${API_BASE_URL}/api/wallet`, { headers });
        if (!response.ok) return;

        const wallet = await response.json() as WalletResponse;
        balanceSatang.value = wallet.balanceSatang;
    } catch {
        // The main backend may not expose the billing wallet proxy yet.
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
        <ShopSidebar
            v-model="isSidebarOpen"
            :items="shopNavItems"
        />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.titleSection">
                <h1 :class="$style.pageTitle" class="type-h1-page-title-sb">WALLET</h1>
                <div :class="$style.divider" aria-hidden="true" />
            </section>

            <section :class="$style.sectionGroup" aria-labelledby="wallet-amount-title">
                <h2 id="wallet-amount-title" :class="$style.sectionTitle" class="type-h2-section-title-r">Amount</h2>
                <article :class="$style.amountCard" aria-live="polite">
                    <span :class="$style.balanceValue">{{ walletBalance }}</span>
                    <span :class="$style.balanceUnit">THB</span>
                    <span v-if="isLoadingWallet" :class="$style.helperText">Loading wallet...</span>
                </article>
            </section>

            <section :class="$style.sectionGroup" aria-labelledby="wallet-topup-title">
                <h2 id="wallet-topup-title" :class="$style.sectionTitle" class="type-h2-section-title-r">Top up</h2>

                <div :class="$style.topupLayout">
                    <article :class="$style.instructionCard">
                        <p :class="$style.instructionText">
                            วิธีการชำระเงิน<br>
                            1) เข้าแอพธนาคาร ชำระเงินด้วย QR CODE ที่สร้างขึ้น ชื่อ นาย อนวัตร กรุดธูป<br>
                            2) เมื่อโอนเงินเสร็จแล้ว โปรดนำสลิปที่ได้จากการโอนเงินมาแนบในเว็บ
                        </p>
                    </article>

                    <article :class="$style.qrCard">
                        <div :class="$style.qrPreview">
                            <img
                                v-if="qrImageUrl"
                                :src="qrImageUrl"
                                :alt="`PromptPay QR Code for ${topupAmount} THB`"
                                :class="$style.qrImage"
                            >
                            <span v-else :class="$style.qrPlaceholder">QR CODE</span>
                        </div>

                        <div :class="$style.topupControls">
                            <div :class="$style.quickAmountGrid" aria-label="Quick top-up amounts">
                                <button
                                    v-for="amount in quickAmounts"
                                    :key="amount"
                                    type="button"
                                    :class="[$style.quickAmount, selectedAmount === amount ? $style.quickAmountActive : '']"
                                    @click="selectAmount(amount)"
                                >
                                    {{ amount }}
                                </button>
                            </div>

                            <label :class="$style.fieldGroup" for="wallet-topup-amount">
                                <span :class="$style.fieldLabel">Minimum amount is 50</span>
                                <input
                                    id="wallet-topup-amount"
                                    :value="customAmount"
                                    inputmode="numeric"
                                    autocomplete="off"
                                    :class="$style.input"
                                    :aria-invalid="!!amountError"
                                    aria-describedby="wallet-topup-error"
                                    placeholder="50"
                                    @input="handleCustomAmountInput"
                                >
                                <span id="wallet-topup-error" :class="$style.errorText">{{ amountError }}</span>
                            </label>

                            <button
                                type="button"
                                :class="$style.primaryButton"
                                :disabled="!canGenerateQr"
                                @click="userStore.isAuthenticated ? generateQr() : requireSignIn()"
                            >
                                {{ isGeneratingQr ? "Generating..." : "Generate QR" }}
                            </button>

                            <div v-if="topup" :class="$style.referenceBox">
                                <span>Reference</span>
                                <strong>{{ topup.reference }}</strong>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section :class="$style.sectionGroup" aria-labelledby="wallet-slip-title">
                <h2 id="wallet-slip-title" :class="$style.sectionTitle" class="type-h2-section-title-r">Slip Verify</h2>

                <article :class="$style.slipCard">
                    <label
                        :class="[$style.dropZone, dragActive ? $style.dropZoneActive : '']"
                        for="wallet-slip-file"
                        @dragenter.prevent="dragActive = true"
                        @dragover.prevent="dragActive = true"
                        @dragleave.prevent="dragActive = false"
                        @drop.prevent="handleDrop"
                    >
                        <span :class="$style.dropTitle">ไฟล์สลิปการโอนเงิน</span>
                        <span :class="$style.dropAction">{{ slipFile?.name ?? "เลือกไฟล์" }}</span>
                        <span :class="$style.dropHint">หรือ<br>ลากแล้วปล่อยไฟล์</span>
                        <input
                            id="wallet-slip-file"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            :class="$style.fileInput"
                            @change="handleFileChange"
                        >
                    </label>

                    <button
                        type="button"
                        :class="$style.primaryButton"
                        :disabled="isVerifyingSlip"
                        @click="verifySlip"
                    >
                        {{ isVerifyingSlip ? "Confirming..." : "Confirm" }}
                    </button>
                </article>
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
    display: flex;
    min-height: 100vh;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

.content {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-12) var(--spacing-space-6) var(--spacing-space-16);
    gap: var(--spacing-space-5);
    transition: margin-left 180ms ease;
}

.sidebarOpen {
    margin-left: 194px;
}

.sidebarClosed {
    margin-left: 44px;
}

.titleSection,
.sectionGroup {
    display: flex;
    flex-direction: column;
}

.sectionGroup {
    gap: var(--spacing-space-3);
}

.pageTitle,
.sectionTitle {
    margin: 0;
}

.divider {
    height: 1px;
    background-color: var(--color-main-divider);
}

.amountCard,
.instructionCard,
.qrCard,
.slipCard {
    box-sizing: border-box;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
}

.amountCard {
    display: flex;
    min-height: 120px;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-6);
    background: var(--gradient-card-highlight);
    color: var(--color-text-secondary);
}

.balanceValue {
    font-size: 48px;
    font-weight: 600;
    line-height: normal;
}

.balanceUnit,
.helperText {
    font-size: 16px;
    font-weight: 300;
}

.topupLayout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 1.15fr);
    gap: var(--spacing-space-5);
    align-items: stretch;
}

.instructionCard {
    display: flex;
    align-items: center;
    min-height: 180px;
    padding: var(--spacing-space-6);
    background-color: var(--color-main-background);
}

.instructionText {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 20px;
    font-weight: 300;
    line-height: 1.55;
    text-align: left;
}

.qrCard {
    display: grid;
    grid-template-columns: minmax(220px, 0.8fr) minmax(240px, 1fr);
    gap: var(--spacing-space-5);
    padding: var(--spacing-space-6);
    background-color: var(--color-main-background);
}

.qrPreview {
    display: flex;
    min-height: 280px;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--spacing-space-4);
    border: 1px dashed var(--color-main-border);
    border-radius: var(--radius-lg);
    background-color: var(--color-neutral-50);
}

.qrImage {
    width: min(100%, 260px);
    aspect-ratio: 1;
    object-fit: contain;
}

.qrPlaceholder {
    color: var(--color-text-disabled);
    font-size: 28px;
    font-weight: 600;
}

.topupControls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
}

.quickAmountGrid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--spacing-space-2);
}

.quickAmount,
.primaryButton {
    border: 0;
    border-radius: var(--radius-md);
    font-family: inherit;
    cursor: pointer;
    transition:
        background-color 160ms ease,
        border-color 160ms ease,
        color 160ms ease,
        opacity 160ms ease;
}

.quickAmount {
    min-height: 40px;
    border: 1px solid var(--color-main-divider);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-size: 16px;
    font-weight: 300;
}

.quickAmount:hover,
.quickAmountActive {
    border-color: var(--color-main-primary);
    background-color: var(--color-main-primary);
    color: var(--color-button-primary-btn-text-active);
}

.fieldGroup {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
    text-align: left;
}

.fieldLabel,
.errorText,
.referenceBox {
    font-size: 14px;
    font-weight: 300;
}

.input {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-md);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
}

.input:hover {
    border-color: var(--color-input-border-hover);
}

.input:focus {
    border-color: var(--color-input-border-focus);
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.errorText {
    color: var(--color-status-error);
}

.primaryButton {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-space-3) var(--spacing-space-6);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font-size: 16px;
    font-weight: 300;
}

.primaryButton:hover:not(:disabled) {
    background-color: var(--color-button-primary-btn-hover);
}

.primaryButton:active:not(:disabled) {
    background-color: var(--color-button-primary-btn-active);
}

.primaryButton:disabled {
    background-color: var(--color-button-primary-btn-disabled);
    cursor: not-allowed;
    opacity: 0.75;
}

.primaryButton:focus-visible,
.quickAmount:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.referenceBox {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-1);
    padding: var(--spacing-space-3);
    border-radius: var(--radius-md);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    overflow-wrap: anywhere;
}

.referenceBox strong {
    font-weight: 600;
}

.slipCard {
    display: flex;
    align-items: stretch;
    gap: var(--spacing-space-5);
    padding: var(--spacing-space-6);
    background-color: var(--color-main-background);
}

.dropZone {
    position: relative;
    display: flex;
    min-height: 180px;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    gap: var(--spacing-space-2);
    padding: var(--spacing-space-6);
    border: 1px dashed var(--color-main-border);
    border-radius: var(--radius-lg);
    color: var(--color-text-primary);
    text-align: center;
    cursor: pointer;
}

.dropZoneActive {
    border-color: var(--color-main-primary);
    background-color: var(--color-neutral-50);
}

.dropTitle,
.dropAction,
.dropHint {
    font-size: 20px;
    font-weight: 300;
}

.dropAction {
    font-weight: 600;
    overflow-wrap: anywhere;
}

.fileInput {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
}

.toastRegion {
    position: fixed;
    top: var(--spacing-space-5);
    right: var(--spacing-space-5);
    z-index: 60;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
}

@media (max-width: 980px) {
    .topupLayout,
    .qrCard {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-12) var(--spacing-space-3) var(--spacing-space-16);
    }

    .balanceValue {
        font-size: 40px;
    }

    .quickAmountGrid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .slipCard {
        flex-direction: column;
    }

    .toastRegion {
        top: var(--spacing-space-3);
        right: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}
</style>
