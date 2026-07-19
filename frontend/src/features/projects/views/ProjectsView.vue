<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { AppFooter } from "@/shared/layout";
import { PrimaryButton } from "@/shared/ui/buttons";
import { FeaturedProjectCard, FeatureModal, ProjectTable } from "@/features/projects/components";
import { icons } from "@/config";
import type { ProjectTableRow } from "@/config";
import { useToastStore, useUserStore } from "@/stores";
import { useProjectStore } from "@/features/projects/stores";
import type { FeaturedProjectId } from "@/features/projects/stores";

interface GithubContributionDay {
    count: number;
    date: string;
    intensity: string;
}

interface GithubContributionResponse {
    contributions: GithubContributionDay[][];
    total: number;
}

const GITHUB_CONTRIBUTIONS_URL = "https://gh-calendar.rschristian.dev/user/Fujipp";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { isAdmin } = storeToRefs(userStore);
const projectStore = useProjectStore();
const toastStore = useToastStore();
const { error, isLoading, projects } = storeToRefs(projectStore);
const isFeatureModalOpen = ref(false);
const contributionTotal = ref<number | null>(null);
const contributionWeeks = ref<GithubContributionDay[][]>([]);
const contributionError = ref(false);
const contributionYear = ref("last");
const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"] as const;
const currentYear = new Date().getFullYear();
const contributionYearOptions = [
    { label: "Last year", value: "last" },
    ...Array.from({ length: 5 }, (_, index) => {
        const year = String(currentYear - index);
        return { label: year, value: year };
    }),
];
let contributionRequestId = 0;

const contributionMonthLabels = computed(() => contributionWeeks.value.map((week, index, weeks) => {
    const firstDate = week[0]?.date;
    if (!firstDate) return "";

    const month = firstDate.slice(0, 7);
    const previousMonth = weeks[index - 1]?.[0]?.date.slice(0, 7);
    if (month === previousMonth) return "";

    return new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" })
        .format(new Date(`${firstDate}T00:00:00Z`));
}));

const featuredProjects = computed(() => projects.value
    .filter((project) => project.featured)
    .sort((left, right) => (left.featuredOrder ?? 999) - (right.featuredOrder ?? 999))
    .slice(0, 3));

const featuredSkeletonCards = computed(() => isLoading.value && projects.value.length === 0
    ? Array.from({ length: 3 }, (_, index) => index)
    : []);

const shouldShowFeaturedSection = computed(() => (
    isAdmin.value
    || featuredProjects.value.length > 0
    || featuredSkeletonCards.value.length > 0
));

const projectRows = computed(() => projects.value.map((project) => ({
    id: project.id,
    projectName: project.content.en.projectName,
    description: project.content.en.descriptionShort,
    stack: project.stack,
    category: project.category,
    status: project.status,
})) satisfies readonly ProjectTableRow[]);

onMounted(() => {
    if (!projectStore.hasLoadedAll) {
        void projectStore.fetchProjects().catch(() => undefined);
    }

    void fetchGithubContributions();
});

async function fetchGithubContributions(): Promise<void> {
    const requestId = ++contributionRequestId;
    contributionError.value = false;
    contributionTotal.value = null;
    contributionWeeks.value = [];

    try {
        const url = contributionYear.value === "last"
            ? GITHUB_CONTRIBUTIONS_URL
            : `${GITHUB_CONTRIBUTIONS_URL}?year=${contributionYear.value}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`GitHub contribution request failed: ${response.status}`);

        const data = await response.json() as GithubContributionResponse;
        if (!Number.isFinite(data.total) || !Array.isArray(data.contributions)) {
            throw new Error("Invalid GitHub contribution response");
        }

        if (requestId === contributionRequestId) {
            contributionTotal.value = data.total;
            contributionWeeks.value = data.contributions;
        }
    } catch {
        if (requestId === contributionRequestId) contributionError.value = true;
    }
}

watch(contributionYear, () => {
    void fetchGithubContributions();
});

function contributionLabel(day: GithubContributionDay): string {
    const contributionText = day.count === 1 ? "contribution" : "contributions";
    const formattedDate = new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
        year: "numeric",
    }).format(new Date(`${day.date}T00:00:00Z`));

    return `${formattedDate} · ${day.count} ${contributionText}`;
}

/* Hero "Slide down" scrolls to the next visible section. */
const featuredSectionRef = ref<HTMLElement | null>(null);
const allProjectsSectionRef = ref<HTMLElement | null>(null);

function scrollToNextSection(): void {
    (featuredSectionRef.value ?? allProjectsSectionRef.value)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* Keep the visible showcase in its ranked order: top 1 · top 2 · top 3.
   Slots stay tied to the store order so admin editing targets the right rank. */
const featuredDisplay = computed(() => {
    return featuredProjects.value.map((project, slot) => ({ project, slot }));
});

const showcaseSlides = computed(() => [
    ...featuredSkeletonCards.value.map((index) => ({
        kind: "skeleton" as const,
        key: `featured-skeleton-${index}`,
        slot: index,
    })),
    ...featuredDisplay.value.map((entry) => ({
        kind: "project" as const,
        key: entry.project.id,
        project: entry.project,
        slot: entry.slot,
    })),
]);

const slideCount = computed(() => showcaseSlides.value.length);
const featuredTrackRef = ref<HTMLElement | null>(null);

function scrollFeatured(direction: -1 | 1): void {
    const track = featuredTrackRef.value;
    if (!track) return;

    track.scrollBy({
        behavior: "smooth",
        left: direction * Math.max(320, track.clientWidth * 0.72),
    });
}

function openProject(row: ProjectTableRow): void {
    void router.push({ name: "project-detail", params: { projectId: row.id } });
}

async function closeFeatureModal(): Promise<void> {
    isFeatureModalOpen.value = false;
    if (route.query.top3 === "manage") {
        const query = { ...route.query };
        delete query.top3;
        await router.replace({ query });
    }
}

async function saveFeaturedProjects(projectIds: FeaturedProjectId[]): Promise<void> {
    /* Close right away; the outcome is reported through a toast only. */
    await closeFeatureModal();

    try {
        await projectStore.updateFeaturedProjects(projectIds);
        await projectStore.fetchProjects();
        toastStore.show(
            "Featured projects updated",
            "The featured section has been saved successfully.",
            "success",
        );
    } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to update featured projects.";
        toastStore.show("Unable to update featured projects", message, "error");
    }
}

watch(
    [() => route.query.top3, isAdmin],
    ([top3, admin]) => {
        if (top3 === "manage" && admin) isFeatureModalOpen.value = true;
    },
    { immediate: true },
);
</script>

<template>
    <main :class="$style.projects">
            <div :class="$style.projectsContainer">
            <section :class="$style.hero" aria-labelledby="projects-hero-title">
                <h1 id="projects-hero-title" :class="$style.heroTitle">Featured</h1>
                <p :class="$style.heroSubtitle">Top 3 Projects</p>
                <PrimaryButton
                    width-mode="hug"
                    @click="scrollToNextSection"
                >
                    <template #leading-icon>
                        <span
                            :class="$style.slideDownIcon"
                            :style="{ '--slide-down-icon': `url(${icons.directionDown})` }"
                            aria-hidden="true"
                        />
                    </template>
                    Slide down
                </PrimaryButton>
            </section>

            <section
                v-if="shouldShowFeaturedSection"
                ref="featuredSectionRef"
                :class="$style.featuredSection"
                aria-labelledby="featured-showcase-title"
            >
                <div :class="$style.featuredHeader">
                    <h2 id="featured-showcase-title" :class="$style.featuredTitle">
                        Selected work.<span> Built with purpose.</span>
                    </h2>
                    <div v-if="slideCount > 1" :class="$style.featuredControls">
                        <button type="button" :class="$style.featuredArrow" aria-label="Previous featured project" @click="scrollFeatured(-1)">
                            <span :style="{ '--featured-arrow': `url(${icons.directionLeft})` }" aria-hidden="true" />
                        </button>
                        <button type="button" :class="$style.featuredArrow" aria-label="Next featured project" @click="scrollFeatured(1)">
                            <span :style="{ '--featured-arrow': `url(${icons.directionRight})` }" aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <div ref="featuredTrackRef" :class="$style.featuredTrack">
                    <div
                        v-for="(slide, index) in showcaseSlides"
                        :key="slide.key"
                        :class="$style.featuredSlide"
                    >
                        <FeaturedProjectCard
                            v-if="slide.kind === 'skeleton'"
                            mode="skeleton"
                            project-name="Loading featured project"
                            size="showcase"
                        />
                        <FeaturedProjectCard
                            v-else-if="slide.kind === 'project'"
                            :category="slide.project.category"
                            :description-short="slide.project.content.en.descriptionShort"
                            :image-loading="index === 0 ? 'eager' : 'lazy'"
                            :project-name="slide.project.content.en.projectName"
                            size="showcase"
                            :stack-groups="slide.project.stackGroups"
                            :tech-stack="slide.project.techStack"
                            :thumbnail-src="slide.project.gallery[0] ?? ''"
                            :to="{ name: 'project-detail', params: { projectId: slide.project.id } }"
                            :view-label="`View top ${slide.slot + 1}`"
                        />
                    </div>
                </div>
            </section>

            <section
                ref="allProjectsSectionRef"
                :class="$style.allProjectSection"
                aria-label="All projects"
            >
                <h2 :class="$style.allProjectTitle" class="type-h2-section-title-eb">All Projects</h2>
                <p :class="$style.allProjectSubtitle">
                    Please feel free to explore any projects that catch your interest.
                </p>
                <ProjectTable
                    empty-message="No projects found."
                    :error-message="error ? `Unable to load projects: ${error}` : null"
                    :loading="isLoading"
                    :rows="projectRows"
                    :show-admin-actions="false"
                    @row-click="openProject"
                />
            </section>

            <section :class="$style.githubActivitySection" aria-labelledby="github-activity-title">
                <h2 id="github-activity-title" :class="$style.githubActivityTitle">Github Activity</h2>
                <p :class="$style.githubActivitySubtitle" aria-live="polite">
                    <template v-if="contributionTotal !== null">
                        {{ contributionTotal.toLocaleString() }} contributions in the last year
                    </template>
                    <template v-else-if="contributionError">
                        Contribution activity is temporarily unavailable.
                    </template>
                    <template v-else>
                        Loading contributions…
                    </template>
                </p>

                <div :class="$style.yearPicker" aria-label="Contribution year">
                    <button
                        v-for="option in contributionYearOptions"
                        :key="option.value"
                        type="button"
                        :class="[
                            $style.yearOption,
                            contributionYear === option.value ? $style.yearOptionActive : '',
                        ]"
                        :aria-pressed="contributionYear === option.value"
                        @click="contributionYear = option.value"
                    >
                        {{ option.label }}
                    </button>
                </div>

                <div v-if="contributionWeeks.length" :class="$style.contributionScroller">
                    <div :class="$style.contributionCalendar" aria-label="GitHub contribution calendar">
                        <div :class="$style.calendarBody">
                            <div :class="$style.monthSpacer" aria-hidden="true" />
                            <div :class="$style.monthLabels" aria-hidden="true">
                                <span v-for="(month, index) in contributionMonthLabels" :key="index">{{ month }}</span>
                            </div>
                            <div :class="$style.weekdayLabels" aria-hidden="true">
                                <span v-for="(label, index) in weekdayLabels" :key="`${label}-${index}`">{{ label }}</span>
                            </div>
                            <div :class="$style.contributionWeeks">
                                <div
                                    v-for="(week, weekIndex) in contributionWeeks"
                                    :key="weekIndex"
                                    :class="$style.contributionWeek"
                                >
                                    <span
                                        v-for="day in week"
                                        :key="day.date"
                                        :class="$style.contributionDay"
                                        :data-intensity="day.intensity"
                                        :data-tooltip="contributionLabel(day)"
                                        :aria-label="contributionLabel(day)"
                                        tabindex="0"
                                    />
                                </div>
                            </div>
                        </div>
                        <div :class="$style.contributionLegend" aria-label="Contribution intensity legend">
                            <span>Less</span>
                            <span :class="$style.legendItem"><i :class="$style.contributionDay" />No contributions.</span>
                            <span :class="$style.legendItem"><i :class="$style.contributionDay" data-intensity="1" />Low contributions.</span>
                            <span :class="$style.legendItem"><i :class="$style.contributionDay" data-intensity="2" />Medium-low contributions.</span>
                            <span :class="$style.legendItem"><i :class="$style.contributionDay" data-intensity="3" />Medium-high contributions.</span>
                            <span :class="$style.legendItem"><i :class="$style.contributionDay" data-intensity="4" />High contributions.</span>
                            <span>More</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
        <AppFooter />
        <FeatureModal
            v-if="isFeatureModalOpen"
            :model-value="featuredProjects.map((project) => project.id)"
            title="Top 3 Projects"
            :disabled="isLoading"
            :rows="projectRows"
            @cancel="closeFeatureModal"
            @save="saveFeaturedProjects"
        />
    </main>
</template>

<style module>
.projects {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-height: 100dvh;
    padding-top: 73px;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    transition: color 300ms ease;
}

.projectsContainer {
    display: flex;
    flex: 1;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
}

.hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: calc(100dvh - 73px);
    gap: var(--spacing-space-4);
    padding: 0 var(--spacing-space-4);
    font-family: var(--font-rammetto-one);
    text-align: left;
}

.heroTitle,
.heroSubtitle {
    margin: 0;
    font-size: 64px;
    font-weight: 400;
}

.slideDownIcon {
    position: relative;
    z-index: 1;
    display: inline-block;
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    flex-shrink: 0;
    background: currentColor;
    mask: var(--slide-down-icon) center / contain no-repeat;
    -webkit-mask: var(--slide-down-icon) center / contain no-repeat;
    animation: slide-down-icon 1.5s ease-in-out infinite;
}

@keyframes slide-down-icon {
    0%,
    100% {
        transform: translateY(-2px);
    }

    50% {
        transform: translateY(4px);
    }
}

.featuredSection {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    align-self: stretch;
    box-sizing: border-box;
    width: 100vw;
    margin-left: calc(50% - 50vw);
    min-height: 760px;
    gap: var(--spacing-space-6);
    padding-block: var(--spacing-space-12);
    padding-inline: max(var(--spacing-space-8), calc((100vw - var(--container-7xl)) / 2 + var(--spacing-space-8)));
    background-color: var(--color-main-surface);
    scroll-margin-top: 73px; /* fixed navbar height */
}

.featuredHeader {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-space-6);
}

.featuredTitle {
    max-width: 900px;
    margin: 0;
    color: var(--color-button-primary);
    font-size: clamp(38px, 4.2vw, 64px);
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1.05;
}

.featuredTitle span {
    color: color-mix(in srgb, var(--color-button-primary) 62%, transparent);
}

.featuredControls {
    display: flex;
    flex-shrink: 0;
    gap: var(--spacing-space-3);
}

.featuredArrow {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    border: 0;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-button-primary) 10%, transparent);
    color: var(--color-button-primary);
    cursor: pointer;
    transition: background-color 160ms ease, transform 160ms ease;
}

.featuredArrow:hover {
    background: color-mix(in srgb, var(--color-button-primary) 18%, transparent);
    transform: scale(1.05);
}

.featuredArrow:focus-visible {
    outline: 2px solid var(--color-main-brand-secondary);
    outline-offset: 3px;
}

.featuredArrow span {
    width: 22px;
    height: 22px;
    background: currentColor;
    mask: var(--featured-arrow) center / contain no-repeat;
    -webkit-mask: var(--featured-arrow) center / contain no-repeat;
}

.featuredTrack {
    display: grid;
    grid-auto-columns: clamp(340px, 43vw, 560px);
    grid-auto-flow: column;
    gap: var(--spacing-space-6);
    margin-inline: calc(-1 * max(var(--spacing-space-8), calc((100vw - var(--container-7xl)) / 2 + var(--spacing-space-8))));
    padding: var(--spacing-space-2) max(var(--spacing-space-8), calc((100vw - var(--container-7xl)) / 2 + var(--spacing-space-8))) var(--spacing-space-8);
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scroll-padding-inline: max(var(--spacing-space-8), calc((100vw - var(--container-7xl)) / 2 + var(--spacing-space-8)));
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
}

.featuredTrack::-webkit-scrollbar {
    display: none;
}

.featuredSlide {
    min-width: 0;
    scroll-snap-align: start;
}

@media (prefers-reduced-motion: reduce) {
    .slideDownIcon,
    .featuredArrow {
        transition: none;
        animation: none;
    }
}

.dots {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-2);
    padding: var(--spacing-space-3) var(--spacing-space-4);
}

.dot {
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    border: 0;
    border-radius: var(--radius-full);
    padding: 0;
    background-color: var(--color-text-disabled);
    cursor: pointer;
    transition: background-color 200ms ease, transform 200ms ease;
}

.dot:hover {
    transform: scale(1.25);
}

.dot:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

/* White in both themes (button-primary) so the active dot reads on the
   dark surface band. */
.dotActive {
    background-color: var(--color-button-primary);
}

.allProjectSection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    box-sizing: border-box;
    min-height: 790px;
    padding: var(--spacing-space-4) var(--spacing-space-8);
    gap: var(--spacing-space-4);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    scroll-margin-top: 73px; /* fixed navbar height */
    transition: background-color 300ms ease, color 300ms ease;
}

@media (max-width: 767px) {
    .projects {
        padding-top: 55px;
    }

    .hero {
        min-height: calc(100svh - 55px);
        text-align: center;
    }

    .heroTitle,
    .heroSubtitle {
        font-size: 32px;
    }

    .featuredSection {
        min-height: auto;
        padding: var(--spacing-space-10) var(--spacing-space-4);
    }

    .featuredHeader {
        align-items: flex-start;
    }

    .featuredTitle {
        font-size: 36px;
    }

    .featuredControls {
        display: none;
    }

    .featuredTrack {
        grid-auto-columns: min(82vw, 380px);
        gap: var(--spacing-space-4);
        margin-inline: calc(-1 * var(--spacing-space-4));
        padding-inline: var(--spacing-space-4);
        scroll-padding-inline: var(--spacing-space-4);
    }

    .allProjectSection {
        min-height: auto;
        padding: var(--spacing-space-8);
    }
}

.allProjectTitle {
    align-self: stretch;
    margin: 0;
    color: var(--color-text-primary);
}

.allProjectSubtitle {
    align-self: stretch;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--type-size-subtitle);
    font-weight: 300;
}

.githubActivitySection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    box-sizing: border-box;
    width: 100vw;
    margin-left: calc(50% - 50vw);
    min-height: 730px;
    padding: var(--spacing-space-4) var(--spacing-space-8);
    padding-inline: max(
        var(--spacing-space-8),
        calc((100vw - var(--container-7xl)) / 2 + var(--spacing-space-8))
    );
    gap: var(--spacing-space-8);
    overflow: hidden;
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: center;
}

.githubActivityTitle,
.githubActivitySubtitle {
    align-self: stretch;
    margin: 0;
}

.githubActivityTitle {
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.githubActivitySubtitle {
    font-size: var(--type-size-subtitle);
    font-weight: 300;
}

.yearPicker {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--spacing-space-4);
}

.yearOption {
    padding: var(--spacing-space-1) 0;
    border: 0;
    border-bottom: 1px solid transparent;
    background: transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    font-size: var(--type-size-caption);
    font-weight: 300;
    cursor: pointer;
    transition: border-color 160ms ease, color 160ms ease, font-weight 160ms ease;
}

.yearOption:hover,
.yearOptionActive {
    border-bottom-color: currentColor;
    color: var(--color-button-primary);
    font-weight: 600;
}

.yearOption:focus-visible {
    border-radius: var(--radius-base);
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.contributionScroller {
    width: 100%;
    padding: 44px 0;
    overflow-x: auto;
    scrollbar-width: thin;
}

.contributionCalendar {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: max-content;
    min-width: 100%;
    gap: 5px;
    font-size: 8px;
}

.calendarBody {
    display: grid;
    grid-template-columns: 10px auto;
    gap: 5px;
}

.monthSpacer {
    width: 10px;
    height: 12px;
}

.monthLabels {
    display: grid;
    grid-template-columns: repeat(var(--contribution-week-count, 53), 10px);
    gap: 5px;
    height: 12px;
    text-align: left;
}

.monthLabels span {
    width: 32px;
    overflow: visible;
    font-weight: 600;
    white-space: nowrap;
}

.weekdayLabels,
.contributionWeek {
    display: flex;
    flex-direction: column;
    width: 10px;
    gap: 5px;
}

.weekdayLabels span {
    height: 10px;
    font-weight: 600;
    line-height: 10px;
}

.contributionWeeks {
    display: flex;
    gap: 5px;
}

.contributionLegend {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: var(--spacing-space-4);
    gap: var(--spacing-space-2);
    font-size: var(--type-size-support);
    font-weight: 300;
}

.legendItem {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-space-1);
    white-space: nowrap;
}

.legendItem .contributionDay {
    display: inline-block;
}

.contributionDay {
    position: relative;
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    border: 1px solid var(--color-button-border);
    background-color: transparent;
}

.contributionDay::before,
.contributionDay::after {
    position: absolute;
    left: 50%;
    z-index: 5;
    opacity: 0;
    pointer-events: none;
    transition: opacity 140ms ease, transform 140ms ease;
}

.contributionDay::before {
    bottom: calc(100% + 8px);
    width: max-content;
    max-width: 220px;
    border: 1px solid var(--color-button-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-space-2) var(--spacing-space-3);
    background-color: var(--color-button-text-secondary);
    box-shadow: 0 6px 12px rgb(0 0 0 / 18%);
    color: var(--color-button-secondary);
    content: attr(data-tooltip);
    font-family: var(--font-sans);
    font-size: var(--type-size-support);
    font-style: normal;
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
    transform: translate(-50%, 4px);
}

.contributionDay::after {
    bottom: calc(100% + 3px);
    width: 8px;
    height: 8px;
    border-right: 1px solid var(--color-button-border);
    border-bottom: 1px solid var(--color-button-border);
    background-color: var(--color-button-text-secondary);
    content: "";
    transform: translate(-50%, 4px) rotate(45deg);
}

.contributionDay:hover::before,
.contributionDay:hover::after,
.contributionDay:focus-visible::before,
.contributionDay:focus-visible::after {
    opacity: 1;
}

.contributionDay:hover::before,
.contributionDay:focus-visible::before {
    transform: translate(-50%, 0);
}

.contributionDay:hover::after,
.contributionDay:focus-visible::after {
    transform: translate(-50%, 0) rotate(45deg);
}

.contributionDay:focus-visible {
    outline: 2px solid var(--color-button-primary);
    outline-offset: 2px;
}

.legendItem .contributionDay::before,
.legendItem .contributionDay::after {
    display: none;
}

.contributionDay[data-intensity="1"] {
    border-color: color-mix(in srgb, var(--color-main-brand-secondary) 48%, var(--color-button-border));
    background-color: color-mix(in srgb, var(--color-main-brand-secondary) 28%, transparent);
}

.contributionDay[data-intensity="2"] {
    border-color: color-mix(in srgb, var(--color-main-brand-secondary) 68%, var(--color-button-border));
    background-color: color-mix(in srgb, var(--color-main-brand-secondary) 50%, transparent);
}

.contributionDay[data-intensity="3"] {
    border-color: color-mix(in srgb, var(--color-main-brand-secondary) 84%, var(--color-button-border));
    background-color: color-mix(in srgb, var(--color-main-brand-secondary) 74%, transparent);
}

.contributionDay[data-intensity="4"] {
    border-color: var(--color-main-brand-secondary);
    background-color: var(--color-main-brand-secondary);
}

@media (max-width: 767px) {
    .githubActivitySection {
        min-height: 560px;
        padding: var(--spacing-space-8);
    }

    .contributionCalendar {
        justify-content: flex-start;
    }
}

</style>
