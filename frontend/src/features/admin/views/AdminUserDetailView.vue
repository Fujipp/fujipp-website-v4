<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { AdminLayout, UserSubscriptionsPanel, UserWalletPanel } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import { USER_ROLES, type AdminUser, type UpdateUserPayload } from "@/features/admin/config";
import { SelectField, StatusToast, TextareaField, TextField, type SelectFieldOption } from "@/shared/ui";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";

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
            <SecondaryButton width-mode="hug" :to="{ name: 'admin-users' }">Back to users</SecondaryButton>
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
                <PrimaryButton type="submit" width-mode="hug" :disabled="isSaving">
                    {{ isSaving ? "Saving…" : "Save changes" }}
                </PrimaryButton>
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
    gap: var(--spacing-space-4);
    box-sizing: border-box;
    max-width: var(--container-7xl);
    padding: var(--spacing-space-5);
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-text, var(--color-text-primary));
}

.readonlyRow {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-space-4);
    grid-column: 1 / -1;
}

.readonlyValue { word-break: break-word; font-size: var(--type-size-body-small); }

.wideField { grid-column: 1 / -1; }

.label { font-size: var(--type-size-input-label); color: var(--color-text-secondary); }

.actions { display: flex; justify-content: flex-end; grid-column: 1 / -1; }

.note { margin: 0; color: var(--color-text-secondary); }
.error { margin: 0; color: var(--color-status-error); }
</style>
