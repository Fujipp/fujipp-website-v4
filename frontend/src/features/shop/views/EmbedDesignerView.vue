<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { icons } from "@/config";
import { AppFooter } from "@/shared/layout";
import { PrimaryButton, SecondaryButton } from "@/shared/ui";
import { EmbedEditor } from "@/shared/ui/embeds";

const route = useRoute();

const botId = computed(() => String(route.params.botId ?? ""));
const featureCode = computed(() => String(route.query.feature ?? ""));
const configRoute = computed(() => ({ name: "shop-bot-config", params: { botId: botId.value } }));
const dashboardRoute = computed(() => ({ name: "shop-dashboard" }));
</script>

<template>
    <div :class="$style.page">
        <main :class="$style.content">
            <section :class="$style.hero" aria-labelledby="embed-setting-title">
                <div :class="$style.heroCopy">
                    <span :class="$style.eyebrow" class="type-overline-sb">Discord message editor</span>
                    <h1 id="embed-setting-title" :class="$style.pageTitle" class="type-h1-page-title-sb">EMBED SETTING</h1>
                    <p :class="$style.subtitle" class="type-body-small-r">
                        {{ featureCode ? `ฟีเจอร์ ${featureCode}` : "ทุก Embed Slot" }} · {{ botId || "—" }}
                    </p>
                </div>

                <div :class="$style.heroActions">
                    <SecondaryButton width-mode="hug" :leading-icon="icons.directionLeft" :to="dashboardRoute">
                        Dashboard
                    </SecondaryButton>
                    <PrimaryButton width-mode="hug" :leading-icon="icons.setting" :to="configRoute">
                        Bot Config
                    </PrimaryButton>
                </div>
            </section>

            <section :class="$style.workspace" aria-label="Embed setting workspace">
                <div :class="$style.workspaceHeader">
                    <div>
                        <h2 class="type-h2-section-title-sb">Message Layout</h2>
                        <p class="type-body-small-r">เลือก slot ด้านซ้าย ปรับเนื้อหา แล้วดู preview ด้านขวา</p>
                    </div>
                </div>

                <EmbedEditor :bot-id="botId" :feature-code="featureCode" />
            </section>
        </main>

        <AppFooter />
    </div>
</template>

<style module>
.page {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
    box-sizing: border-box;
    padding-top: 73px;
    background: var(--color-main-background);
    color: var(--color-text-primary);
}

:global(.dark) .page,
:global([data-theme="dark"]) .page {
    --color-input-background: var(--color-main-surface);
    --color-input-text: var(--color-text-primary);
    --color-input-border: var(--color-main-divider);
    --color-input-title: var(--color-text-secondary);
    --color-input-disabled: var(--color-button-secondary);
    --color-input-bg: var(--color-main-surface);
    --color-text-input: var(--color-text-primary);
    --color-input-placeholder: var(--color-text-secondary);
    --color-input-bg-disabled: var(--color-button-secondary);
    --color-input-border-hover: var(--color-text-secondary);
    --color-input-border-disabled: var(--color-main-divider);
}

.content {
    display: flex;
    width: 100%;
    max-width: none;
    flex: 1;
    flex-direction: column;
    box-sizing: border-box;
    margin: 0 auto;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-6);
}

.hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-space-5);
    padding-bottom: var(--spacing-space-5);
    border-bottom: 1px solid var(--color-main-divider);
}

.heroCopy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--spacing-space-1);
}

.eyebrow {
    color: var(--color-text-secondary);
    text-transform: uppercase;
}

.pageTitle {
    margin: 0;
    color: var(--color-text-primary);
}

.subtitle {
    margin: 0;
    color: var(--color-text-secondary);
}

.heroActions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--spacing-space-3);
}

.summaryGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.summaryCard {
    display: flex;
    min-width: 0;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-5);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.summaryIcon {
    width: var(--spacing-icon-lg);
    height: var(--spacing-icon-lg);
    flex-shrink: 0;
    margin-top: var(--spacing-space-1);
    background-color: var(--color-text-primary);
    mask: var(--icon-src) center / contain no-repeat;
    -webkit-mask: var(--icon-src) center / contain no-repeat;
}

.summaryLabel,
.summaryHint {
    margin: 0;
}

.summaryHint {
    display: block;
    margin-top: var(--spacing-space-1);
    color: var(--color-text-secondary);
    font-size: 13px;
    line-height: 1.4;
}

.workspace {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-5);
    padding: var(--spacing-space-6);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-2xl);
    background: var(--color-main-background);
}

.workspaceHeader {
    display: flex;
    justify-content: space-between;
    gap: var(--spacing-space-4);
    padding-bottom: var(--spacing-space-5);
    border-bottom: 1px solid var(--color-main-divider);
}

.workspaceHeader h2,
.workspaceHeader p {
    margin: 0;
}

.workspaceHeader p {
    color: var(--color-text-secondary);
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-5);
    }

    .hero {
        align-items: stretch;
        flex-direction: column;
    }

    .heroActions {
        justify-content: flex-start;
    }

    .summaryGrid {
        grid-template-columns: 1fr;
    }

    .workspace {
        padding: var(--spacing-space-4);
    }
}
</style>
