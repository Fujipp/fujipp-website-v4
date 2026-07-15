<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import type { AdminUser } from "@/features/admin/config";
import { PrimaryButton, SearchField } from "@/shared/ui";
import { icons } from "@/config";

const router = useRouter();
const adminStore = useAdminStore();

const query = ref("");
const users = ref<AdminUser[]>([]);
const isLoading = ref(false);
const loadError = ref("");
const transitioningUserId = ref<string | null>(null);
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

async function openUser(user: AdminUser): Promise<void> {
    const navigate = () => router.push({ name: "admin-user-detail", params: { userId: user.id } });
    const transitionDocument = document as Document & {
        startViewTransition?: (callback: () => Promise<unknown>) => unknown;
    };

    transitioningUserId.value = user.id;
    await nextTick();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !transitionDocument.startViewTransition) {
        await navigate();
        return;
    }
    transitionDocument.startViewTransition(navigate);
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
    <AdminLayout title="Users config">
        <template #actions>
            <PrimaryButton width-mode="hug" :leading-icon="icons.directionLeft" :to="{ name: 'admin-dashboard' }">Back</PrimaryButton>
        </template>

        <div :class="$style.tableToolbar">
            <nav class="type-caption-sb" :class="$style.breadcrumb" aria-label="Users config breadcrumb">Main</nav>
            <SearchField
                :model-value="query"
                :class="$style.searchField"
                aria-label="Search users"
                placeholder="Search name, username, email"
                @update:model-value="onSearch"
            />
        </div>

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
                        <th :class="$style.th">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="user in users"
                        :key="user.id"
                        :class="[$style.row, transitioningUserId === user.id ? $style.transitioningRow : '']"
                        role="button"
                        tabindex="0"
                        :aria-label="`Open settings for ${displayName(user)}`"
                        @click="void openUser(user)"
                        @keydown.enter="void openUser(user)"
                        @keydown.space.prevent="void openUser(user)"
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
                        <td :class="$style.td">
                            <PrimaryButton width-mode="hug" :leading-icon="icons.setting" @click.stop="void openUser(user)">Setting</PrimaryButton>
                        </td>
                    </tr>
                </tbody>
            </table>

            <p v-if="!isLoading && users.length === 0" :class="$style.empty">No users found.</p>
            <p v-if="isLoading" :class="$style.empty">Loading…</p>
        </div>
    </AdminLayout>
</template>

<style module>
.tableToolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.breadcrumb {
    color: var(--color-text-primary);
}

.searchField {
    width: min(100%, var(--spacing-space-96));
}

.panel {
    box-sizing: border-box;
    overflow-x: auto;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-text, var(--color-text-primary));
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
    color: var(--color-text-secondary);
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

.transitioningRow {
    view-transition-name: admin-user-menu-panel;
}

:global(::view-transition-group(admin-user-menu-panel)) {
    z-index: 1;
    overflow: clip;
    border-radius: var(--radius-xl);
    animation-duration: 420ms;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

:global(::view-transition-group(app-navbar)) {
    z-index: 2;
    animation: none;
}

:global(::view-transition-old(app-navbar)),
:global(::view-transition-new(app-navbar)) {
    animation: none;
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
    border-color: var(--color-text-primary);
    color: var(--color-text-primary);
}

.empty {
    margin: 0;
    padding: 20px 16px;
    color: var(--color-text-secondary);
}

.error {
    margin: 0;
    color: var(--color-text-secondary);
}

@media (max-width: 760px) {
    .tableToolbar {
        width: 100%;
        align-items: stretch;
        flex-direction: column;
    }

    .searchField {
        width: 100%;
    }
}
</style>
