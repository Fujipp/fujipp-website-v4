<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
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

/* Rotating showcase: every card is the same size; side cards are scaled
   down. Clicking a side card (anywhere except its buttons) rotates it into
   the center where it grows to full size. */
const centerSlide = ref(0);
const dragOffset = ref(0);
const dragStartX = ref<number | null>(null);
const draggedPointerId = ref<number | null>(null);
const didDrag = ref(false);
const DRAG_THRESHOLD = 56;
let dragFrame: number | null = null;
let pendingDragOffset = 0;

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

watch(slideCount, () => {
    /* The first ranked project (Top 1) always starts in the center. */
    centerSlide.value = 0;
}, { immediate: true });

/* Signed distance from the center position; with 3 slides it wraps so the
   rotation always takes the short way around. */
function slideOffset(index: number): number {
    const count = slideCount.value;
    let offset = index - centerSlide.value;

    if (count === 3) {
        if (offset > 1) offset -= 3;
        if (offset < -1) offset += 3;
    }

    return offset;
}

function onSlideClick(index: number, event: MouseEvent): void {
    if (didDrag.value) return;
    if ((event.target as HTMLElement).closest("a, button")) return;

    if (slideOffset(index) !== 0) {
        centerSlide.value = index;
    }
}

function onDragStart(event: PointerEvent): void {
    if (slideCount.value < 2 || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("a, button")) return;

    dragStartX.value = event.clientX;
    draggedPointerId.value = event.pointerId;
    dragOffset.value = 0;
    pendingDragOffset = 0;
    didDrag.value = false;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function onDragMove(event: PointerEvent): void {
    if (dragStartX.value === null || draggedPointerId.value !== event.pointerId) return;

    const coalescedEvents = event.getCoalescedEvents?.() ?? [event];
    const latestEvent = coalescedEvents[coalescedEvents.length - 1] ?? event;
    pendingDragOffset = (latestEvent.clientX - dragStartX.value) * 0.9;
    if (Math.abs(pendingDragOffset) > 6) didDrag.value = true;

    if (dragFrame !== null) return;
    dragFrame = requestAnimationFrame(() => {
        dragOffset.value = pendingDragOffset;
        dragFrame = null;
    });
}

function onDragEnd(event: PointerEvent): void {
    if (dragStartX.value === null || draggedPointerId.value !== event.pointerId) return;

    if (dragFrame !== null) {
        cancelAnimationFrame(dragFrame);
        dragFrame = null;
    }
    dragOffset.value = pendingDragOffset;

    const direction = pendingDragOffset < 0 ? 1 : -1;
    if (Math.abs(pendingDragOffset) >= DRAG_THRESHOLD) {
        centerSlide.value = (centerSlide.value + direction + slideCount.value) % slideCount.value;
    }

    dragStartX.value = null;
    draggedPointerId.value = null;
    dragOffset.value = 0;
    pendingDragOffset = 0;
}

onUnmounted(() => {
    if (dragFrame !== null) cancelAnimationFrame(dragFrame);
});

function preventClickAfterDrag(event: MouseEvent): void {
    if (!didDrag.value) return;

    event.preventDefault();
    event.stopPropagation();
    didDrag.value = false;
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
    <main :class="$style.projects" class="pt-16">
            <div :class="$style.projectsContainer">
            <section :class="$style.hero" aria-labelledby="projects-hero-title">
                <h1 id="projects-hero-title" :class="$style.heroTitle">Featured</h1>
                <p :class="$style.heroSubtitle">Top 3 Projects</p>
                <PrimaryButton
                    width-mode="hug"
                    :leading-icon="icons.directionDown"
                    @click="scrollToNextSection"
                >
                    Slide down
                </PrimaryButton>
            </section>

            <section
                v-if="shouldShowFeaturedSection"
                ref="featuredSectionRef"
                :class="$style.featuredSection"
                aria-label="Featured projects"
            >
                <div
                    :class="[$style.stage, dragStartX !== null ? $style.stageDragging : '']"
                    :style="{ '--drag-x': `${dragOffset}px` }"
                    @pointerdown="onDragStart"
                    @pointermove="onDragMove"
                    @pointerup="onDragEnd"
                    @pointercancel="onDragEnd"
                    @click.capture="preventClickAfterDrag"
                >
                    <div
                        v-for="(slide, index) in showcaseSlides"
                        :key="slide.key"
                        :class="[
                            $style.slide,
                            slideOffset(index) === 0 ? $style.slideCenter : $style.slideSide,
                        ]"
                        :style="{ '--slide-x': String(slideOffset(index)) }"
                        @click="onSlideClick(index, $event)"
                    >
                        <FeaturedProjectCard
                            v-if="slide.kind === 'skeleton'"
                            mode="skeleton"
                            project-name="Loading featured project"
                            size="large"
                        />
                        <FeaturedProjectCard
                            v-else-if="slide.kind === 'project'"
                            :category="slide.project.category"
                            :description-short="slide.project.content.en.descriptionShort"
                            :image-loading="slideOffset(index) === 0 ? 'eager' : 'lazy'"
                            :project-name="slide.project.content.en.projectName"
                            size="large"
                            :stack-groups="slide.project.stackGroups"
                            :tech-stack="slide.project.techStack"
                            :thumbnail-src="slide.project.gallery[0] ?? ''"
                            :to="{ name: 'project-detail', params: { projectId: slide.project.id } }"
                            :view-label="`View top ${slide.slot + 1}`"
                        />
                    </div>
                </div>
                <div v-if="slideCount > 1" :class="$style.dots">
                    <button
                        v-for="index in slideCount"
                        :key="`featured-dot-${index}`"
                        type="button"
                        :class="[$style.dot, centerSlide === index - 1 ? $style.dotActive : '']"
                        :aria-label="`Show featured card ${index} in the center`"
                        @click="centerSlide = index - 1"
                    />
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
    min-height: 100dvh;
    /* Transparent so the fixed BackgroundEffect shows through. */
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
    min-height: 630px;
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

.featuredSection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    box-sizing: border-box;
    width: 100vw;
    margin-left: calc(50% - 50vw);
    min-height: 730px;
    gap: var(--spacing-space-8);
    padding: var(--spacing-space-4) var(--spacing-space-8);
    padding-inline: max(
        var(--spacing-space-8),
        calc((100vw - var(--container-7xl)) / 2 + var(--spacing-space-8))
    );
    background-color: var(--color-main-surface);
    scroll-margin-top: 73px; /* fixed navbar height */
}

/* Rotating showcase: all cards share one full size and sit stacked in the
   stage center; --slide-x fans them out sideways while side cards scale
   down (294/352 = 0.835, the Figma side-card size). Clicking a side card
   rotates it into the center. */
.stage {
    --carousel-shift: 387px; /* 352/2 + 64px gap + 294/2 */

    position: relative;
    align-self: stretch;
    height: 520px;
    overflow: hidden;
    cursor: grab;
    touch-action: pan-y;
    user-select: none;
}

.stageDragging {
    cursor: grabbing;
}

.slide {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 1;
    backface-visibility: hidden;
    transform:
        translate3d(-50%, -50%, 0)
        translate3d(var(--drag-x, 0px), 0, 0)
        translate3d(calc(var(--slide-x, 0) * var(--carousel-shift)), 0, 0)
        scale(var(--slide-scale, 1));
    transition: transform 380ms cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
}

.stageDragging .slide {
    transition: none;
}

.slideCenter {
    --slide-scale: 1;

    z-index: 2;
}

.slideSide {
    --slide-scale: 0.835;

    cursor: pointer;
}

.slideSide:hover {
    --slide-scale: 0.87;
}

@media (prefers-reduced-motion: reduce) {
    .slide {
        transition: none;
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
    .hero {
        text-align: center;
    }

    .heroTitle,
    .heroSubtitle {
        font-size: 32px;
    }

    .featuredSection {
        padding: var(--spacing-space-4);
    }

    /* Side cards peek in from the edges; tapping one rotates it to center. */
    .stage {
        --carousel-shift: min(387px, 72vw);
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
    border-color: color-mix(in srgb, var(--color-status-success) 48%, var(--color-button-border));
    background-color: color-mix(in srgb, var(--color-status-success) 28%, transparent);
}

.contributionDay[data-intensity="2"] {
    border-color: color-mix(in srgb, var(--color-status-success) 68%, var(--color-button-border));
    background-color: color-mix(in srgb, var(--color-status-success) 50%, transparent);
}

.contributionDay[data-intensity="3"] {
    border-color: color-mix(in srgb, var(--color-status-success) 84%, var(--color-button-border));
    background-color: color-mix(in srgb, var(--color-status-success) 74%, transparent);
}

.contributionDay[data-intensity="4"] {
    border-color: var(--color-status-success);
    background-color: var(--color-status-success);
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
