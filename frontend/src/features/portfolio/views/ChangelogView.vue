<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { AppFooter } from "@/shared/layout";

import backendMarkdown from "../../../../../docs/changelog/backend.md?raw";
import databaseMarkdown from "../../../../../docs/changelog/database.md?raw";
import frontendMarkdown from "../../../../../docs/changelog/frontend.md?raw";
import otherMarkdown from "../../../../../docs/changelog/other.md?raw";

type AreaId = "all" | "frontend" | "backend" | "database" | "other";
type ReleaseAreaId = Exclude<AreaId, "all">;
type SortMode = "newest" | "oldest";

interface ReleaseArea {
    id: ReleaseAreaId;
    label: string;
    description: string;
    markdown: string;
}

interface Release {
    areaId: ReleaseAreaId;
    areaLabel: string;
    version: string;
    date: string;
    change: string;
}

const releaseAreas = [
    {
        id: "frontend",
        label: "Frontend",
        description: "Portfolio, shop, admin, and customer-facing experiences.",
        markdown: frontendMarkdown,
    },
    {
        id: "backend",
        label: "Backend",
        description: "Platform APIs, billing integration, and bot operations.",
        markdown: backendMarkdown,
    },
    {
        id: "database",
        label: "Database",
        description: "Schemas, policies, migrations, and durable platform data.",
        markdown: databaseMarkdown,
    },
    {
        id: "other",
        label: "Other",
        description: "Infrastructure, delivery, documentation, and tooling.",
        markdown: otherMarkdown,
    },
] as const satisfies readonly ReleaseArea[];

const areaOptions = [
    { id: "all", label: "All releases" },
    ...releaseAreas.map((area) => ({ id: area.id, label: area.label })),
] as const satisfies readonly { id: AreaId; label: string }[];

const PAGE_SIZE = 10;
const selectedArea = ref<AreaId>("all");
const searchQuery = ref("");
const sortMode = ref<SortMode>("newest");
const visibleLimit = ref(PAGE_SIZE);

function cleanMarkdown(value: string): string {
    return value
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .trim();
}

function parseReleases(area: ReleaseArea): Release[] {
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

const areaOrder = new Map(releaseAreas.map((area, index) => [area.id, index]));

function compareReleases(left: Release, right: Release): number {
    const dateComparison = right.date.localeCompare(left.date);
    if (dateComparison !== 0) return dateComparison;
    return (areaOrder.get(left.areaId) ?? 0) - (areaOrder.get(right.areaId) ?? 0);
}

const allReleases = releaseAreas
    .flatMap((area) => parseReleases(area))
    .sort(compareReleases);

const latestRelease = allReleases[0];
const firstRelease = allReleases.at(-1);
const areaCounts = new Map<AreaId, number>([
    ["all", allReleases.length],
    ...releaseAreas.map((area) => [
        area.id,
        allReleases.filter((release) => release.areaId === area.id).length,
    ] as const),
]);

const filteredReleases = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const areaMatches = selectedArea.value === "all"
        ? allReleases
        : allReleases.filter((release) => release.areaId === selectedArea.value);
    const queryMatches = query
        ? areaMatches.filter((release) => [
            release.areaLabel,
            release.version,
            release.date,
            release.change,
        ].some((value) => value.toLowerCase().includes(query)))
        : areaMatches;

    return [...queryMatches].sort((left, right) => (
        sortMode.value === "newest"
            ? compareReleases(left, right)
            : compareReleases(right, left)
    ));
});

const visibleReleases = computed(() => filteredReleases.value.slice(0, visibleLimit.value));
const hasMoreReleases = computed(() => visibleReleases.value.length < filteredReleases.value.length);
const activeArea = computed(() => (
    areaOptions.find((option) => option.id === selectedArea.value)?.label ?? "All releases"
));

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
                <div :class="$style.heroHeading">
                    <p :class="$style.eyebrow">Release history</p>
                    <h1>Built in public.</h1>
                </div>

                <div :class="$style.heroSummary">
                    <p>
                        A concise record of meaningful platform releases—not every edit made along the way.
                    </p>
                    <dl>
                        <div>
                            <dt>Releases</dt>
                            <dd>{{ allReleases.length }}</dd>
                        </div>
                        <div>
                            <dt>Since</dt>
                            <dd>{{ firstRelease?.date ?? "—" }}</dd>
                        </div>
                        <div>
                            <dt>Workstreams</dt>
                            <dd>{{ releaseAreas.length }}</dd>
                        </div>
                    </dl>
                </div>

                <article v-if="latestRelease" :class="$style.latestRelease">
                    <div>
                        <span :class="[$style.areaMark, $style[latestRelease.areaId]]" aria-hidden="true" />
                        <span>{{ latestRelease.areaLabel }}</span>
                        <time :datetime="latestRelease.date">{{ latestRelease.date }}</time>
                    </div>
                    <strong>v{{ latestRelease.version }}</strong>
                    <p>{{ latestRelease.change }}</p>
                </article>
            </div>
        </section>

        <section :class="$style.archive" aria-labelledby="release-archive-title">
            <header :class="$style.archiveHeader">
                <div>
                    <p :class="$style.eyebrow">Product milestones</p>
                    <h2 id="release-archive-title">Release archive</h2>
                </div>
                <p>
                    {{ filteredReleases.length }} {{ filteredReleases.length === 1 ? "release" : "releases" }}
                    · {{ activeArea }}
                </p>
            </header>

            <div :class="$style.controls">
                <div :class="$style.tabs" role="tablist" aria-label="Filter release workstream">
                    <button
                        v-for="option in areaOptions"
                        :key="option.id"
                        type="button"
                        role="tab"
                        :aria-selected="selectedArea === option.id"
                        :class="[$style.tab, selectedArea === option.id ? $style.activeTab : '']"
                        @click="selectedArea = option.id"
                    >
                        <span>{{ option.label }}</span>
                        <strong>{{ areaCounts.get(option.id) ?? 0 }}</strong>
                    </button>
                </div>

                <div :class="$style.filterRow">
                    <label :class="$style.searchField">
                        <span>Search releases</span>
                        <span :class="$style.searchControl">
                            <input
                                v-model="searchQuery"
                                type="search"
                                placeholder="Version, date, or feature"
                            >
                            <button
                                v-if="searchQuery"
                                type="button"
                                aria-label="Clear release search"
                                @click="searchQuery = ''"
                            >
                                <span aria-hidden="true" />
                            </button>
                        </span>
                    </label>
                    <fieldset :class="$style.sortField">
                        <legend>Order</legend>
                        <div :class="$style.sortOptions">
                            <button
                                type="button"
                                :aria-pressed="sortMode === 'newest'"
                                :class="sortMode === 'newest' ? $style.activeSort : ''"
                                @click="sortMode = 'newest'"
                            >
                                <span>Newest first</span>
                            </button>
                            <button
                                type="button"
                                :aria-pressed="sortMode === 'oldest'"
                                :class="sortMode === 'oldest' ? $style.activeSort : ''"
                                @click="sortMode = 'oldest'"
                            >
                                <span>Oldest first</span>
                            </button>
                        </div>
                    </fieldset>
                </div>
            </div>

            <ol v-if="visibleReleases.length" :class="$style.releaseList">
                <li
                    v-for="release in visibleReleases"
                    :key="`${release.areaId}-${release.version}`"
                    :class="$style.releaseItem"
                >
                    <div :class="$style.versionColumn">
                        <strong>v{{ release.version }}</strong>
                        <time :datetime="release.date">{{ release.date }}</time>
                    </div>
                    <article :class="$style.releaseBody">
                        <div :class="$style.releaseMeta">
                            <span :class="[$style.areaMark, $style[release.areaId]]" aria-hidden="true" />
                            <span>{{ release.areaLabel }}</span>
                        </div>
                        <p>{{ release.change }}</p>
                    </article>
                </li>
            </ol>

            <div v-else :class="$style.emptyState">
                <h3>No matching release</h3>
                <p>Try another workstream or a broader search.</p>
                <button type="button" @click="resetFilters">Clear filters</button>
            </div>

            <footer v-if="visibleReleases.length" :class="$style.archiveFooter">
                <button
                    v-if="hasMoreReleases"
                    type="button"
                    @click="visibleLimit += PAGE_SIZE"
                >
                    Show more releases
                </button>
                <span v-else>You have reached the beginning.</span>
            </footer>
        </section>
    </main>

    <AppFooter />
</template>

<style module>
.page {
    min-height: 100dvh;
    padding-top: 73px;
    background: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    text-align: left;
}

.hero {
    background: var(--color-main-surface);
    color: var(--color-button-primary);
}

.heroInner {
    display: grid;
    box-sizing: border-box;
    width: min(100%, 1280px);
    min-height: min(78dvh, 820px);
    margin: 0 auto;
    padding: var(--spacing-space-16);
    align-content: center;
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
    gap: var(--spacing-space-12);
}

.heroHeading h1 {
    max-width: 850px;
    margin: 0;
    font-size: clamp(4rem, 10vw, 9rem);
    font-weight: 800;
    letter-spacing: -0.075em;
    line-height: 0.82;
}

.eyebrow {
    margin: 0 0 var(--spacing-space-5);
    color: var(--color-main-brand-secondary);
    font-size: var(--type-size-overline);
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.heroSummary {
    align-self: end;
}

.heroSummary > p {
    max-width: 420px;
    margin: 0 0 var(--spacing-space-8);
    color: color-mix(in srgb, var(--color-button-primary) 70%, transparent);
    font-size: var(--type-size-body-small);
    line-height: 1.65;
}

.heroSummary dl {
    display: grid;
    margin: 0;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.heroSummary dl div {
    padding-top: var(--spacing-space-3);
    border-top: 1px solid color-mix(in srgb, var(--color-button-primary) 32%, transparent);
}

.heroSummary dt {
    color: color-mix(in srgb, var(--color-button-primary) 54%, transparent);
    font-size: var(--type-size-overline);
    text-transform: uppercase;
}

.heroSummary dd {
    margin: var(--spacing-space-2) 0 0;
    font-size: var(--type-size-body-main);
    font-weight: 600;
}

.latestRelease {
    display: grid;
    padding-top: var(--spacing-space-8);
    border-top: 1px solid color-mix(in srgb, var(--color-button-primary) 32%, transparent);
    grid-column: 1 / -1;
    grid-template-columns: minmax(180px, 0.35fr) minmax(120px, 0.25fr) minmax(0, 1.4fr);
    gap: var(--spacing-space-8);
}

.latestRelease > div,
.releaseMeta {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-2);
}

.latestRelease > div {
    flex-wrap: wrap;
    color: color-mix(in srgb, var(--color-button-primary) 64%, transparent);
    font-size: var(--type-size-caption);
}

.latestRelease time {
    width: 100%;
}

.latestRelease strong {
    font-size: var(--type-size-subtitle);
}

.latestRelease p {
    margin: 0;
    color: color-mix(in srgb, var(--color-button-primary) 82%, transparent);
    font-size: var(--type-size-body-small);
    line-height: 1.55;
}

.archive {
    box-sizing: border-box;
    width: min(100%, 1280px);
    margin: 0 auto;
    padding: var(--spacing-space-20) var(--spacing-space-16) var(--spacing-space-32);
}

.archiveHeader {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--spacing-space-8);
}

.archiveHeader h2 {
    margin: 0;
    font-size: clamp(2.75rem, 7vw, 6rem);
    font-weight: 800;
    letter-spacing: -0.065em;
    line-height: 0.9;
}

.archiveHeader > p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--type-size-caption);
}

.controls {
    display: grid;
    margin-top: var(--spacing-space-12);
    gap: var(--spacing-space-6);
}

.tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-space-2);
}

.tab {
    display: inline-flex;
    min-height: var(--spacing-space-10);
    padding: var(--spacing-space-2) var(--spacing-space-4);
    align-items: center;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    gap: var(--spacing-space-3);
}

.tab strong {
    color: inherit;
    font-size: var(--type-size-overline);
}

.tab:hover {
    color: var(--color-text-primary);
}

.tab:focus-visible,
.filterRow input:focus-visible,
.searchControl button:focus-visible,
.sortOptions button:focus-visible,
.emptyState button:focus-visible,
.archiveFooter button:focus-visible {
    outline: 2px solid var(--color-text-primary);
    outline-offset: 3px;
}

.activeTab {
    border-color: var(--color-main-surface);
    background: var(--color-main-surface);
    color: var(--color-button-primary);
}

.activeTab span,
.activeTab strong {
    color: var(--color-button-primary);
    -webkit-text-fill-color: var(--color-button-primary);
}

.filterRow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
    gap: var(--spacing-space-4);
}

.searchField,
.sortField {
    display: grid;
    margin: 0;
    padding: 0;
    border: 0;
    color: var(--color-text-secondary);
    font-size: var(--type-size-overline);
    font-weight: 600;
    gap: var(--spacing-space-2);
    text-transform: uppercase;
}

.filterRow input {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--spacing-space-12);
    padding: var(--spacing-space-3) var(--spacing-space-12) var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-md);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    font: inherit;
    text-transform: none;
}

.filterRow input::-webkit-search-cancel-button {
    display: none;
    appearance: none;
}

.searchControl {
    position: relative;
    display: block;
}

.searchControl button {
    position: absolute;
    top: 50%;
    right: var(--spacing-space-3);
    display: grid;
    width: var(--spacing-space-8);
    height: var(--spacing-space-8);
    padding: 0;
    place-items: center;
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transform: translateY(-50%);
}

.searchControl button:hover {
    background: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
    color: var(--color-text-primary);
}

.searchControl button > span,
.searchControl button > span::after {
    display: block;
    width: 14px;
    height: 2px;
    border-radius: var(--radius-full);
    background: currentColor;
    content: "";
}

.searchControl button > span {
    transform: rotate(45deg);
}

.searchControl button > span::after {
    transform: rotate(90deg);
}

.sortField legend {
    margin-bottom: var(--spacing-space-2);
    padding: 0;
}

.sortOptions {
    display: grid;
    min-height: var(--spacing-space-12);
    padding: 3px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-md);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 3px;
}

.sortOptions button {
    padding: var(--spacing-space-2) var(--spacing-space-3);
    border: 0;
    border-radius: calc(var(--radius-md) - 3px);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    cursor: pointer;
    text-transform: none;
    white-space: nowrap;
}

.sortOptions button:hover {
    color: var(--color-text-primary);
}

.sortOptions .activeSort {
    background: var(--color-main-surface);
    color: var(--color-button-primary);
}

.sortOptions .activeSort span {
    color: var(--color-button-primary);
    -webkit-text-fill-color: var(--color-button-primary);
}

.releaseList {
    margin: var(--spacing-space-12) 0 0;
    padding: 0;
    border-top: 1px solid var(--color-main-divider);
    list-style: none;
}

.releaseItem {
    display: grid;
    padding: var(--spacing-space-10) 0;
    border-bottom: 1px solid var(--color-main-divider);
    grid-template-columns: minmax(190px, 0.45fr) minmax(0, 1.55fr);
    gap: var(--spacing-space-12);
}

.versionColumn {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.versionColumn strong {
    font-size: clamp(1.65rem, 3vw, 2.75rem);
    letter-spacing: -0.04em;
}

.versionColumn time {
    color: var(--color-text-secondary);
    font-size: var(--type-size-caption);
}

.releaseBody {
    display: grid;
    gap: var(--spacing-space-4);
}

.releaseMeta {
    color: var(--color-text-secondary);
    font-size: var(--type-size-overline);
    font-weight: 600;
    text-transform: uppercase;
}

.areaMark {
    display: inline-block;
    width: var(--spacing-space-2);
    height: var(--spacing-space-2);
    border-radius: var(--radius-full);
}

.frontend {
    background: var(--color-status-info);
}

.backend {
    background: var(--color-status-success);
}

.database {
    background: var(--color-status-warning);
}

.other {
    background: var(--color-main-brand-secondary);
}

.releaseBody p {
    max-width: 820px;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: clamp(1.15rem, 2.4vw, 1.8rem);
    line-height: 1.45;
}

.emptyState {
    display: grid;
    margin-top: var(--spacing-space-12);
    padding: var(--spacing-space-16) 0;
    justify-items: start;
    border-top: 1px solid var(--color-main-divider);
    border-bottom: 1px solid var(--color-main-divider);
    gap: var(--spacing-space-3);
}

.emptyState h3,
.emptyState p {
    margin: 0;
}

.emptyState p,
.archiveFooter span {
    color: var(--color-text-secondary);
}

.emptyState button,
.archiveFooter button {
    min-height: var(--spacing-space-12);
    padding: var(--spacing-space-3) var(--spacing-space-6);
    border: 1px solid var(--color-text-primary);
    border-radius: var(--radius-full);
    background: var(--color-text-primary);
    color: var(--color-main-background);
    cursor: pointer;
}

.archiveFooter {
    display: flex;
    margin-top: var(--spacing-space-10);
    justify-content: center;
}

@media (max-width: 900px) {
    .heroInner {
        min-height: 700px;
        grid-template-columns: 1fr;
        gap: var(--spacing-space-8);
    }

    .heroSummary {
        align-self: start;
    }

    .latestRelease {
        grid-template-columns: minmax(140px, 0.4fr) minmax(100px, 0.25fr) minmax(0, 1fr);
        gap: var(--spacing-space-5);
    }

    .releaseItem {
        gap: var(--spacing-space-8);
    }
}

@media (max-width: 640px) {
    .page {
        padding-top: 65px;
    }

    .heroInner {
        min-height: 650px;
        padding: var(--spacing-space-12) var(--spacing-space-6);
    }

    .heroHeading h1 {
        font-size: clamp(4rem, 21vw, 6rem);
    }

    .heroSummary dl {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .latestRelease,
    .filterRow,
    .releaseItem {
        grid-template-columns: 1fr;
    }

    .latestRelease {
        gap: var(--spacing-space-4);
    }

    .archive {
        padding: var(--spacing-space-14) var(--spacing-space-6) var(--spacing-space-20);
    }

    .archiveHeader {
        align-items: flex-start;
        flex-direction: column;
    }

    .tabs {
        flex-wrap: nowrap;
        padding-bottom: var(--spacing-space-2);
        overflow-x: auto;
    }

    .tab {
        flex: 0 0 auto;
    }

    .releaseItem {
        padding: var(--spacing-space-8) 0;
        gap: var(--spacing-space-5);
    }

    .releaseBody p {
        font-size: var(--type-size-body-main);
    }
}
</style>
