<script setup lang="ts">
import { computed, ref } from "vue";
import { AppFooter } from "@/shared/layout";

import backendMarkdown from "../../../../../docs/changelog/backend.md?raw";
import databaseMarkdown from "../../../../../docs/changelog/database.md?raw";
import frontendMarkdown from "../../../../../docs/changelog/frontend.md?raw";
import otherMarkdown from "../../../../../docs/changelog/other.md?raw";

type ChangelogAreaId = "all" | "frontend" | "backend" | "database" | "other";

interface ChangelogArea {
    id: Exclude<ChangelogAreaId, "all">;
    label: string;
    title: string;
    summary: string;
    markdown: string;
}

interface ChangelogEntry {
    areaId: ChangelogArea["id"];
    areaLabel: string;
    version: string;
    date: string;
    change: string;
}

const changelogAreas = [
    {
        id: "frontend",
        label: "Frontend",
        title: "User interface",
        summary: "Portfolio, shop, admin, and customer-facing screens.",
        markdown: frontendMarkdown,
    },
    {
        id: "backend",
        label: "Backend",
        title: "Platform API",
        summary: "Gateway APIs, bot controls, billing integration, and admin operations.",
        markdown: backendMarkdown,
    },
    {
        id: "database",
        label: "Database",
        title: "Data layer",
        summary: "Supabase schemas, migrations, seeds, and database policies.",
        markdown: databaseMarkdown,
    },
    {
        id: "other",
        label: "Other",
        title: "Infra and tooling",
        summary: "Deployment, docs, bot runtime, automation, and agent workflows.",
        markdown: otherMarkdown,
    },
] as const satisfies readonly ChangelogArea[];

const areaTabs = [
    { id: "all", label: "All" },
    ...changelogAreas.map((area) => ({ id: area.id, label: area.label })),
] as const satisfies readonly { id: ChangelogAreaId; label: string }[];

const selectedArea = ref<ChangelogAreaId>("all");

function cleanMarkdown(value: string): string {
    return value
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/&nbsp;/g, " ")
        .trim();
}

function parseChangelog(area: ChangelogArea): ChangelogEntry[] {
    return area.markdown
        .split("\n")
        .filter((line) => line.startsWith("| `"))
        .map((line) => line.split("|").map((cell) => cell.trim()))
        .filter((cells) => cells.length >= 5)
        .map((cells) => ({
            areaId: area.id,
            areaLabel: area.label,
            version: cleanMarkdown(cells[1] ?? ""),
            date: cells[2] ?? "",
            change: cleanMarkdown(cells.slice(3, -1).join("|")),
        }));
}

const areaOrder = new Map(changelogAreas.map((area, index) => [area.id, index]));
const allEntries = changelogAreas
    .flatMap((area) => parseChangelog(area))
    .sort((left, right) => {
        const dateCompare = right.date.localeCompare(left.date);

        if (dateCompare !== 0) {
            return dateCompare;
        }

        return (areaOrder.get(left.areaId) ?? 0) - (areaOrder.get(right.areaId) ?? 0);
    });

const totalEntries = allEntries.length;
const latestDate = allEntries[0]?.date ?? "";

const visibleEntries = computed(() => {
    if (selectedArea.value === "all") {
        return allEntries;
    }

    return allEntries.filter((entry) => entry.areaId === selectedArea.value);
});

const selectedAreaLabel = computed(() => (
    areaTabs.find((area) => area.id === selectedArea.value)?.label ?? "All"
));
</script>

<template>
    <main :class="$style.page">
        <section :class="$style.hero" class="bg-main-surface text-text-secondary">
            <div :class="$style.heroInner">
                <p class="type-overline-sb text-main-primary">Platform changelog</p>
                <h1 class="type-h1-page-title-eb text-text-primary">
                    What shipped, and when.
                </h1>
                <p :class="$style.heroCopy" class="type-body-small-r">
                    A public view of the same logs kept in <span>docs/changelog</span>, grouped by frontend,
                    backend, database, and platform work.
                </p>
                <div :class="$style.statsGrid" aria-label="Changelog summary">
                    <article :class="$style.statCard">
                        <span class="type-overline-r">Entries</span>
                        <strong class="type-h2-section-title-sb">{{ totalEntries }}</strong>
                    </article>
                    <article :class="$style.statCard">
                        <span class="type-overline-r">Areas</span>
                        <strong class="type-h2-section-title-sb">{{ changelogAreas.length }}</strong>
                    </article>
                    <article :class="$style.statCard">
                        <span class="type-overline-r">Latest</span>
                        <strong class="type-h3-card-title-sb">{{ latestDate }}</strong>
                    </article>
                </div>
            </div>
        </section>

        <section :class="$style.content" aria-labelledby="changelog-heading">
            <div :class="$style.areaGrid">
                <article v-for="area in changelogAreas" :key="area.id" :class="$style.areaCard">
                    <span :class="[$style.areaDot, $style[area.id]]" aria-hidden="true" />
                    <p class="type-overline-sb">{{ area.label }}</p>
                    <h2 class="type-h3-card-title-sb text-text-primary">{{ area.title }}</h2>
                    <p class="type-caption-r">{{ area.summary }}</p>
                </article>
            </div>

            <header :class="$style.listHeader">
                <div>
                    <p class="type-overline-sb text-main-primary">{{ selectedAreaLabel }}</p>
                    <h2 id="changelog-heading" class="type-h2-section-title-sb text-text-primary">
                        Release history
                    </h2>
                </div>
                <div :class="$style.tabs" role="tablist" aria-label="Filter changelog area">
                    <button
                        v-for="tab in areaTabs"
                        :key="tab.id"
                        type="button"
                        :class="[$style.tab, selectedArea === tab.id ? $style.activeTab : '']"
                        :aria-selected="selectedArea === tab.id"
                        role="tab"
                        @click="selectedArea = tab.id"
                    >
                        {{ tab.label }}
                    </button>
                </div>
            </header>

            <ol :class="$style.timeline">
                <li v-for="entry in visibleEntries" :key="`${entry.areaId}-${entry.version}`" :class="$style.entry">
                    <div :class="$style.entryMarker">
                        <span :class="[$style.markerDot, $style[entry.areaId]]" aria-hidden="true" />
                    </div>
                    <article :class="$style.entryCard">
                        <header :class="$style.entryHeader">
                            <div :class="$style.entryMeta">
                                <span :class="[$style.areaBadge, $style[entry.areaId]]" class="type-overline-sb">
                                    {{ entry.areaLabel }}
                                </span>
                                <span class="type-caption-r">{{ entry.date }}</span>
                            </div>
                            <strong class="type-caption-sb">v{{ entry.version }}</strong>
                        </header>
                        <p class="type-body-small-r">{{ entry.change }}</p>
                    </article>
                </li>
            </ol>
        </section>
    </main>
    <AppFooter />
</template>

<style module>
.page {
    min-height: 100vh;
    padding-top: var(--spacing-space-16);
    color: var(--color-text-secondary);
}

.hero {
    border-bottom: 1px solid var(--color-main-divider);
}

.heroInner {
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
    padding: var(--spacing-space-20) var(--spacing-space-6) var(--spacing-space-16);
}

.heroCopy {
    max-width: 48rem;
    margin-top: var(--spacing-space-4);
}

.heroCopy span {
    color: var(--color-text-primary);
    font-weight: 600;
}

.statsGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-space-4);
    max-width: 48rem;
    margin-top: var(--spacing-space-8);
}

.statCard,
.areaCard,
.entryCard {
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-lg);
    background: var(--color-main-background);
}

.statCard {
    display: grid;
    gap: var(--spacing-space-2);
    min-height: var(--spacing-space-24);
    padding: var(--spacing-space-5);
}

.statCard span {
    color: var(--color-text-muted);
}

.statCard strong {
    color: var(--color-text-primary);
}

.content {
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
    padding: var(--spacing-space-12) var(--spacing-space-6) var(--spacing-space-20);
}

.areaGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.areaCard {
    display: grid;
    align-content: start;
    gap: var(--spacing-space-3);
    min-height: var(--spacing-space-48);
    padding: var(--spacing-space-5);
}

.areaDot,
.markerDot {
    display: inline-block;
    border-radius: var(--radius-full);
}

.areaDot {
    width: var(--spacing-space-4);
    height: var(--spacing-space-4);
}

.frontend {
    background-color: var(--color-status-info);
}

.backend {
    background-color: var(--color-status-success);
}

.database {
    background-color: var(--color-status-warning);
}

.other {
    background-color: var(--color-main-primary);
}

.listHeader {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--spacing-space-6);
    margin-top: var(--spacing-space-12);
}

.tabs {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--spacing-space-2);
}

.tab {
    min-height: var(--spacing-space-10);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
    background: var(--color-main-surface);
    color: var(--color-text-secondary);
    padding: var(--spacing-space-2) var(--spacing-space-4);
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.tab:hover {
    border-color: var(--color-button-secondary-btn-hover);
    background-color: var(--color-button-secondary-btn-hover);
}

.tab:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.activeTab {
    border-color: var(--color-main-primary);
    background: var(--color-main-primary);
    color: var(--color-button-primary-btn-text-active);
}

.timeline {
    display: grid;
    gap: 0;
    margin: var(--spacing-space-8) 0 0;
    padding: 0;
    list-style: none;
}

.entry {
    display: grid;
    grid-template-columns: var(--spacing-space-8) minmax(0, 1fr);
}

.entryMarker {
    position: relative;
    display: flex;
    justify-content: center;
}

.entryMarker::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--color-main-divider);
}

.markerDot {
    position: relative;
    z-index: 1;
    width: var(--spacing-space-3);
    height: var(--spacing-space-3);
    margin-top: var(--spacing-space-6);
    border: 3px solid var(--color-main-background);
}

.entryCard {
    margin-bottom: var(--spacing-space-4);
    padding: var(--spacing-space-5);
}

.entryHeader,
.entryMeta {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
}

.entryHeader {
    justify-content: space-between;
    margin-bottom: var(--spacing-space-3);
}

.entryHeader strong {
    color: var(--color-text-primary);
}

.areaBadge {
    display: inline-flex;
    align-items: center;
    min-height: var(--spacing-space-8);
    border-radius: var(--radius-full);
    color: var(--color-button-primary-btn-text-active);
    padding: var(--spacing-space-1) var(--spacing-space-3);
}

@media (max-width: 960px) {
    .statsGrid,
    .areaGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .listHeader {
        align-items: start;
        flex-direction: column;
    }

    .tabs {
        justify-content: flex-start;
    }
}

@media (max-width: 640px) {
    .heroInner {
        padding: var(--spacing-space-16) var(--spacing-space-4) var(--spacing-space-12);
    }

    .content {
        padding: var(--spacing-space-10) var(--spacing-space-4) var(--spacing-space-16);
    }

    .statsGrid,
    .areaGrid {
        grid-template-columns: 1fr;
    }

    .areaCard {
        min-height: auto;
    }

    .entry {
        grid-template-columns: var(--spacing-space-5) minmax(0, 1fr);
    }

    .entryCard {
        padding: var(--spacing-space-4);
    }

    .entryHeader,
    .entryMeta {
        align-items: flex-start;
        flex-direction: column;
        gap: var(--spacing-space-2);
    }
}
</style>
