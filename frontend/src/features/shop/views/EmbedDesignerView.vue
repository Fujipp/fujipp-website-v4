<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ShopSidebar } from "@/features/shop/components";
import { EmbedEditor } from "@/shared/ui/embeds";

const route = useRoute();
const router = useRouter();

const botId = computed(() => String(route.params.botId ?? ""));
const isSidebarOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);
</script>

<template>
    <div :class="$style.page">
        <ShopSidebar v-model="isSidebarOpen" />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.titleSection">
                <div>
                    <h1 :class="$style.pageTitle" class="type-h1-page-title-sb">EMBED DESIGNER</h1>
                    <p :class="$style.subtitle" class="type-body-small-r">ปรับแต่งหน้าตา embed ของบอท · {{ botId || "—" }}</p>
                </div>
                <button type="button" :class="$style.backButton" @click="router.push({ name: 'shop-bot-config', params: { botId } })">
                    ← กลับไป Config
                </button>
            </section>
            <div :class="$style.divider" aria-hidden="true" />

            <EmbedEditor :bot-id="botId" />
        </main>
    </div>
</template>

<style module>
.page { display: flex; min-height: 100vh; background: var(--color-main-background); color: var(--color-text-primary); }
.content { display: flex; min-width: 0; flex: 1; flex-direction: column; box-sizing: border-box; padding: var(--spacing-space-6); gap: var(--spacing-space-6); transition: margin-left 260ms cubic-bezier(0.22, 1, 0.36, 1); }
.sidebarOpen { margin-left: 194px; }
.sidebarClosed { margin-left: 44px; }

.titleSection { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-space-4); }
.pageTitle { margin: 0; color: var(--color-text-primary); }
.subtitle { margin: 4px 0 0; color: var(--color-text-primary); }
.divider { height: 1px; background-color: var(--color-main-divider); }
.backButton { height: 38px; padding: 0 var(--spacing-space-4); border: 1px solid var(--color-main-border); border-radius: var(--radius-full); background: var(--color-main-background); color: var(--color-text-primary); cursor: pointer; white-space: nowrap; }

@media (max-width: 760px) {
    .sidebarOpen, .sidebarClosed { margin-left: 44px; }
    .content { padding: var(--spacing-space-5); }
    .titleSection { flex-direction: column; }
}
</style>
