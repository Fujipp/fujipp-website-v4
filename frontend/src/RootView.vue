<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useUserStore } from "@/stores";

const PublicHomeView = defineAsyncComponent(() => import("@/features/portfolio/views/HomeView.vue"));
const ShopMainView = defineAsyncComponent(() => import("@/features/shop/views/ShopDashboardView.vue"));

const userStore = useUserStore();
</script>

<template>
    <ShopMainView v-if="userStore.isAuthenticated" />
    <PublicHomeView v-else />
</template>
