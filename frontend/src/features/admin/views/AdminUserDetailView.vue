<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { AdminLayout, UserSubscriptionsPanel, UserWalletPanel } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import { USER_ROLES, type AdminUser, type UpdateUserPayload } from "@/features/admin/config";
import { SelectField, StatusToast, TextareaField, TextField, type SelectFieldOption } from "@/shared/ui";

const route = useRoute();
const adminStore = useAdminStore();

const user = ref<AdminUser | null>(null);
const isLoading = ref(false);
const loadError = ref("");
const isSaving = ref(false);
const toast = ref<{ status: "success" | "error"; title: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const userId = computed(() => String(route.params.userId));

const form = reactive({
    username: "",
    displayName: "",
    bio: "",
    website: "",
    githubUrl: "",
    role: "USER" as "USER" | "ADMIN",
});
const roleOptions: SelectFieldOption[] = USER_ROLES.map((role) => ({ label: role, value: role }));

function hydrate(u: AdminUser): void {
    user.value = u;
    form.username = u.username ?? "";
    form.displayName = u.displayName ?? "";
    form.bio = u.bio ?? "";
    form.website = u.website ?? "";
    form.githubUrl = u.githubUrl ?? "";
    form.role = u.role;
}

function showToast(status: "success" | "error", title: string): void {
    toast.value = { status, title };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = null), 2600);
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        hydrate(await adminStore.fetchUser(userId.value));
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load user";
    } finally {
        isLoading.value = false;
    }
}

async function save(): Promise<void> {
    const current = user.value;
    if (!current) return;
    const payload: UpdateUserPayload = {};
    if (form.username !== (current.username ?? "")) payload.username = form.username;
    if (form.displayName !== (current.displayName ?? "")) payload.displayName = form.displayName;
    if (form.bio !== (current.bio ?? "")) payload.bio = form.bio;
    if (form.website !== (current.website ?? "")) payload.website = form.website;
    if (form.githubUrl !== (current.githubUrl ?? "")) payload.githubUrl = form.githubUrl;
    if (form.role !== current.role) payload.role = form.role;

    if (Object.keys(payload).length === 0) {
        showToast("success", "No changes");
        return;
    }

    isSaving.value = true;
    try {
        hydrate(await adminStore.updateUser(userId.value, payload));
        showToast("success", "Saved");
    } catch (cause) {
        showToast("error", cause instanceof Error ? cause.message : "Save failed");
    } finally {
        isSaving.value = false;
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

        <form v-if="user" :class="$style.panel" aria-label="Edit user" @submit.prevent="save">
            <div :class="$style.readonlyRow">
                <span :class="$style.label">User ID</span>
                <span :class="$style.readonlyValue">{{ user.id }}</span>
            </div>
            <div :class="$style.readonlyRow">
                <span :class="$style.label">Email</span>
                <span :class="$style.readonlyValue">{{ user.email ?? "—" }}</span>
            </div>

            <TextField v-model="form.username" label="Username" placeholder="Username" autocomplete="off" />
            <TextField v-model="form.displayName" label="Display name" placeholder="Display name" />
            <TextareaField v-model="form.bio" :class="$style.wideField" label="Bio" placeholder="Bio" :rows="3" />
            <TextField v-model="form.website" label="Website" placeholder="Website" type="url" />
            <TextField v-model="form.githubUrl" label="GitHub URL" placeholder="GitHub URL" type="url" />
            <SelectField v-model="form.role" label="Role" :options="roleOptions" />

            <div :class="$style.actions">
                <button type="submit" :class="$style.saveBtn" :disabled="isSaving">
                    {{ isSaving ? "Saving…" : "Save changes" }}
                </button>
            </div>
        </form>

        <UserWalletPanel v-if="user" :user-id="userId" />
        <UserSubscriptionsPanel v-if="user" :user-id="userId" />

        <StatusToast v-if="toast" :status="toast.status" :title="toast.title" />
    </AdminLayout>
</template>

<style module>
.panel {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
    box-sizing: border-box;
    max-width: 960px;
    padding: 20px;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
}

.readonlyRow {
    display: flex;
    align-items: baseline;
    gap: 16px;
    grid-column: 1 / -1;
}

.readonlyValue { word-break: break-word; font-size: 14px; }

.wideField { grid-column: 1 / -1; }

.label { font-size: 13px; color: var(--color-text-disabled); }

.actions { display: flex; justify-content: flex-end; grid-column: 1 / -1; }

.saveBtn {
    padding: 10px 20px;
    border: 0;
    border-radius: var(--radius-md);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 140ms ease;
}

.saveBtn:hover { background-color: var(--color-button-primary-btn-hover); }
.saveBtn:disabled { cursor: not-allowed; opacity: 0.6; }

.back { color: var(--color-text-primary); text-decoration: none; font-size: 14px; }
.back:hover { text-decoration: underline; }

.note { margin: 0; color: var(--color-text-disabled); }
.error { margin: 0; color: var(--color-status-error); }
</style>
