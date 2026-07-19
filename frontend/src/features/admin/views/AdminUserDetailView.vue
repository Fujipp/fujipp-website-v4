<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AdminLayout, UserSubscriptionsPanel, UserWalletPanel } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import { USER_ROLES, type AdminUser, type UpdateUserPayload } from "@/features/admin/config";
import { SelectField, StatusToast, TextareaField, TextField, type SelectFieldOption } from "@/shared/ui";
import { PrimaryButton } from "@/shared/ui/buttons";
import { icons } from "@/config";

const route = useRoute();
const router = useRouter();
const adminStore = useAdminStore();

const user = ref<AdminUser | null>(null);
const isLoading = ref(false);
const loadError = ref("");
const isSaving = ref(false);
const activeSection = ref<"menu" | "user" | "wallet" | "runtime" | "package">("menu");
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
const detailMenu = [
    { key: "user", label: "User setting", icon: icons.user },
    { key: "wallet", label: "Wallet setting", icon: icons.wallet },
    { key: "runtime", label: "Runtime setting", icon: icons.shopServer },
    { key: "package", label: "Package setting", icon: icons.package },
] as const;
type UserSection = typeof activeSection.value;

const sectionRoutes: Record<Exclude<UserSection, "menu">, string> = {
    user: "admin-user-setting",
    wallet: "admin-user-wallet-setting",
    runtime: "admin-user-runtime-setting",
    package: "admin-user-package-setting",
};

const routeSections: Record<string, UserSection> = {
    "admin-user-detail": "menu",
    "admin-user-setting": "user",
    "admin-user-wallet-setting": "wallet",
    "admin-user-runtime-setting": "runtime",
    "admin-user-package-setting": "package",
};

function iconMaskStyle(icon: string): Record<string, string> {
    return { "--admin-user-icon": `url(${icon})` };
}

function applySection(section: UserSection): void {
    const update = () => { activeSection.value = section; };
    const transitionDocument = document as Document & {
        startViewTransition?: (callback: () => void) => unknown;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !transitionDocument.startViewTransition) {
        update();
        return;
    }
    transitionDocument.startViewTransition(update);
}

function openSection(section: Exclude<UserSection, "menu">): void {
    void router.push({ name: sectionRoutes[section], params: { userId: userId.value } });
}

function openUserMenu(): void {
    void router.push({ name: "admin-user-detail", params: { userId: userId.value } });
}

function openUsers(): void {
    void router.push({ name: "admin-users" });
}

function goBack(): void {
    if (window.history.state?.back) {
        router.back();
        return;
    }
    openUsers();
}

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

watch(
    () => route.name,
    (routeName) => applySection(routeSections[String(routeName)] ?? "menu"),
    { immediate: true },
);

onMounted(load);
</script>

<template>
    <AdminLayout title="Users config">
        <template #actions>
            <PrimaryButton width-mode="hug" :leading-icon="icons.directionLeft" @click="goBack">Back</PrimaryButton>
        </template>

        <nav class="type-caption-sb" :class="$style.breadcrumb" aria-label="User config breadcrumb">
            <button type="button" :class="$style.breadcrumbButton" @click="openUsers">Main</button>
            <span :class="$style.userBreadcrumbTrail">
                <span aria-hidden="true">&gt;</span>
                <button v-if="activeSection !== 'menu'" type="button" :class="$style.breadcrumbButton" @click="openUserMenu">
                    {{ user ? (user.displayName || user.username || user.email || "User") : "User" }}
                </button>
                <span v-else>{{ user ? (user.displayName || user.username || user.email || "User") : "User" }}</span>
            </span>
            <template v-if="activeSection !== 'menu'">
                <span aria-hidden="true">&gt;</span>
                <span>{{ detailMenu.find((item) => item.key === activeSection)?.label }}</span>
            </template>
        </nav>

        <p v-if="loadError" :class="$style.error" role="alert">{{ loadError }}</p>
        <p v-if="isLoading" :class="$style.note">Loading…</p>

        <section v-if="activeSection === 'menu'" :class="$style.menuGrid" aria-label="User management sections">
            <button v-for="item in detailMenu" :key="item.key" type="button" :class="$style.menuCard" @click="openSection(item.key)">
                <span :class="$style.menuIcon" :style="iconMaskStyle(item.icon)" aria-hidden="true"></span>
                <span class="type-body-small-r">{{ item.label }}</span>
            </button>
        </section>

        <form v-if="user && activeSection === 'user'" :class="$style.panel" aria-label="Edit user" @submit.prevent="save">
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

        <div v-if="user && activeSection === 'wallet'" :class="[$style.detailPanel, $style.walletPanel]">
            <UserWalletPanel :user-id="userId" />
        </div>
        <div v-if="user && activeSection === 'runtime'" :class="[$style.detailPanel, $style.runtimePanel]">
            <UserSubscriptionsPanel :user-id="userId" mode="runtime" />
        </div>
        <div v-if="user && activeSection === 'package'" :class="[$style.detailPanel, $style.packagePanel]">
            <UserSubscriptionsPanel :user-id="userId" mode="features" />
        </div>

        <StatusToast v-if="toast" :status="toast.status" :title="toast.title" />
    </AdminLayout>
</template>

<style module>
.breadcrumb {
    display: flex;
    min-height: var(--spacing-space-12);
    align-items: center;
    gap: var(--spacing-space-1);
    color: var(--color-text-primary);
}

.breadcrumbButton {
    border: 0;
    background: transparent;
    padding: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;
}

.userBreadcrumbTrail {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-space-1);
    opacity: 0;
    transform: translateX(calc(var(--spacing-space-3) * -1));
    animation: user-breadcrumb-reveal 320ms cubic-bezier(.2, .8, .2, 1) 80ms forwards;
}

@keyframes user-breadcrumb-reveal {
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.menuGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-8);
    view-transition-name: admin-user-menu-panel;
}

.menuCard {
    display: flex;
    min-height: var(--spacing-space-64);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-space-3);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
}

.menuCard:hover {
    border-color: var(--color-main-primary);
    background: var(--color-table-row-hover);
    transform: translateY(calc(var(--spacing-space-1) * -1));
}

.menuCard:first-child,
.panel {
    view-transition-name: admin-user-setting-panel;
}

.menuCard:nth-child(2),
.walletPanel {
    view-transition-name: admin-wallet-setting-panel;
}

.menuCard:nth-child(3),
.runtimePanel {
    view-transition-name: admin-runtime-setting-panel;
}

.menuCard:nth-child(4),
.packagePanel {
    view-transition-name: admin-package-setting-panel;
}

.detailPanel {
    width: 100%;
    min-width: 0;
    overflow: hidden;
}

.menuIcon {
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    background-color: currentColor;
    mask: var(--admin-user-icon) center / contain no-repeat;
    -webkit-mask: var(--admin-user-icon) center / contain no-repeat;
}

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

:global(::view-transition-group(admin-user-setting-panel)),
:global(::view-transition-group(admin-wallet-setting-panel)),
:global(::view-transition-group(admin-runtime-setting-panel)),
:global(::view-transition-group(admin-package-setting-panel)) {
    z-index: 1;
    overflow: clip;
    border-radius: var(--radius-xl);
    animation-duration: 420ms;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
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

@media (max-width: 900px) {
    .menuGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
    .menuGrid { grid-template-columns: 1fr; }
}
</style>
