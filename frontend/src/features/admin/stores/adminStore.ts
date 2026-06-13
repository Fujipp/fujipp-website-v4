import { ref } from "vue";
import { defineStore } from "pinia";
import { API_BASE_URL } from "@/config";
import { useUserStore } from "@/stores";
import type { AdminUser } from "@/features/admin/config";

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

    return { users, isLoading, error, adminFetch, fetchUsers, fetchUser };
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
