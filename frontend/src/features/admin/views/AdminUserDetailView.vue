<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { AdminLayout, UserSubscriptionsPanel, UserWalletPanel } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import type { AdminUser } from "@/features/admin/config";

const route = useRoute();
const adminStore = useAdminStore();

const user = ref<AdminUser | null>(null);
const isLoading = ref(false);
const loadError = ref("");

const userId = computed(() => String(route.params.userId));

const fields = computed(() => {
    const current = user.value;
    if (!current) return [];
    return [
        { label: "User ID", value: current.id },
        { label: "Display name", value: current.displayName ?? "—" },
        { label: "Username", value: current.username ?? "—" },
        { label: "Email", value: current.email ?? "—" },
        { label: "Role", value: current.role },
        { label: "Provider", value: current.provider ?? "—" },
        { label: "Website", value: current.website ?? "—" },
        { label: "GitHub", value: current.githubUrl ?? "—" },
        { label: "Joined", value: new Date(current.createdAt).toLocaleString() },
    ];
});

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        user.value = await adminStore.fetchUser(userId.value);
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load user";
    } finally {
        isLoading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <AdminLayout :title="user ? (user.displayName || user.username || 'User') : 'User'">
        <template #actions>
            <RouterLink :to="{ name: 'admin-users' }" :class="$style.back">← Back to users</RouterLink>
        </template>

        <p v-if="loadError" :class="$style.error" role="alert">{{ loadError }}</p>
        <p v-if="isLoading" :class="$style.note">Loading…</p>

        <section v-if="user" :class="$style.panel" aria-label="User profile">
            <div v-for="field in fields" :key="field.label" :class="$style.fieldRow">
                <span :class="$style.fieldLabel">{{ field.label }}</span>
                <span :class="$style.fieldValue">{{ field.value }}</span>
            </div>
        </section>

        <UserWalletPanel v-if="user" :user-id="userId" />
        <UserSubscriptionsPanel v-if="user" :user-id="userId" />
    </AdminLayout>
</template>

<style module>
.panel {
    box-sizing: border-box;
    max-width: 640px;
    padding: 8px 20px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.fieldRow {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid var(--color-main-divider);
}

.fieldRow:last-child { border-bottom: 0; }

.fieldLabel {
    flex: 0 0 140px;
    color: var(--color-text-disabled);
    font-size: 14px;
}

.fieldValue {
    flex: 1;
    word-break: break-word;
}

.back {
    color: var(--color-text-primary);
    text-decoration: none;
    font-size: 14px;
}

.back:hover { text-decoration: underline; }

.note { margin: 0; color: var(--color-text-disabled); }
.error { margin: 0; color: var(--color-status-error); }
</style>
