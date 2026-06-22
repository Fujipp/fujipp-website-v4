<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { AppFooter } from "@/shared/layout";

import backendMarkdown from "../../../../../docs/changelog/backend.md?raw";
import databaseMarkdown from "../../../../../docs/changelog/database.md?raw";
import frontendMarkdown from "../../../../../docs/changelog/frontend.md?raw";
import otherMarkdown from "../../../../../docs/changelog/other.md?raw";

type ChangelogAreaId = "all" | "frontend" | "backend" | "database" | "other";
type SortMode = "newest" | "oldest";

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

interface VisibleChangelogEntry extends ChangelogEntry {
    title: string;
    detail: string;
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

const PAGE_SIZE = 8;

const selectedArea = ref<ChangelogAreaId>("all");
const searchQuery = ref("");
const sortMode = ref<SortMode>("newest");
const visibleLimit = ref(PAGE_SIZE);

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

function sentenceCase(value: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
        return "";
    }

    return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function splitChange(change: string): { title: string; detail: string } {
    const normalized = sentenceCase(change);
    const splitters = [": ", " — ", "; ", ", and ", ", with ", " with ", " so ", " while ", " by "];
    const splitIndex = splitters
        .map((splitter) => normalized.indexOf(splitter))
        .filter((index) => index >= 54 && index <= 130)
        .sort((left, right) => left - right)[0];

    if (splitIndex === undefined) {
        return { title: normalized, detail: "" };
    }

    return {
        title: normalized.slice(0, splitIndex).trim(),
        detail: normalized,
    };
}

const areaOrder = new Map(changelogAreas.map((area, index) => [area.id, index]));

function compareEntries(left: ChangelogEntry, right: ChangelogEntry): number {
    const dateCompare = right.date.localeCompare(left.date);

    if (dateCompare !== 0) {
        return dateCompare;
    }

    return (areaOrder.get(left.areaId) ?? 0) - (areaOrder.get(right.areaId) ?? 0);
}

const allEntries = changelogAreas
    .flatMap((area) => parseChangelog(area))
    .sort(compareEntries);

const totalEntries = allEntries.length;
const latestDate = allEntries[0]?.date ?? "";
const areaCounts = computed(() => {
    const counts = new Map<ChangelogAreaId, number>([["all", allEntries.length]]);

    changelogAreas.forEach((area) => {
        counts.set(area.id, allEntries.filter((entry) => entry.areaId === area.id).length);
    });

    return counts;
});
const areaCards = computed(() => changelogAreas.map((area) => {
    const entries = allEntries.filter((entry) => entry.areaId === area.id);

    return {
        ...area,
        count: entries.length,
        latest: entries[0]?.date ?? "-",
    };
}));

const filteredEntries = computed(() => {
    const normalizedQuery = searchQuery.value.trim().toLowerCase();
    const entries = selectedArea.value === "all"
        ? allEntries
        : allEntries.filter((entry) => entry.areaId === selectedArea.value);

    const matchedEntries = normalizedQuery
        ? entries.filter((entry) => [
            entry.areaLabel,
            entry.version,
            entry.date,
            entry.change,
        ].some((value) => value.toLowerCase().includes(normalizedQuery)))
        : entries;

    return [...matchedEntries].sort((left, right) => (
        sortMode.value === "newest"
            ? compareEntries(left, right)
            : compareEntries(right, left)
    ));
});

const visibleEntries = computed<VisibleChangelogEntry[]>(() => filteredEntries.value
    .slice(0, visibleLimit.value)
    .map((entry) => ({
        ...entry,
        ...splitChange(entry.change),
    })));
const hasMoreEntries = computed(() => visibleEntries.value.length < filteredEntries.value.length);
const resultSummary = computed(() => {
    if (filteredEntries.value.length === 0) {
        return "No updates match the current view.";
    }

    return `Showing ${visibleEntries.value.length} of ${filteredEntries.value.length} updates`;
});

const selectedAreaLabel = computed(() => (
    areaTabs.find((area) => area.id === selectedArea.value)?.label ?? "All"
));

function showMore(): void {
    visibleLimit.value += PAGE_SIZE;
}

function resetFilters(): void {
    selectedArea.value = "all";
    searchQuery.value = "";
    sortMode.value = "newest";
}

watch([selectedArea, searchQuery, sortMode], () => {
    visibleLimit.value = PAGE_SIZE;
});
</script>

<template>
    <main :class="$style.page">
        <section :class="$style.hero">
            <div :class="$style.heroInner">
                <p class="type-overline-sb text-main-primary">Product updates</p>
                <h1 class="type-h1-page-title-eb">
                    Platform release notes.
                </h1>
                <p :class="$style.heroCopy" class="type-body-small-r">
                    A curated record of portfolio, shop, admin, infrastructure, and data-layer improvements
                    across the platform.
                </p>
                <div :class="$style.statsGrid" aria-label="Changelog summary">
                    <article :class="$style.statCard">
                        <span class="type-overline-r">Updates</span>
                        <strong class="type-h2-section-title-sb">{{ totalEntries }}</strong>
                    </article>
                    <article :class="$style.statCard">
                        <span class="type-overline-r">Workstreams</span>
                        <strong class="type-h2-section-title-sb">{{ changelogAreas.length }}</strong>
                    </article>
                    <article :class="$style.statCard">
                        <span class="type-overline-r">Latest update</span>
                        <strong class="type-h3-card-title-sb">{{ latestDate }}</strong>
                    </article>
                </div>
            </div>
        </section>

        <section :class="$style.content" aria-labelledby="changelog-heading">
            <div :class="$style.areaGrid">
                <article v-for="area in areaCards" :key="area.id" :class="$style.areaCard">
                    <span :class="[$style.areaDot, $style[area.id]]" aria-hidden="true" />
                    <div :class="$style.areaCardHeader">
                        <p class="type-overline-sb">{{ area.label }}</p>
                        <strong class="type-caption-sb">{{ area.count }}</strong>
                    </div>
                    <h2 class="type-body-main-sb">{{ area.title }}</h2>
                    <p class="type-caption-r">{{ area.summary }}</p>
                    <span :class="$style.areaLatest" class="type-overline-r">Latest {{ area.latest }}</span>
                </article>
            </div>

            <header :class="$style.listHeader" aria-labelledby="changelog-heading">
                <div>
                    <p class="type-overline-sb text-main-primary">{{ selectedAreaLabel }}</p>
                    <h2 id="changelog-heading" class="type-h2-section-title-sb">
                        Updates
                    </h2>
                    <p :class="$style.resultText" class="type-caption-r">{{ resultSummary }}</p>
                </div>
            </header>

            <div :class="$style.controlBar" aria-label="Changelog filters">
                <label :class="$style.searchWrap">
                    <span class="type-overline-sb">Find updates</span>
                    <input
                        v-model="searchQuery"
                        :class="$style.searchInput"
                        type="search"
                        placeholder="Search by version, date, or topic..."
                    >
                </label>

                <label :class="$style.sortWrap">
                    <span class="type-overline-sb">Timeline</span>
                    <select v-model="sortMode" :class="$style.sortSelect">
                        <option value="newest">Recent first</option>
                        <option value="oldest">Oldest first</option>
                    </select>
                </label>
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
                    <span>{{ tab.label }}</span>
                    <strong>{{ areaCounts.get(tab.id) ?? 0 }}</strong>
                </button>
            </div>

            <ol v-if="visibleEntries.length > 0" :class="$style.timeline">
                <li v-for="entry in visibleEntries" :key="`${entry.areaId}-${entry.version}`" :class="$style.entry">
                    <article :class="$style.entryCard">
                        <header :class="$style.entryHeader">
                            <div :class="$style.entryMeta">
                                <span :class="[$style.markerDot, $style[entry.areaId]]" aria-hidden="true" />
                                <span :class="[$style.areaBadge, $style[entry.areaId]]" class="type-overline-sb">
                                    {{ entry.areaLabel }}
                                </span>
                                <span class="type-caption-r">{{ entry.date }}</span>
                            </div>
                            <strong class="type-caption-sb">v{{ entry.version }}</strong>
                        </header>
                        <div :class="$style.entryBody">
                            <h3 class="type-body-main-sb">{{ entry.title }}</h3>
                            <p v-if="entry.detail" class="type-caption-r">{{ entry.detail }}</p>
                        </div>
                    </article>
                </li>
            </ol>

            <div v-else :class="$style.emptyState">
                <h3 class="type-h3-card-title-sb">No updates found</h3>
                <p class="type-caption-r">Adjust the selected workstream or search term.</p>
                <button :class="$style.resetButton" type="button" @click="resetFilters">
                    Clear filters
                </button>
            </div>

            <footer v-if="visibleEntries.length > 0" :class="$style.listFooter">
                <button
                    v-if="hasMoreEntries"
                    :class="$style.loadMoreButton"
                    type="button"
                    @click="showMore"
                >
                    Show more updates
                </button>
                <span v-else class="type-caption-r">All matching updates are shown.</span>
            </footer>
        </section>
    </main>
    <AppFooter />
</template>

<style module>
.page {
    --change-page: var(--color-neutral-50);
    --change-panel: #ffffff;
    --change-inset: var(--color-neutral-100);
    --change-border: var(--color-input-border);
    --change-divider: var(--color-neutral-200);
    --change-text: var(--color-neutral-800);
    --change-heading: var(--color-text-primary);
    --change-muted: var(--color-neutral-600);
    --change-accent: var(--color-main-primary);

    min-height: 100vh;
    padding-top: var(--spacing-space-16);
    background-color: var(--change-page);
    color: var(--change-text);
    transition: background-color 300ms ease, color 300ms ease;
}

:global(.dark) .page,
:global([data-theme="dark"]) .page {
    --change-page: var(--color-main-section-background);
    --change-panel: var(--color-main-background);
    --change-inset: #1f1f1f;
    --change-border: var(--color-main-divider);
    --change-divider: var(--color-main-divider);
    --change-text: var(--color-text-secondary);
    --change-heading: var(--color-text-secondary);
    --change-muted: #9aa6b4;
    --change-accent: var(--color-main-primary);
}

.page :where(section, article, header, li, div, p, span, strong, h1, h2, h3, input, select, button) {
    transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
}

.hero {
    border-bottom: 1px solid var(--change-divider);
    background-color: var(--change-panel);
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
    color: var(--change-muted);
}

.heroCopy span {
    color: var(--change-heading);
    font-weight: 600;
}

.hero h1,
.listHeader h2,
.areaCard h2,
.emptyState h3 {
    color: var(--change-heading);
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
    border: 1px solid var(--change-border);
    border-radius: var(--radius-lg);
    background: var(--change-panel);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--change-text) 5%, transparent);
    transition: background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
}

.statCard {
    display: grid;
    gap: var(--spacing-space-2);
    min-height: var(--spacing-space-24);
    padding: var(--spacing-space-5);
}

.statCard span {
    color: var(--change-muted);
}

.statCard strong {
    color: var(--change-heading);
}

.content {
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
    padding: var(--spacing-space-10) var(--spacing-space-6) var(--spacing-space-20);
}

.areaGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.areaCard {
    display: flex;
    min-height: auto;
    flex-direction: column;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-4);
    transition: background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease, transform 180ms ease;
}

.areaCard:hover {
    border-color: color-mix(in srgb, var(--change-accent) 40%, var(--change-border));
    box-shadow: 0 10px 28px color-mix(in srgb, var(--change-accent) 14%, transparent);
    transform: translateY(-2px);
}

.areaCardHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
}

.areaCardHeader strong {
    display: inline-flex;
    min-width: var(--spacing-space-8);
    min-height: var(--spacing-space-8);
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background-color: color-mix(in srgb, var(--change-accent) 18%, transparent);
    color: var(--change-heading);
    padding: 0 var(--spacing-space-2);
}

.areaLatest {
    margin-top: auto;
    color: var(--change-muted);
}

.areaCard p {
    color: var(--change-muted);
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
    margin-top: var(--spacing-space-10);
}

.resultText {
    margin-top: var(--spacing-space-2);
    color: var(--change-muted);
}

.controlBar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(180px, 240px);
    gap: var(--spacing-space-4);
    margin-top: var(--spacing-space-5);
    padding: var(--spacing-space-4);
    border: 1px solid var(--change-border);
    border-radius: var(--radius-lg);
    background-color: var(--change-panel);
}

.searchWrap,
.sortWrap {
    display: grid;
    gap: var(--spacing-space-2);
}

.searchWrap span,
.sortWrap span {
    color: var(--change-muted);
}

.searchInput,
.sortSelect {
    width: 100%;
    min-height: var(--spacing-space-12);
    box-sizing: border-box;
    border: 1px solid var(--change-border);
    border-radius: var(--radius-md);
    background-color: var(--change-inset);
    color: var(--change-text);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    font: inherit;
    transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
}

.searchInput:hover,
.sortSelect:hover {
    border-color: color-mix(in srgb, var(--change-accent) 45%, var(--change-border));
}

.searchInput:focus,
.sortSelect:focus {
    border-color: var(--change-accent);
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--change-accent) 18%, transparent);
}

.tabs {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: var(--spacing-space-2);
    margin-top: var(--spacing-space-4);
}

.tab {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-space-2);
    min-height: var(--spacing-space-10);
    border: 1px solid var(--change-border);
    border-radius: var(--radius-full);
    background: var(--change-panel);
    color: var(--change-text);
    padding: var(--spacing-space-2) var(--spacing-space-4);
    cursor: pointer;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.tab strong {
    display: inline-flex;
    min-width: var(--spacing-space-6);
    justify-content: center;
    border-radius: var(--radius-full);
    background-color: color-mix(in srgb, var(--change-accent) 16%, transparent);
    color: currentColor;
    padding: 0 var(--spacing-space-2);
}

.tab:hover {
    border-color: var(--change-accent);
    background-color: color-mix(in srgb, var(--change-accent) 12%, var(--change-panel));
}

.tab:focus-visible {
    outline: 2px solid var(--change-accent);
    outline-offset: 2px;
}

.activeTab {
    border-color: var(--change-accent);
    background: var(--change-accent);
    color: var(--color-button-primary-btn-text-active);
}

.timeline {
    display: grid;
    gap: var(--spacing-space-4);
    margin: var(--spacing-space-6) 0 0;
    padding: 0;
    list-style: none;
}

.entry {
    min-width: 0;
}

.markerDot {
    width: var(--spacing-space-3);
    height: var(--spacing-space-3);
    flex: 0 0 auto;
}

.entryCard {
    height: 100%;
    box-sizing: border-box;
    padding: var(--spacing-space-5) var(--spacing-space-6);
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
    color: var(--change-heading);
}

.areaBadge {
    display: inline-flex;
    align-items: center;
    min-height: var(--spacing-space-7);
    border-radius: var(--radius-full);
    color: var(--color-button-primary-btn-text-active);
    padding: var(--spacing-space-1) var(--spacing-space-3);
}

.entryBody {
    display: grid;
    gap: var(--spacing-space-2);
}

.entryBody h3 {
    color: var(--change-heading);
}

.entryBody p {
    color: var(--change-text);
    line-height: 1.45;
}

.emptyState {
    display: grid;
    justify-items: start;
    gap: var(--spacing-space-3);
    margin-top: var(--spacing-space-6);
    padding: var(--spacing-space-8);
    border: 1px solid var(--change-border);
    border-radius: var(--radius-lg);
    background-color: var(--change-panel);
}

.emptyState p,
.listFooter span {
    color: var(--change-muted);
}

.listFooter {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-space-8);
}

.loadMoreButton,
.resetButton {
    min-height: var(--spacing-space-12);
    border: 1px solid var(--change-accent);
    border-radius: var(--radius-full);
    background-color: var(--change-accent);
    color: var(--color-button-primary-btn-text-active);
    padding: var(--spacing-space-3) var(--spacing-space-6);
    cursor: pointer;
    transition: background-color 300ms ease, border-color 300ms ease, transform 160ms ease;
}

.loadMoreButton:hover,
.resetButton:hover {
    border-color: var(--color-button-primary-btn-hover);
    background-color: var(--color-button-primary-btn-hover);
    transform: translateY(-1px);
}

.loadMoreButton:focus-visible,
.resetButton:focus-visible {
    outline: 2px solid var(--change-accent);
    outline-offset: 2px;
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

    .controlBar {
        grid-template-columns: 1fr;
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

    .entryCard {
        padding: var(--spacing-space-4);
    }

    .entryHeader,
    .entryMeta {
        align-items: flex-start;
        flex-direction: column;
        gap: var(--spacing-space-2);
    }

    .controlBar,
    .emptyState {
        padding: var(--spacing-space-4);
    }
}
</style>
