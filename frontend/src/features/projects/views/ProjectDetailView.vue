<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { AppFooter } from "@/shared/layout";
import { ActionButton, LanguageToggleButton, PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { StatusTag } from "@/shared/ui/tags";
import { DeleteModal, ProjectImage } from "@/features/projects/components";
import { backend, database, devops, frontend, language, externalService, getIconColorMode, icons, ThemeApp } from "@/config";
import type { ProjectLinkType, ProjectLocale } from "@/config";
import { useThemeStore, useUserStore } from "@/stores";
import { useProjectStore } from "@/features/projects/stores";

const route = useRoute();
const router = useRouter();
const locale = ref<ProjectLocale>("en");
const projectStore = useProjectStore();
const userStore = useUserStore();
const { isAdmin } = storeToRefs(userStore);
const isDeleting = ref(false);
const isDeleteModalOpen = ref(false);
const showScrollTop = ref(false);

/* Icon-only buttons on mobile must drop the label slot entirely —
   hiding the text with CSS leaves PrimaryButton's text padding/gap behind. */
const mobileQuery = typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)") : null;
const isMobile = ref(mobileQuery?.matches ?? false);

function handleMobileChange(event: MediaQueryListEvent): void {
    isMobile.value = event.matches;
}

const themeStore = useThemeStore();
const { selectedTheme } = storeToRefs(themeStore);
const currentThemeIcon = computed(() => (
    ThemeApp.find((theme) => theme.mode === selectedTheme.value)?.src ?? icons.modeSystem
));

function cycleTheme(): void {
    const index = ThemeApp.findIndex((theme) => theme.mode === selectedTheme.value);
    const next = ThemeApp[(index + 1) % ThemeApp.length]!;

    themeStore.setTheme(next.mode);
}

function handleWindowScroll(): void {
    showScrollTop.value = window.scrollY > 40;
}

function scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    mobileQuery?.addEventListener("change", handleMobileChange);
    handleWindowScroll();
});

onUnmounted(() => {
    window.removeEventListener("scroll", handleWindowScroll);
    mobileQuery?.removeEventListener("change", handleMobileChange);
});

const project = computed(() => (
    projectStore.projects.find((item) => String(item.id) === String(route.params.projectId))
));
const content = computed(() => project.value?.content[locale.value]);
const timeline = computed(() => project.value?.timeline);
const durationMonths = computed(() => {
    if (!timeline.value?.startDate) return 0;

    const start = parseTimelineMonth(timeline.value.startDate);
    const end = parseTimelineMonth(timeline.value.endDate) ?? new Date();

    if (!start) return 0;

    const months = ((end.getFullYear() - start.getFullYear()) * 12) + end.getMonth() - start.getMonth() + 1;

    return months > 0 ? months : 0;
});

interface TechStackItem {
    icon: string;
    label: string;
}

interface TechStackGroup {
    items: TechStackItem[];
    label: string;
}

const stackCatalog = {
    language,
    frontend,
    backend,
    database,
    externalService,
    devops,
} as const;

const projectLinkMeta: Record<ProjectLinkType, { icon: string; label: string }> = {
    github: {
        icon: icons.github,
        label: "GitHub",
    },
    youtube: {
        icon: icons.youtube,
        label: "YouTube",
    },
    certificate: {
        icon: icons.certificate,
        label: "Certificate",
    },
    figma: {
        icon: icons.stack.uxUi.figma,
        label: "Figma",
    },
    live: {
        icon: icons.demo,
        label: "Live Demo",
    },
    /* No dedicated website glyph exists in public/icons yet; demo.svg stands in. */
    website: {
        icon: icons.demo,
        label: "Website",
    },
};

function isOriginalColorIcon(icon: string): boolean {
    return getIconColorMode(icon) === "original";
}

function iconMaskStyle(icon: string): Record<string, string> {
    return { "--detail-icon-src": `url(${icon})` };
}

watch(
    () => route.params.projectId,
    (projectId) => {
        if (projectId) {
            void projectStore.fetchProject(projectId as string).catch(() => undefined);
        }
    },
    { immediate: true },
);

const techStackTotal = computed(() => {
    if (!project.value) return 0;

    const stack = project.value.techStack;

    return (
        stack.language.length +
        stack.frontend.length +
        stack.backend.length +
        stack.database.length +
        stack.externalService.length +
        stack.devops.length
    );
});

const overviewMetrics = computed(() => {
    if (!project.value || !content.value) {
        return [];
    }

    const metrics: { label: string; value: number }[] = [];

    if (durationMonths.value) {
        metrics.push({ label: durationMonths.value === 1 ? "Month" : "Months", value: durationMonths.value });
    }

    metrics.push({
        label: content.value.features.length === 1 ? "Feature" : "Features",
        value: content.value.features.length,
    });

    if (techStackTotal.value) {
        metrics.push({ label: "Technologies", value: techStackTotal.value });
    }

    return metrics;
});

function resolveStackItems(
    labels: readonly string[],
    catalog: readonly { icon?: string; label: string }[],
): TechStackItem[] {
    return labels.flatMap((label) => {
        const skill = catalog.find((item) => item.label === label);

        return skill?.icon ? [{ label, icon: skill.icon }] : [];
    });
}

const techStackGroups = computed<TechStackGroup[]>(() => {
    if (!project.value) {
        return [];
    }

    const groups = [
        { label: "Language", items: resolveStackItems(project.value.techStack.language, stackCatalog.language) },
        { label: "Frontend", items: resolveStackItems(project.value.techStack.frontend, stackCatalog.frontend) },
        { label: "Backend", items: resolveStackItems(project.value.techStack.backend, stackCatalog.backend) },
        { label: "Database", items: resolveStackItems(project.value.techStack.database, stackCatalog.database) },
        { label: "External Service", items: resolveStackItems(project.value.techStack.externalService, stackCatalog.externalService) },
        { label: "DevOps", items: resolveStackItems(project.value.techStack.devops, stackCatalog.devops) },
    ];

    return groups.filter((group) => group.items.length > 0);
});

function editProject(): void {
    if (!project.value) return;

    void router.push({
        name: "project-edit",
        params: { projectId: project.value.id },
    });
}

function parseTimelineMonth(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})$/.exec(value);

    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function formatTimelineMonth(value: string): string {
    const date = parseTimelineMonth(value);

    return date
        ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date)
        : value;
}

async function deleteProject(): Promise<void> {
    if (!project.value || isDeleting.value) return;

    isDeleting.value = true;

    try {
        await projectStore.deleteProject(project.value.id);
        isDeleteModalOpen.value = false;
        await router.push({ name: "projects" });
    } catch (cause) {
        window.alert(cause instanceof Error ? cause.message : "Unable to delete project.");
    } finally {
        isDeleting.value = false;
    }
}
</script>

<template>
    <main :class="$style.projectDetail">
            <div :class="[$style.scrollTop, showScrollTop ? $style.scrollTopVisible : '']">
            <ActionButton action="scroll-top" @click="scrollToTop" />
        </div>
        <article v-if="project && content" :class="$style.page">
            <section :class="$style.section" aria-label="Preview">
                <div :class="$style.previewHead">
                    <h2 v-if="project.gallery.length" :class="$style.sectionTitle">Preview</h2>
                    <span v-else aria-hidden="true" />
                    <div :class="$style.previewActions">
                        <LanguageToggleButton v-model="locale" />
                        <PrimaryButton
                            width-mode="hug"
                            :leading-icon="currentThemeIcon"
                            :aria-label="`Theme: ${selectedTheme.toLowerCase()} — switch theme`"
                            @click="cycleTheme"
                        />
                        <PrimaryButton
                            v-if="isMobile"
                            width-mode="hug"
                            :leading-icon="icons.arrowBack"
                            to="/projects"
                            aria-label="Back to projects"
                        />
                        <PrimaryButton
                            v-else
                            width-mode="hug"
                            :leading-icon="icons.arrowBack"
                            to="/projects"
                        >
                            Back to projects
                        </PrimaryButton>
                    </div>
                </div>
                <ProjectImage
                    v-if="project.gallery.length"
                    :images="project.gallery"
                    :project-name="content.projectName"
                />
            </section>

            <header :class="[$style.section, $style.projectHeader]" aria-label="Project overview">
                <div :class="$style.projectHeading">
                    <h1 :class="$style.projectName">{{ content.projectName }}</h1>
                    <p :class="$style.projectCategory">{{ project.category }}</p>
                </div>
                <div :class="$style.projectActions">
                    <div v-if="isAdmin" :class="$style.adminActions" aria-label="Project admin actions">
                        <ActionButton action="edit" aria-label="Edit project" @click="editProject" />
                        <ActionButton
                            action="delete"
                            aria-label="Delete project"
                            :disabled="isDeleting"
                            @click="isDeleteModalOpen = true"
                        />
                    </div>
                    <template v-for="link in project.links" :key="link.type">
                        <PrimaryButton
                            v-if="isMobile"
                            width-mode="hug"
                            :leading-icon="projectLinkMeta[link.type].icon"
                            :href="link.url"
                            :aria-label="projectLinkMeta[link.type].label"
                            target="_blank"
                            rel="noopener noreferrer"
                        />
                        <PrimaryButton
                            v-else
                            width-mode="hug"
                            :leading-icon="projectLinkMeta[link.type].icon"
                            :href="link.url"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {{ projectLinkMeta[link.type].label }}
                        </PrimaryButton>
                    </template>
                </div>
            </header>

            <section ref="glanceSection" :class="$style.section" aria-label="Project at a glance">
                <b :class="$style.glanceTitle">AT A GLANCE</b>
                <div :class="$style.glanceRow">
                    <div :class="$style.glanceCard">
                        <div :class="$style.glanceStatusRow">
                            <span :class="$style.glanceText">Status :</span>
                            <StatusTag :status="project.status" />
                        </div>
                        <div v-if="timeline && timeline.startDate" :class="$style.glanceDates">
                            <span :class="[$style.glanceIcon, $style.maskIcon]" :style="iconMaskStyle(icons.calendar)" aria-hidden="true" />
                            <span :class="$style.glanceText">{{ formatTimelineMonth(timeline.startDate) }}</span>
                            <template v-if="timeline.endDate">
                                <span :class="$style.glanceText" aria-hidden="true">→</span>
                                <span :class="$style.glanceText">{{ formatTimelineMonth(timeline.endDate) }}</span>
                            </template>
                        </div>
                    </div>
                    <div
                        v-for="metric in overviewMetrics"
                        :key="metric.label"
                        :class="[$style.glanceCard, $style.metricCard]"
                    >
                        <span :class="$style.metricValue">{{ metric.value }}</span>
                        <span :class="$style.metricLabel">{{ metric.label }}</span>
                    </div>
                </div>
                <div v-if="project.roles.length" :class="$style.roleRow">
                    <div :class="[$style.roleChip, $style.roleHead]">
                        <span :class="[$style.glanceIcon, $style.maskIcon]" :style="iconMaskStyle(icons.user)" aria-hidden="true" />
                        <span :class="$style.roleHeadLabel">My Role</span>
                    </div>
                    <div v-for="role in project.roles" :key="role" :class="$style.roleChip">
                        <span :class="$style.glanceText">{{ role }}</span>
                    </div>
                </div>
            </section>

            <section v-if="content.description" :class="$style.section" aria-label="Overview">
                <h2 :class="$style.sectionTitle">Overview</h2>
                <p :class="$style.overviewText">{{ content.description }}</p>
            </section>

            <section
                v-if="content.feasibility || content.targetUsers"
                :class="[$style.section, $style.noteSection]"
                aria-label="Feasibility and target users"
            >
                <template v-if="content.feasibility">
                    <div :class="$style.noteHead">
                        <span :class="[$style.glanceIcon, $style.maskIcon]" :style="iconMaskStyle(icons.dice)" aria-hidden="true" />
                        <b :class="$style.noteTitle">Feasibility</b>
                    </div>
                    <p :class="$style.noteText">{{ content.feasibility }}</p>
                </template>
                <template v-if="content.targetUsers">
                    <div :class="$style.noteHead">
                        <span :class="[$style.glanceIcon, $style.maskIcon]" :style="iconMaskStyle(icons.target)" aria-hidden="true" />
                        <b :class="$style.noteTitle">Target Users</b>
                    </div>
                    <p :class="$style.noteText">{{ content.targetUsers }}</p>
                </template>
            </section>

            <section v-if="project.architectureImage" :class="$style.section" aria-label="System architecture">
                <h2 :class="$style.architectureTitle">Architecture</h2>
                <img
                    :class="$style.architectureImage"
                    :src="project.architectureImage"
                    :alt="`${content.projectName} system architecture`"
                    draggable="false"
                >
            </section>

            <section v-if="techStackGroups.length" :class="$style.section" aria-label="Tech stack">
                <h2 :class="$style.sectionTitle">Stack</h2>
                <div v-for="group in techStackGroups" :key="group.label" :class="$style.stackGroup">
                    <span :class="$style.stackGroupLabel">{{ group.label }}</span>
                    <div :class="$style.stackChips">
                        <div
                            v-for="item in group.items"
                            :key="item.label"
                            :class="$style.stackChip"
                            :title="item.label"
                        >
                            <img
                                v-if="isOriginalColorIcon(item.icon)"
                                :class="$style.stackChipIcon"
                                :src="item.icon"
                                alt=""
                                aria-hidden="true"
                            >
                            <span
                                v-else
                                :class="[$style.stackChipIcon, $style.maskIcon]"
                                :style="iconMaskStyle(item.icon)"
                                aria-hidden="true"
                            />
                            <span :class="$style.stackChipLabel">{{ item.label }}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section v-if="content.features.length" :class="$style.section" aria-label="Features">
                <h2 :class="$style.sectionTitle">Features</h2>
                <div :class="$style.featureList">
                    <div
                        v-for="(feature, index) in content.features.slice(0, 8)"
                        :key="index"
                        :class="$style.featureRow"
                    >
                        <span :class="[$style.glanceIcon, $style.maskIcon]" :style="iconMaskStyle(icons.featureFlag)" aria-hidden="true" />
                        <span :class="$style.featureText">{{ feature }}</span>
                    </div>
                </div>
            </section>

            <section
                v-if="content.challenges.length || content.whatILearned.length"
                :class="$style.section"
                aria-label="Challenges and lessons"
            >
                <h2 :class="$style.sectionTitle">Challenges &amp; Lessons</h2>
                <div :class="$style.lessonRow">
                    <div v-if="content.challenges.length" :class="$style.lessonCard">
                        <b :class="$style.lessonCardTitle">Challenges</b>
                        <p
                            v-for="challenge in content.challenges"
                            :key="`${challenge.title}-${challenge.content}`"
                            :class="$style.lessonItem"
                        >
                            <strong v-if="challenge.title" :class="$style.lessonItemTitle">{{ challenge.title }}: </strong>{{ challenge.content }}
                        </p>
                    </div>
                    <div v-if="content.whatILearned.length" :class="$style.lessonCard">
                        <b :class="$style.lessonCardTitle">What I Learned</b>
                        <p
                            v-for="lesson in content.whatILearned.slice(0, 8)"
                            :key="`${lesson.title}-${lesson.content}`"
                            :class="$style.lessonItem"
                        >
                            <strong v-if="lesson.title" :class="$style.lessonItemTitle">{{ lesson.title }}: </strong>{{ lesson.content }}
                        </p>
                    </div>
                </div>
            </section>

            <DeleteModal
                v-if="isDeleteModalOpen"
                :reason="`Are you sure you want to delete ${content.projectName}?`"
                :disabled="isDeleting"
                @cancel="isDeleteModalOpen = false"
                @confirm="deleteProject"
            />
        </article>

        <section
            v-else-if="projectStore.isLoading"
            :class="$style.page"
            aria-label="Loading project details"
            aria-busy="true"
        >
            <div :class="$style.section">
                <div :class="[$style.skeletonBlock, $style.skeletonTitle]" />
                <div :class="[$style.skeletonBlock, $style.skeletonHero]" />
            </div>
            <div :class="$style.section">
                <div :class="[$style.skeletonBlock, $style.skeletonTitle]" />
                <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
                <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
                <div :class="[$style.skeletonBlock, $style.skeletonLineShort]" />
            </div>
        </section>

        <section v-else :class="[$style.page, $style.notFound]">
            <h1 :class="$style.sectionTitle">Project not found</h1>
            <SecondaryButton to="/projects">Back to projects</SecondaryButton>
        </section>

        <AppFooter />
    </main>
</template>

<style module>
.projectDetail {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    /* Transparent so the fixed BackgroundEffect shows through. */
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    transition: color 300ms ease;
}

.page {
    display: flex;
    flex: 1;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
}

.section {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    padding: 12px 16px;
    gap: 8px;
}

.sectionTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h2-section-title);
    font-weight: 600;
}

.scrollTop {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 60;
    opacity: 0;
    pointer-events: none;
    transform: translateY(16px);
    transition: opacity 300ms ease-in-out, transform 300ms ease-in-out;
}

.scrollTopVisible {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
}

.previewHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 8px 20px;
}

.previewActions {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Project header */

.projectHeader {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 20px;
}

.projectHeading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 500px;
    gap: 8px;
}

.projectName {
    margin: 0;
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.projectCategory {
    margin: 0;
    font-size: var(--type-size-subtitle);
    font-weight: 300;
}

.projectActions {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    max-width: 650px;
    gap: 8px;
}

.adminActions {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* At a glance */

.glanceTitle {
    color: var(--color-text-primary);
    font-size: var(--type-size-caption);
    font-weight: 800;
}

.glanceRow {
    display: flex;
    align-items: stretch;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 8px;
}

.glanceCard {
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    padding: 12px;
    gap: 12px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    transition: background-color 300ms ease, border-color 300ms ease;
}

.glanceStatusRow {
    display: flex;
    align-items: center;
    gap: 12px;
}

.glanceDates {
    display: flex;
    align-items: center;
    gap: 12px;
}

.glanceIcon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    object-fit: contain;
}

.glanceText {
    font-size: var(--type-size-body-small);
    font-weight: 300;
}

.maskIcon {
    display: inline-block;
    flex-shrink: 0;
    background-color: var(--color-text-primary);
    mask: var(--detail-icon-src) center / contain no-repeat;
    -webkit-mask: var(--detail-icon-src) center / contain no-repeat;
    transition: background-color 300ms ease;
}

.metricCard {
    align-items: center;
    width: 288px;
    max-width: 288px;
}

.metricValue {
    font-size: var(--type-size-h3-card-title);
    font-weight: 300;
}

.metricLabel {
    font-size: var(--type-size-body-small);
    font-weight: 300;
}

.roleRow {
    display: flex;
    align-items: stretch;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 8px;
}

.roleChip {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 12px;
    gap: 8px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    transition: background-color 300ms ease, border-color 300ms ease;
}

.roleHeadLabel {
    font-size: var(--type-size-body-small);
    font-weight: 600;
}

/* Overview + notes */

.overviewText {
    margin: 0;
    font-size: var(--type-size-body-main);
    font-weight: 300;
    white-space: pre-line;
    color: var(--color-text-secondary);
}

.noteSection {
    color: var(--color-text-secondary);
}

.noteHead {
    display: flex;
    align-items: center;
    align-self: stretch;
    gap: 8px;
}

.noteTitle {
    font-size: var(--type-size-caption);
    font-weight: 800;
    color: var(--color-text-primary);
}

.noteText {
    margin: 0;
    font-size: var(--type-size-body-small);
    font-weight: 300;
    white-space: pre-line;
}

/* Architecture */

.architectureTitle {
    margin: 0;
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.architectureImage {
    display: block;
    align-self: stretch;
    width: 100%;
    max-height: 681px;
    border-radius: var(--radius-xl);
    object-fit: cover;
}

/* Stack */

.stackGroup {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    gap: 8px;
}

.stackGroupLabel {
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-main);
    font-weight: 300;
}

.stackChips {
    display: flex;
    align-items: center;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 4px;
}

.stackChip {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    padding: 4px;
    gap: 4px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    transition: border-color 300ms ease;
}

.stackChipIcon {
    width: 24px;
    height: 24px;
    object-fit: contain;
}

.stackChipLabel {
    color: var(--color-text-primary);
    font-size: var(--type-size-overline);
    font-weight: 300;
}

/* Features */

.featureList {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-self: stretch;
    gap: 8px;
}

.featureRow {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    padding: 12px 16px;
    gap: 8px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    transition: background-color 300ms ease, border-color 300ms ease;
}

.featureText {
    flex: 1;
    font-size: var(--type-size-body-main);
    font-weight: 300;
    color: var(--color-text-secondary);
}

/* Challenges & lessons */

.lessonRow {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    align-self: stretch;
    gap: 12px;
}

.lessonCard {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 12px 16px;
    gap: 8px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    transition: background-color 300ms ease, border-color 300ms ease;
}

.lessonCardTitle {
    color: var(--color-text-primary);
    font-size: var(--type-size-body-small);
    font-weight: 600;
}

.lessonItem {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-main);
    font-weight: 300;
}

.lessonItemTitle {
    font-weight: 600;
}

/* Skeleton + not found */

.skeletonBlock {
    border-radius: var(--radius-xl);
    background:
        linear-gradient(
            262.31deg,
            var(--color-button-primary) 0%,
            var(--color-main-surface) 100%
        );
    background-size: 180% 100%;
    animation: detailSkeletonShimmer 1.4s ease-in-out infinite alternate;
}

.skeletonTitle {
    width: 180px;
    height: 34px;
}

.skeletonHero {
    align-self: stretch;
    height: 320px;
}

.skeletonLine {
    align-self: stretch;
    height: 20px;
    border-radius: var(--radius-base);
}

.skeletonLineShort {
    width: 60%;
    height: 20px;
    border-radius: var(--radius-base);
}

.notFound {
    align-items: center;
    justify-content: center;
    padding: 48px 16px;
    gap: 16px;
    text-align: center;
}

@keyframes detailSkeletonShimmer {
    from {
        background-position: 0% 50%;
    }

    to {
        background-position: 100% 50%;
    }
}

@media (max-width: 767px) {
    .featureList,
    .lessonRow {
        grid-template-columns: minmax(0, 1fr);
    }

    .metricCard {
        width: 115px;
    }
}
</style>
