<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { AdminLayout } from "@/features/admin/components";
import { useAdminStore } from "@/features/admin/stores";
import type { BotConfig } from "@/features/admin/config";
import { EmbedEditor, StatusToast } from "@/shared/ui";

const EMBEDS_KEY = "__embeds__";

const route = useRoute();
const adminStore = useAdminStore();

const config = ref<BotConfig | null>(null);
const isLoading = ref(false);
const loadError = ref("");
const isSaving = ref(false);
const selectedKey = ref<string>("");
const toast = ref<{ status: "success" | "error"; title: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

// Working copy keyed by variableKey across all features (sensitive fields start blank).
const form = reactive<Record<string, string>>({});

const botId = computed(() => String(route.params.botId));
const features = computed(() => config.value?.features ?? []);
const selectedFeature = computed(() => features.value.find((f) => f.code === selectedKey.value) ?? null);
const showEmbeds = computed(() => selectedKey.value === EMBEDS_KEY);

function showToast(status: "success" | "error", title: string): void {
    toast.value = { status, title };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = null), 2600);
}

function hydrate(cfg: BotConfig): void {
    config.value = cfg;
    for (const feature of cfg.features) {
        for (const field of feature.fields) {
            form[field.variableKey] = field.isSensitive ? "" : (cfg.values[field.variableKey] ?? "");
        }
    }
    if (!selectedKey.value) {
        selectedKey.value = cfg.features[0]?.code ?? EMBEDS_KEY;
    }
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        hydrate(await adminStore.fetchBotConfig(botId.value));
    } catch (cause) {
        loadError.value = cause instanceof Error ? cause.message : "Failed to load config";
    } finally {
        isLoading.value = false;
    }
}

async function save(): Promise<void> {
    if (!config.value) return;
    const values: Record<string, string> = {};
    for (const feature of config.value.features) {
        for (const field of feature.fields) {
            const value = form[field.variableKey] ?? "";
            // Blank sensitive field = keep the saved secret; don't send it.
            if (field.isSensitive && value.trim() === "") continue;
            values[field.variableKey] = value;
        }
    }
    isSaving.value = true;
    try {
        hydrate(await adminStore.updateBotConfig(botId.value, values));
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
    <AdminLayout title="Bot config">
        <template #actions>
            <RouterLink :to="{ name: 'admin-bots' }" :class="$style.back">← Back to bots</RouterLink>
        </template>

        <p v-if="loadError" :class="$style.error" role="alert">{{ loadError }}</p>
        <p v-if="isLoading" :class="$style.note">Loading…</p>

        <div v-if="config" :class="$style.layout">
            <!-- selector -->
            <nav :class="$style.selector" aria-label="Config sections">
                <button
                    v-for="feature in features"
                    :key="feature.code"
                    type="button"
                    :class="[$style.navItem, selectedKey === feature.code ? $style.navActive : '']"
                    @click="selectedKey = feature.code"
                >
                    {{ feature.name }}
                </button>
                <button
                    type="button"
                    :class="[$style.navItem, showEmbeds ? $style.navActive : '']"
                    @click="selectedKey = EMBEDS_KEY"
                >
                    Embeds
                </button>
            </nav>

            <!-- content -->
            <div :class="$style.content">
                <p v-if="features.length === 0 && !showEmbeds" :class="$style.note">
                    This bot has no active features to configure.
                </p>

                <!-- embed editor -->
                <EmbedEditor v-if="showEmbeds" :bot-id="botId" base-path="/api/admin/bots" />

                <!-- feature fields -->
                <form v-else-if="selectedFeature" @submit.prevent="save">
                    <section :class="$style.feature">
                        <h2 :class="$style.featureName">{{ selectedFeature.name }}</h2>
                        <div :class="$style.fields">
                            <label v-for="field in selectedFeature.fields" :key="field.variableKey" :class="$style.field">
                                <span :class="$style.label">
                                    {{ field.label }}<span v-if="field.isRequired" :class="$style.req"> *</span>
                                </span>
                                <span v-if="field.description" :class="$style.desc">{{ field.description }}</span>
                                <input
                                    v-model="form[field.variableKey]"
                                    :class="$style.input"
                                    :type="field.isSensitive ? 'password' : 'text'"
                                    :placeholder="field.isSensitive ? '•••••• (leave blank to keep)' : (field.defaultValue ?? '')"
                                    autocomplete="off"
                                >
                            </label>
                        </div>
                        <div :class="$style.actions">
                            <button type="submit" :class="$style.saveBtn" :disabled="isSaving">
                                {{ isSaving ? "Saving…" : "Save config" }}
                            </button>
                        </div>
                    </section>
                </form>
            </div>
        </div>

        <StatusToast v-if="toast" :status="toast.status" :title="toast.title" />
    </AdminLayout>
</template>

<style module>
.layout { display: grid; grid-template-columns: 200px 1fr; gap: 20px; align-items: start; }

.selector { display: flex; flex-direction: column; gap: 4px; }
.navItem {
    box-sizing: border-box;
    text-align: left;
    padding: 10px 12px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    background: var(--color-main-surface);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
}
.navItem:hover { border-color: var(--color-main-primary); }
.navActive { border-color: var(--color-main-primary); color: var(--color-text-secondary); }

.content { min-width: 0; }

.feature {
    box-sizing: border-box;
    padding: 20px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.featureName { margin: 0 0 14px; font-size: 16px; font-weight: 600; }
.fields { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 4px; max-width: 520px; }
.label { font-size: 14px; font-weight: 500; }
.req { color: var(--color-status-error); }
.desc { font-size: 12px; color: var(--color-text-disabled); }

.input {
    box-sizing: border-box;
    width: 100%;
    padding: 9px 12px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font: inherit;
}
.input:focus-visible { outline: none; border-color: var(--color-input-border-focus); }

.actions { display: flex; justify-content: flex-end; max-width: 520px; margin-top: 16px; }

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

@media (max-width: 760px) {
    .layout { grid-template-columns: 1fr; }
}
</style>
