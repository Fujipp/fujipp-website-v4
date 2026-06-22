<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import type { AdminUser } from "@/features/admin/config";
import { SearchField } from "@/shared/ui";

const router = useRouter();
const adminStore = useAdminStore();

const query = ref("");
const users = ref<AdminUser[]>([]);
const isLoading = ref(false);
const loadError = ref("");
let searchDebounce: ReturnType<typeof setTimeout> | undefined;

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        users.value = await adminStore.fetchUsers(query.value);
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load users";
    } finally {
        isLoading.value = false;
    }
}

function onSearch(value: string): void {
    query.value = value;
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(load, 250);
}

function openUser(user: AdminUser): void {
    void router.push({ name: "admin-user-detail", params: { userId: user.id } });
}

function displayName(user: AdminUser): string {
    return user.displayName || user.username || user.email || user.id.slice(0, 8);
}

function formatJoined(iso: string): string {
    return new Date(iso).toLocaleDateString();
}

onMounted(load);
</script>

<template>
    <AdminLayout title="Users">
        <template #actions>
            <SearchField
                :model-value="query"
                aria-label="Search users"
                placeholder="Search name, username, email"
                @update:model-value="onSearch"
            />
        </template>

        <p v-if="loadError" :class="$style.error" role="alert">{{ loadError }}</p>

        <div :class="$style.panel">
            <table :class="$style.table">
                <thead>
                    <tr>
                        <th :class="$style.th">User</th>
                        <th :class="$style.th">Username</th>
                        <th :class="$style.th">Email</th>
                        <th :class="$style.th">Role</th>
                        <th :class="$style.th">Joined</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="user in users"
                        :key="user.id"
                        :class="$style.row"
                        tabindex="0"
                        @click="openUser(user)"
                        @keydown.enter="openUser(user)"
                    >
                        <td :class="$style.td">
                            <span :class="$style.userCell">
                                <img
                                    v-if="user.avatarUrl"
                                    :src="user.avatarUrl"
                                    alt=""
                                    aria-hidden="true"
                                    :class="$style.avatar"
                                >
                                <span v-else :class="$style.avatarFallback" aria-hidden="true" />
                                <span :class="$style.name">{{ displayName(user) }}</span>
                            </span>
                        </td>
                        <td :class="$style.td">{{ user.username ?? "—" }}</td>
                        <td :class="$style.td">{{ user.email ?? "—" }}</td>
                        <td :class="$style.td">
                            <span :class="[$style.roleTag, user.role === 'ADMIN' ? $style.roleAdmin : '']">
                                {{ user.role }}
                            </span>
                        </td>
                        <td :class="$style.td">{{ formatJoined(user.createdAt) }}</td>
                    </tr>
                </tbody>
            </table>

            <p v-if="!isLoading && users.length === 0" :class="$style.empty">No users found.</p>
            <p v-if="isLoading" :class="$style.empty">Loading…</p>
        </div>
    </AdminLayout>
</template>

<style module>
.panel {
    box-sizing: border-box;
    overflow-x: auto;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
}

.table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.th {
    padding: 14px 16px;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-disabled);
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
    white-space: nowrap;
}

.row {
    cursor: pointer;
    transition: background-color 140ms ease;
}

.row:hover { background-color: var(--shop-row-hover); }
.row:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: -2px;
}

.td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
    white-space: nowrap;
}

.userCell { display: inline-flex; align-items: center; gap: 10px; }

.avatar,
.avatarFallback {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
}

.avatar { object-fit: cover; }
.avatarFallback { background-color: var(--color-main-secondary); }

.name { font-weight: 500; }

.roleTag {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border: 1px solid var(--shop-card-border);
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 600;
}

.roleAdmin {
    border-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-bg);
}

.empty {
    margin: 0;
    padding: 20px 16px;
    color: var(--color-text-disabled);
}

.error {
    margin: 0;
    color: var(--color-status-error);
}
</style>
