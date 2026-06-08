<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ShopSidebar, FeatureConfigForm } from "@/features/shop/components";
import { StatusToast, type SelectFieldOption } from "@/shared/ui";
import { useUserStore } from "@/stores";
import { API_BASE_URL } from "@/config";
import {
    type BotConfigResponse,
    type FeatureDefinition,
} from "@/features/shop/config/featureConfig";

type ToastStatus = "info" | "success" | "warning" | "error";

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

onMounted(async () => {
    await userStore.initAuth();
    if (!userStore.isAuthenticated) {
        await router.push({ name: "login", query: { redirect: `/shop/bots/${botId.value}/config` } });
        return;
    }
    await loadConfig();
});
</script>

<template>
    <div :class="$style.botConfig">
        <ShopSidebar v-model="isSidebarOpen" />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.titleSection">
                <h1 :class="$style.pageTitle" class="type-h1-page-title-sb">BOT CONFIG</h1>
                <p :class="$style.subtitle" class="type-body-small-r">ตั้งค่าฟีเจอร์ของบอท · {{ botId || "—" }}</p>
            </section>

            <p v-if="isLoading" :class="$style.state" class="type-body-small-r">กำลังโหลด…</p>
            <section v-else-if="configError" :class="$style.statePanel" aria-live="polite">
                <h2 :class="$style.stateTitle">โหลดการตั้งค่าไม่สำเร็จ</h2>
                <p :class="$style.stateText">{{ configError }}</p>
                <button type="button" :class="$style.retryButton" @click="loadConfig">ลองใหม่</button>
            </section>
            <p v-else-if="features.length === 0" :class="$style.state" class="type-body-small-r">
                บอทนี้ยังไม่มีฟีเจอร์ที่เปิดใช้งาน — ซื้อฟีเจอร์ในหน้า Package ก่อน
            </p>

            <div v-else :class="$style.forms">
                <FeatureConfigForm
                    v-for="feature in features"
                    :key="feature.code"
                    :feature="feature"
                    :model-value="values"
                    :channel-options="channelOptions"
                    :role-options="roleOptions"
                    :saving="isSaving"
                    @submit="saveFeature"
                />
            </div>
        </main>

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
    padding: var(--spacing-space-8);
    gap: var(--spacing-space-6);
    transition: margin-left 180ms ease;
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
    color: var(--color-text-primary);
}

.pageTitle {
    margin: 0;
}

.subtitle {
    opacity: 0.7;
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
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
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

.forms {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-6);
    max-width: 960px;
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
        padding: var(--spacing-space-5);
    }

    .sidebarOpen,
    .sidebarClosed {
        margin-left: 44px;
    }

    .toastRegion {
        bottom: var(--spacing-space-3);
        right: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}
</style>
