<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useUserStore } from "@/stores";

const router = useRouter();
const store = useUserStore();
const { isAdmin, isAuthenticated, profile, user } = storeToRefs(store);
const isExpanded = ref(false);

const isVisible = computed(() => isAuthenticated.value && isAdmin.value);
const username = computed(() => (
    profile.value?.username
    ?? profile.value?.displayName
    ?? user.value?.email?.split("@")[0]
    ?? "admin"
));
const uid = computed(() => `#${user.value?.id.slice(0, 8) ?? "uid"}`);

async function handleLogOut(): Promise<void> {
    await store.signOut();
    isExpanded.value = false;
    await router.push({ name: "home" });
}

async function goToAdmin(): Promise<void> {
    isExpanded.value = false;
    await router.push({ name: "admin-dashboard" });
}
</script>

<template>
    <aside
        v-if="isVisible"
        :class="[$style.userControl, isExpanded ? $style.expanded : '']"
        aria-label="Admin user controls"
        @mouseenter="isExpanded = true"
        @mouseleave="isExpanded = false"
        @focusin="isExpanded = true"
        @focusout="isExpanded = false"
    >
        <button
            :class="$style.profileButton"
            type="button"
            :aria-expanded="isExpanded"
            @click="isExpanded = !isExpanded"
        >
            <img
                v-if="profile?.avatarUrl"
                :class="$style.avatar"
                :src="profile.avatarUrl"
                alt=""
                aria-hidden="true"
            >
            <span v-else :class="$style.avatarFallback" aria-hidden="true" />
            <span :class="$style.identity">
                <span :class="$style.username">{{ username }}</span>
                <span :class="$style.uid">{{ uid }}</span>
            </span>
        </button>

        <div v-if="isExpanded" :class="$style.actionList">
            <button
                :class="[$style.actionButton, $style.settingButton]"
                class="type-button-r"
                type="button"
                @click="goToAdmin"
            >
                Admin
            </button>
            <button
                :class="[$style.actionButton, $style.logOutButton]"
                class="type-button-r"
                type="button"
                :disabled="store.isLoading"
                @click="handleLogOut"
            >
                <span v-if="store.isLoading">Loading...</span>
                <span v-else>Log out</span>
            </button>
        </div>
    </aside>
</template>

<style module>
.userControl {
    position: fixed;
    top: 64px;
    right: 0;
    z-index: 45;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    width: 168px;
    min-height: 66px;
    padding: 10px;
    gap: 10px;
    border-radius: 0 0 0 var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
}

.profileButton {
    display: flex;
    align-items: center;
    width: 148px;
    padding: 0;
    gap: 10px;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
}

.avatar,
.avatarFallback {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
}

.avatar {
    object-fit: cover;
}

.avatarFallback {
    background-color: var(--color-neutral-300);
}

.identity {
    display: flex;
    min-width: 0;
    flex-direction: column;
}

.username,
.uid {
    overflow: hidden;
    font-weight: 300;
    line-height: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.username {
    font-size: 1.25rem;
}

.uid {
    font-size: 0.875rem;
}

.actionList {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.actionButton {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 148px;
    height: 34px;
    padding: 10px;
    border: 1px solid transparent;
    border-radius: var(--radius-xl);
    color: var(--color-button-primary-btn-text-active);
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease;
}

.settingButton {
    border-color: var(--color-button-primary-btn-bg);
    background-color: var(--color-button-primary-btn-bg);
}

.settingButton:hover {
    border-color: var(--color-button-primary-btn-hover);
    background-color: var(--color-button-primary-btn-hover);
}

.settingButton:active {
    border-color: var(--color-button-primary-btn-active);
    background-color: var(--color-button-primary-btn-active);
}

.logOutButton {
    border-color: var(--color-button-btn-bg-danger);
    background-color: var(--color-button-btn-bg-danger);
}

.logOutButton:hover {
    border-color: var(--color-button-btn-hover-danger);
    background-color: var(--color-button-btn-hover-danger);
}

.logOutButton:active {
    border-color: var(--color-button-btn-active-danger);
    background-color: var(--color-button-btn-active-danger);
}

.actionButton:focus-visible,
.profileButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.actionButton:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}
</style>
