import { ref } from "vue";
import { defineStore } from "pinia";
import { API_BASE_URL } from "@/config";
import { useUserStore } from "@/stores";
import type {
    AdminUser,
    AdminRuntimePlan,
    AdminFeaturePrice,
    AdminFeature,
    CreateFeaturePricePayload,
    UpdateRuntimePlanPayload,
    UpdateFeaturePricePayload,
    AdminUserSubscriptions,
    AdminRuntimeSubscription,
    AdminFeatureSubscription,
    UpdateRuntimeSubscriptionPayload,
    UpdateFeatureSubscriptionPayload,
    AdminWallet,
    AdminWalletTransaction,
    WalletAdjustPayload,
    UpdateUserPayload,
    AdminBot,
    BotConfig,
    AdminDashboard,
    GrantBotFeaturePayload,
    AdminVpsNode,
    AdminVpsSlot,
    AdminSeat,
    UpdateVpsNodePayload,
} from "@/features/admin/config";

/**
 * Admin API client. Every call hits the backend `/api/admin/**` namespace with the
 * current user's bearer token; the backend enforces the ADMIN role server-side.
 * This store grows per feature PR (pricing, wallet, bots…) — the {@link adminFetch}
 * helper is the shared, typed entry point for all of them.
 */
export const useAdminStore = defineStore("admin", () => {
    const users = ref<AdminUser[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    async function adminFetch<T>(
        path: string,
        options: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
    ): Promise<T> {
        const userStore = useUserStore();
        if (!userStore.accessToken || !userStore.isAdmin) {
            throw new Error("Admin role required");
        }

        const { method = "GET", body } = options;
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${userStore.accessToken}`,
                ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        return await parseResponse<T>(response);
    }

    async function fetchUsers(query = ""): Promise<AdminUser[]> {
        isLoading.value = true;
        error.value = null;
        try {
            const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
            users.value = await adminFetch<AdminUser[]>(`/api/admin/users${search}`);
            return users.value;
        } catch (cause) {
            error.value = getErrorMessage(cause);
            throw cause;
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchUser(userId: string): Promise<AdminUser> {
        isLoading.value = true;
        error.value = null;
        try {
            return await adminFetch<AdminUser>(`/api/admin/users/${userId}`);
        } catch (cause) {
            error.value = getErrorMessage(cause);
            throw cause;
        } finally {
            isLoading.value = false;
        }
    }

    function updateUser(userId: string, payload: UpdateUserPayload): Promise<AdminUser> {
        return adminFetch<AdminUser>(`/api/admin/users/${userId}`, { method: "PATCH", body: payload });
    }

    // ── catalog pricing ──────────────────────────────────────────────────────
    function fetchRuntimePlans(): Promise<AdminRuntimePlan[]> {
        return adminFetch<AdminRuntimePlan[]>("/api/admin/catalog/runtime-plans");
    }

    function updateRuntimePlan(id: string, payload: UpdateRuntimePlanPayload): Promise<AdminRuntimePlan> {
        return adminFetch<AdminRuntimePlan>(`/api/admin/catalog/runtime-plans/${id}`, {
            method: "PATCH",
            body: payload,
        });
    }

    function fetchFeatures(): Promise<AdminFeature[]> {
        return adminFetch<AdminFeature[]>("/api/admin/catalog/features");
    }

    function fetchFeaturePrices(): Promise<AdminFeaturePrice[]> {
        return adminFetch<AdminFeaturePrice[]>("/api/admin/catalog/feature-prices");
    }

    function createFeaturePrice(payload: CreateFeaturePricePayload): Promise<AdminFeaturePrice> {
        return adminFetch<AdminFeaturePrice>("/api/admin/catalog/feature-prices", {
            method: "POST",
            body: payload,
        });
    }

    function updateFeaturePrice(id: string, payload: UpdateFeaturePricePayload): Promise<AdminFeaturePrice> {
        return adminFetch<AdminFeaturePrice>(`/api/admin/catalog/feature-prices/${id}`, {
            method: "PATCH",
            body: payload,
        });
    }

    // ── subscriptions (per-user overrides) ───────────────────────────────────
    function fetchUserSubscriptions(userId: string): Promise<AdminUserSubscriptions> {
        return adminFetch<AdminUserSubscriptions>(`/api/admin/users/${userId}/subscriptions`);
    }

    function updateRuntimeSubscription(
        id: string, payload: UpdateRuntimeSubscriptionPayload,
    ): Promise<AdminRuntimeSubscription> {
        return adminFetch<AdminRuntimeSubscription>(`/api/admin/subscriptions/runtime/${id}`, {
            method: "PATCH",
            body: payload,
        });
    }

    function updateFeatureSubscription(
        id: string, payload: UpdateFeatureSubscriptionPayload,
    ): Promise<AdminFeatureSubscription> {
        return adminFetch<AdminFeatureSubscription>(`/api/admin/subscriptions/features/${id}`, {
            method: "PATCH",
            body: payload,
        });
    }

    // ── wallet (per-user balance + adjustments) ──────────────────────────────
    function fetchUserWallet(userId: string): Promise<AdminWallet> {
        return adminFetch<AdminWallet>(`/api/admin/users/${userId}/wallet`);
    }

    function fetchUserWalletTransactions(userId: string): Promise<AdminWalletTransaction[]> {
        return adminFetch<AdminWalletTransaction[]>(`/api/admin/users/${userId}/wallet/transactions`);
    }

    function adjustUserWallet(userId: string, payload: WalletAdjustPayload): Promise<AdminWallet> {
        return adminFetch<AdminWallet>(`/api/admin/users/${userId}/wallet/adjust`, {
            method: "POST",
            body: payload,
        });
    }

    // ── dashboard ────────────────────────────────────────────────────────────
    function fetchDashboard(): Promise<AdminDashboard> {
        return adminFetch<AdminDashboard>("/api/admin/dashboard");
    }

    // ── bots ─────────────────────────────────────────────────────────────────
    function fetchBots(): Promise<AdminBot[]> {
        return adminFetch<AdminBot[]>("/api/admin/bots");
    }

    function fetchBotConfig(botId: string): Promise<BotConfig> {
        return adminFetch<BotConfig>(`/api/admin/bots/${botId}/config`);
    }

    function updateBotConfig(botId: string, values: Record<string, string>): Promise<BotConfig> {
        return adminFetch<BotConfig>(`/api/admin/bots/${botId}/config`, {
            method: "PUT",
            body: { values },
        });
    }

    function transferBot(botId: string, newUserId: string): Promise<AdminBot> {
        return adminFetch<AdminBot>(`/api/admin/bots/${botId}/transfer`, {
            method: "POST",
            body: { newUserId },
        });
    }

    // ── per-bot runtime control (proxied to the orchestrator) ────────────────────
    function botRuntimeAction(botId: string, action: "start" | "stop" | "restart"): Promise<unknown> {
        return adminFetch<unknown>(`/api/admin/bots/${botId}/${action}`, { method: "POST" });
    }

    function botStatus(botId: string): Promise<{ state?: string }> {
        return adminFetch<{ state?: string }>(`/api/admin/bots/${botId}/status`);
    }

    // ── per-bot subscriptions (runtime + features for this bot) ──────────────────
    function fetchBotSubscriptions(botId: string): Promise<AdminUserSubscriptions> {
        return adminFetch<AdminUserSubscriptions>(`/api/admin/bots/${botId}/subscriptions`);
    }

    function grantBotRuntime(botId: string, runtimePlanId: string): Promise<AdminRuntimeSubscription> {
        return adminFetch<AdminRuntimeSubscription>(`/api/admin/bots/${botId}/runtime`, {
            method: "POST",
            body: { runtimePlanId },
        });
    }

    function grantBotFeature(botId: string, payload: GrantBotFeaturePayload): Promise<AdminFeatureSubscription> {
        return adminFetch<AdminFeatureSubscription>(`/api/admin/bots/${botId}/feature`, {
            method: "POST",
            body: payload,
        });
    }

    // ── VPS / runtime seats ─────────────────────────────────────────────────
    async function fetchVpsNodes(): Promise<AdminVpsNode[]> {
        return adminFetch<AdminVpsNode[]>("/api/admin/vps-nodes");
    }

    async function fetchVpsSlots(nodeId: string): Promise<AdminVpsSlot[]> {
        return adminFetch<AdminVpsSlot[]>(`/api/admin/vps-nodes/${nodeId}/slots`);
    }

    async function fetchRuntimeCabinet(): Promise<AdminSeat[]> {
        return adminFetch<AdminSeat[]>("/api/admin/runtime/cabinet");
    }

    async function updateVpsNode(nodeId: string, payload: UpdateVpsNodePayload): Promise<AdminVpsNode> {
        return adminFetch<AdminVpsNode>(`/api/admin/vps-nodes/${nodeId}`, { method: "PATCH", body: payload });
    }

    async function setSlotStatus(nodeId: string, slotId: string, status: string): Promise<AdminVpsSlot> {
        return adminFetch<AdminVpsSlot>(`/api/admin/vps-nodes/${nodeId}/slots/${slotId}`, {
            method: "PATCH", body: { status },
        });
    }

    async function moveRuntimeSeat(runtimeId: string, vpsSlotId: string): Promise<unknown> {
        return adminFetch<unknown>(`/api/admin/runtime/${runtimeId}/move-seat`, {
            method: "POST", body: { vpsSlotId },
        });
    }

    return {
        users, isLoading, error, adminFetch,
        fetchVpsNodes, fetchVpsSlots, fetchRuntimeCabinet, updateVpsNode, setSlotStatus, moveRuntimeSeat,
        fetchUsers, fetchUser, updateUser,
        fetchRuntimePlans, updateRuntimePlan,
        fetchFeatures, fetchFeaturePrices, createFeaturePrice, updateFeaturePrice,
        fetchUserSubscriptions, updateRuntimeSubscription, updateFeatureSubscription,
        fetchUserWallet, fetchUserWalletTransactions, adjustUserWallet,
        fetchBots, fetchBotConfig, updateBotConfig, transferBot,
        botRuntimeAction, botStatus, fetchBotSubscriptions, grantBotRuntime, grantBotFeature,
        fetchDashboard,
    };
});

async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed with status ${response.status}`);
    }
    if (response.status === 204) {
        return undefined as T;
    }
    return await response.json() as T;
}

function getErrorMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : "Unexpected admin request error";
}
