<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { AppFooter } from "@/shared/layout";
import { ActionButton, HeaderSection, LanguageButton, PrimaryButton } from "@/shared/ui";
import { DeleteModal, ImageModal, ProjectImage } from "@/features/projects/components";
import { backend, database, devops, frontend, language, externalService } from "@/config";
import type { ProjectLinkType, ProjectLocale } from "@/config";
import { useUserStore } from "@/stores";
import { useProjectStore } from "@/features/projects/stores";

const route = useRoute();
const router = useRouter();
const locale = ref<ProjectLocale>("en");
const projectStore = useProjectStore();
const userStore = useUserStore();
const { isAdmin } = storeToRefs(userStore);
const isDeleting = ref(false);
const isDeleteModalOpen = ref(false);
const expandedImage = ref<{ alt: string; src: string } | null>(null);

const project = computed(() => (
    projectStore.projects.find((item) => String(item.id) === String(route.params.projectId))
));
const content = computed(() => project.value?.content[locale.value]);
const projectNumber = computed(() => String(project.value?.id ?? "").slice(0, 8).toUpperCase());
const timeline = computed(() => project.value?.timeline);
const hasTimeline = computed(() => Boolean(
    timeline.value?.startDate ||
    timeline.value?.endDate ||
    timeline.value?.milestones.length,
));
const timelineDuration = computed(() => {
    if (!timeline.value?.startDate) return "";

    const start = parseTimelineMonth(timeline.value.startDate);
    const end = parseTimelineMonth(timeline.value.endDate) ?? new Date();

    if (!start) return "";

    const months = ((end.getFullYear() - start.getFullYear()) * 12) + end.getMonth() - start.getMonth() + 1;

    if (months <= 0) return "";
    return months === 1 ? "1 month" : `${months} months`;
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
        icon: "/images/icons/stacks/tools/github.svg",
        label: "GITHUB",
    },
    youtube: {
        icon: "/images/icons/common/youtube.svg",
        label: "YOUTUBE",
    },
    certificate: {
        icon: "/images/icons/common/certificate.svg",
        label: "CERTIFICATE",
    },
    figma: {
        icon: "/images/icons/stacks/ux-ui/figma.svg",
        label: "FIGMA",
    },
};

watch(
    () => route.params.projectId,
    (projectId) => {
        if (projectId) {
            void projectStore.fetchProject(projectId as string).catch(() => undefined);
        }
    },
    { immediate: true },
);

const overviewMetrics = computed(() => {
    if (!project.value) {
        return [];
    }

    return [
        { label: "Core Roles", value: project.value.overview.coreRoles },
        { label: "Challenge Areas", value: project.value.overview.challengeAreas },
        { label: "Stack Group", value: project.value.overview.stackGroup },
    ];
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
        { label: "LANGUAGE", items: resolveStackItems(project.value.techStack.language, stackCatalog.language) },
        { label: "FRONTEND", items: resolveStackItems(project.value.techStack.frontend, stackCatalog.frontend) },
        { label: "BACKEND", items: resolveStackItems(project.value.techStack.backend, stackCatalog.backend) },
        { label: "DATABASE", items: resolveStackItems(project.value.techStack.database, stackCatalog.database) },
        { label: "EXTERNAL SERVICE", items: resolveStackItems(project.value.techStack.externalService, stackCatalog.externalService) },
        { label: "DEVOPS", items: resolveStackItems(project.value.techStack.devops, stackCatalog.devops) },
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

function openImageModal(src: string, alt: string): void {
    expandedImage.value = { alt, src };
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
    <main :class="$style.projectDetail" class="pt-22">
        <div v-if="project && content" :class="$style.pageContainer">
            <HeaderSection :title="`PROJECT #${projectNumber}`" />

            <nav :class="$style.detailNav" aria-label="Project detail navigation">
                <div :class="$style.breadcrumb" class="type-button-r">
                    <RouterLink to="/projects" :class="$style.breadcrumbLink" data-label="PROJECTS">
                        <span>PROJECTS</span>
                    </RouterLink>
                    <span :class="$style.breadcrumbSeparator" aria-hidden="true">&gt;</span>
                    <span>{{ project.category }}</span>
                    <span :class="$style.breadcrumbSeparator" aria-hidden="true">&gt;</span>
                    <span :class="$style.currentBreadcrumb">{{ content.projectName }}</span>
                </div>
                <div :class="$style.navActions">
                    <div v-if="isAdmin" :class="$style.adminActions" aria-label="Project admin actions">
                        <ActionButton variant="edit" aria-label="Edit project" @click="editProject" />
                        <ActionButton
                            variant="delete"
                            aria-label="Delete project"
                            :disabled="isDeleting"
                            @click="isDeleteModalOpen = true"
                        />
                    </div>
                    <LanguageButton v-model="locale" />
                </div>
            </nav>

            <ProjectImage :images="project.gallery" :project-name="content.projectName" />

            <section :class="$style.descriptionPanel">
                <h1 :class="$style.projectName" class="type-subtitle-sb">
                    {{ content.projectName }}
                </h1>
                <hr :class="$style.panelDivider">
                <p :class="$style.description" class="type-body-main-r">
                    {{ content.description }}
                </p>
            </section>

            <section :class="$style.desktopOverviewFeatures" aria-label="Project overview and features">
                <div :class="$style.combinedTabs">
                    <h2 :class="$style.panelTab" class="type-button-sb">OVERVIEW</h2>
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">FEATURES</h2>
                </div>
                <div :class="$style.overviewFeaturesBody">
                    <hr :class="$style.panelDivider">
                    <div :class="$style.overviewFeaturesColumns">
                        <div :class="$style.overviewColumn">
                            <div :class="$style.metricGrid">
                                <div v-for="metric in overviewMetrics" :key="metric.label" :class="$style.metricCard">
                                    <strong :class="$style.metricValue">{{ metric.value }}</strong>
                                    <span :class="$style.metricLabel" class="type-overline-sb">{{ metric.label }}</span>
                                </div>
                            </div>
                            <div v-if="project.roles.length" :class="$style.roleList">
                                <span v-for="role in project.roles" :key="role" :class="$style.roleChip" class="type-overline-r">
                                    {{ role }}
                                </span>
                            </div>
                            <section v-if="hasTimeline && timeline" :class="$style.timelinePanel" aria-label="Project timeline">
                                <div :class="$style.timelineHeader">
                                    <h3 class="type-caption-sb">PROJECT TIMELINE</h3>
                                    <span :class="$style.timelineStatus" class="type-overline-sb">{{ timeline.status }}</span>
                                </div>
                                <div :class="$style.timelineSummary" class="type-overline-r">
                                    <span v-if="timeline.startDate">{{ formatTimelineMonth(timeline.startDate) }}</span>
                                    <span v-if="timeline.startDate && timeline.endDate" aria-hidden="true">→</span>
                                    <span v-if="timeline.endDate">{{ formatTimelineMonth(timeline.endDate) }}</span>
                                    <strong v-if="timelineDuration">{{ timelineDuration }}</strong>
                                </div>
                                <ol v-if="timeline.milestones.length" :class="$style.timelineList">
                                    <li v-for="milestone in timeline.milestones" :key="`${milestone.date}-${milestone.title}`">
                                        <span :class="$style.timelineDot" aria-hidden="true" />
                                        <div>
                                            <time class="type-overline-sb">{{ formatTimelineMonth(milestone.date) }}</time>
                                            <h4 class="type-caption-sb">{{ milestone.title }}</h4>
                                            <p v-if="milestone.description" class="type-overline-r">{{ milestone.description }}</p>
                                        </div>
                                    </li>
                                </ol>
                            </section>
                            <div :class="$style.overviewNote">
                                <h3 :class="$style.noteTitle" class="type-caption-sb">
                                    <img src="/images/icons/sidebar/about.svg" alt="" aria-hidden="true">
                                    Target Users
                                </h3>
                                <p class="type-overline-r">{{ content.targetUsers }}</p>
                            </div>
                            <div :class="$style.overviewNote">
                                <h3 :class="$style.noteTitle" class="type-caption-sb">
                                    <img src="/images/icons/common/switch.svg" alt="" aria-hidden="true">
                                    Feasibility
                                </h3>
                                <p class="type-overline-r">{{ content.feasibility }}</p>
                            </div>
                        </div>
                        <ul :class="$style.featureGrid">
                            <li v-for="feature in content.features.slice(0, 8)" :key="feature" :class="$style.feature">
                                {{ feature }}
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <section :class="$style.mobileOverviewFeatures" aria-label="Project overview and features">
                <article :class="$style.tabPanel">
                    <h2 :class="$style.panelTab" class="type-button-sb">OVERVIEW</h2>
                    <div :class="$style.panelBody">
                        <hr :class="$style.panelDivider">
                        <div :class="$style.metricGrid">
                            <div v-for="metric in overviewMetrics" :key="metric.label" :class="$style.metricCard">
                                <strong :class="$style.metricValue">{{ metric.value }}</strong>
                                <span :class="$style.metricLabel" class="type-overline-sb">{{ metric.label }}</span>
                            </div>
                        </div>
                        <div v-if="project.roles.length" :class="$style.roleList">
                            <span v-for="role in project.roles" :key="role" :class="$style.roleChip" class="type-overline-r">
                                {{ role }}
                            </span>
                        </div>
                        <section v-if="hasTimeline && timeline" :class="$style.timelinePanel" aria-label="Project timeline">
                            <div :class="$style.timelineHeader">
                                <h3 class="type-caption-sb">PROJECT TIMELINE</h3>
                                <span :class="$style.timelineStatus" class="type-overline-sb">{{ timeline.status }}</span>
                            </div>
                            <div :class="$style.timelineSummary" class="type-overline-r">
                                <span v-if="timeline.startDate">{{ formatTimelineMonth(timeline.startDate) }}</span>
                                <span v-if="timeline.startDate && timeline.endDate" aria-hidden="true">→</span>
                                <span v-if="timeline.endDate">{{ formatTimelineMonth(timeline.endDate) }}</span>
                                <strong v-if="timelineDuration">{{ timelineDuration }}</strong>
                            </div>
                            <ol v-if="timeline.milestones.length" :class="$style.timelineList">
                                <li v-for="milestone in timeline.milestones" :key="`${milestone.date}-${milestone.title}`">
                                    <span :class="$style.timelineDot" aria-hidden="true" />
                                    <div>
                                        <time class="type-overline-sb">{{ formatTimelineMonth(milestone.date) }}</time>
                                        <h4 class="type-caption-sb">{{ milestone.title }}</h4>
                                        <p v-if="milestone.description" class="type-overline-r">{{ milestone.description }}</p>
                                    </div>
                                </li>
                            </ol>
                        </section>
                        <div :class="$style.overviewNote">
                            <h3 :class="$style.noteTitle" class="type-caption-sb">
                                <img src="/images/icons/sidebar/about.svg" alt="" aria-hidden="true">
                                Target Users
                            </h3>
                            <p class="type-overline-r">{{ content.targetUsers }}</p>
                        </div>
                        <div :class="$style.overviewNote">
                            <h3 :class="$style.noteTitle" class="type-caption-sb">
                                <img src="/images/icons/common/switch.svg" alt="" aria-hidden="true">
                                Feasibility
                            </h3>
                            <p class="type-overline-r">{{ content.feasibility }}</p>
                        </div>
                    </div>
                </article>

                <article :class="[$style.tabPanel, $style.featuresPanel]">
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">FEATURES</h2>
                    <div :class="$style.panelBody">
                        <hr :class="$style.panelDivider">
                        <ul :class="$style.featureGrid">
                            <li v-for="feature in content.features.slice(0, 8)" :key="feature" :class="$style.feature">
                                {{ feature }}
                            </li>
                        </ul>
                    </div>
                </article>
            </section>

            <section :class="$style.desktopArchitectureStack" aria-label="System architecture and tech stack">
                <div :class="$style.architectureTabs">
                    <h2 :class="$style.panelTab" class="type-button-sb">SYSTEM ARCHITECTURE</h2>
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">TECH STACK</h2>
                </div>
                <div :class="$style.architectureStackBody">
                    <hr :class="$style.panelDivider">
                    <div :class="$style.architectureColumns">
                        <button
                            v-if="project.architectureImage"
                            type="button"
                            :class="$style.architectureImageFrame"
                            aria-label="Open system architecture image"
                            @click="openImageModal(project.architectureImage, `${content.projectName} system architecture`)"
                        >
                            <img
                                :class="$style.architectureImage"
                                :src="project.architectureImage"
                                :alt="`${content.projectName} system architecture`"
                            >
                        </button>
                        <div
                            v-else
                            :class="[$style.architectureImageFrame, $style.architecturePlaceholder]"
                            role="img"
                            :aria-label="`${content.projectName} has no system architecture image`"
                        >
                            <img src="/images/icons/common/gallery.svg" alt="" aria-hidden="true">
                        </div>
                        <div :class="$style.techStackGroups">
                            <section v-for="group in techStackGroups" :key="group.label" :class="$style.techStackGroup">
                                <h3 class="type-caption-sb">{{ group.label }}</h3>
                                <div :class="$style.techStackIcons">
                                    <span
                                        v-for="item in group.items"
                                        :key="item.label"
                                        :class="$style.techStackIcon"
                                        tabindex="0"
                                    >
                                        <img :src="item.icon" :alt="item.label">
                                        <span :class="$style.techStackTooltip" role="tooltip">{{ item.label }}</span>
                                    </span>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </section>

            <section :class="$style.mobileArchitectureStack" aria-label="System architecture and tech stack">
                <article :class="$style.tabPanel">
                    <h2 :class="$style.panelTab" class="type-button-sb">SYSTEM ARCHITECTURE</h2>
                    <div :class="[$style.panelBody, $style.mobileArchitectureBody]">
                        <hr :class="$style.panelDivider">
                        <button
                            v-if="project.architectureImage"
                            type="button"
                            :class="$style.mobileArchitectureImageButton"
                            aria-label="Open system architecture image"
                            @click="openImageModal(project.architectureImage, `${content.projectName} system architecture`)"
                        >
                            <img
                                :class="$style.architectureImage"
                                :src="project.architectureImage"
                                :alt="`${content.projectName} system architecture`"
                            >
                        </button>
                        <div
                            v-else
                            :class="[$style.architectureImage, $style.architecturePlaceholder]"
                            role="img"
                            :aria-label="`${content.projectName} has no system architecture image`"
                        >
                            <img src="/images/icons/common/gallery.svg" alt="" aria-hidden="true">
                        </div>
                    </div>
                </article>

                <article :class="[$style.tabPanel, $style.techStackPanel]">
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">TECH STACK</h2>
                    <div :class="[$style.panelBody, $style.mobileTechStackBody]">
                        <hr :class="$style.panelDivider">
                        <div :class="$style.techStackGroups">
                            <section v-for="group in techStackGroups" :key="group.label" :class="$style.techStackGroup">
                                <h3 class="type-caption-sb">{{ group.label }}</h3>
                                <div :class="$style.techStackIcons">
                                    <span
                                        v-for="item in group.items"
                                        :key="item.label"
                                        :class="$style.techStackIcon"
                                        tabindex="0"
                                    >
                                        <img :src="item.icon" :alt="item.label">
                                        <span :class="$style.techStackTooltip" role="tooltip">{{ item.label }}</span>
                                    </span>
                                </div>
                            </section>
                        </div>
                    </div>
                </article>
            </section>

            <section :class="$style.desktopChallengesLearned" aria-label="Project challenges and lessons learned">
                <div :class="$style.combinedTabs">
                    <h2 :class="$style.panelTab" class="type-button-sb">CHALLENGES</h2>
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">WHAT I LEARNED</h2>
                </div>
                <div :class="$style.challengesLearnedBody">
                    <hr :class="$style.panelDivider">
                    <div :class="$style.challengesLearnedColumns">
                        <div :class="$style.structuredList">
                            <article v-for="challenge in content.challenges" :key="`${challenge.title}-${challenge.content}`">
                                <h3 v-if="challenge.title" class="type-caption-sb">{{ challenge.title }}</h3>
                                <p class="type-body-main-r">{{ challenge.content }}</p>
                            </article>
                        </div>
                        <ul :class="$style.learnedList" class="type-body-main-r">
                            <li v-for="lesson in content.whatILearned.slice(0, 8)" :key="`${lesson.title}-${lesson.content}`">
                                <strong v-if="lesson.title">{{ lesson.title }}: </strong>{{ lesson.content }}
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <section :class="$style.mobileChallengesLearned" aria-label="Project challenges and lessons learned">
                <article :class="$style.tabPanel">
                    <h2 :class="$style.panelTab" class="type-button-sb">CHALLENGES</h2>
                    <div :class="$style.panelBody">
                        <hr :class="$style.panelDivider">
                        <div :class="$style.structuredList">
                            <article v-for="challenge in content.challenges" :key="`${challenge.title}-${challenge.content}`">
                                <h3 v-if="challenge.title" class="type-caption-sb">{{ challenge.title }}</h3>
                                <p class="type-body-main-r">{{ challenge.content }}</p>
                            </article>
                        </div>
                    </div>
                </article>

                <article :class="$style.tabPanel">
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">WHAT I LEARNED</h2>
                    <div :class="[$style.panelBody, $style.mobileLearnedBody]">
                        <hr :class="$style.panelDivider">
                        <ul :class="$style.learnedList" class="type-body-main-r">
                            <li v-for="lesson in content.whatILearned.slice(0, 8)" :key="`${lesson.title}-${lesson.content}`">
                                <strong v-if="lesson.title">{{ lesson.title }}: </strong>{{ lesson.content }}
                            </li>
                        </ul>
                    </div>
                </article>
            </section>

            <section v-if="project.links.length" :class="$style.linkPanel" aria-label="Project links">
                <h2 :class="$style.panelTab" class="type-button-sb">LINK</h2>
                <div :class="$style.linkBody">
                    <hr :class="$style.panelDivider">
                    <div :class="$style.linkButtons">
                        <PrimaryButton
                            v-for="link in project.links"
                            :key="link.type"
                            :href="link.url"
                            :icon="projectLinkMeta[link.type].icon"
                        >
                            {{ projectLinkMeta[link.type].label }}
                        </PrimaryButton>
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
            <ImageModal
                v-if="expandedImage"
                :src="expandedImage.src"
                :alt="expandedImage.alt"
                @close="expandedImage = null"
            />
        </div>

        <section
            v-else-if="projectStore.isLoading"
            :class="[$style.pageContainer, $style.skeletonPage]"
            aria-label="Loading project details"
            aria-busy="true"
        >
            <div :class="[$style.skeletonBlock, $style.skeletonHeader]" />

            <div :class="$style.skeletonNav">
                <div :class="[$style.skeletonBlock, $style.skeletonBreadcrumb]" />
                <div :class="[$style.skeletonBlock, $style.skeletonLanguage]" />
            </div>

            <div :class="[$style.skeletonBlock, $style.skeletonGallery]" />

            <section :class="$style.skeletonPanel">
                <div :class="[$style.skeletonBlock, $style.skeletonTitle]" />
                <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
                <div :class="[$style.skeletonBlock, $style.skeletonLine, $style.skeletonLineShort]" />
            </section>

            <section :class="$style.skeletonSplitPanel">
                <div :class="$style.skeletonColumn">
                    <div :class="[$style.skeletonBlock, $style.skeletonSectionTitle]" />
                    <div :class="$style.skeletonMetricGrid">
                        <div v-for="index in 3" :key="`metric-${index}`" :class="[$style.skeletonBlock, $style.skeletonMetric]" />
                    </div>
                    <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
                    <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
                </div>
                <div :class="$style.skeletonColumn">
                    <div :class="[$style.skeletonBlock, $style.skeletonSectionTitle]" />
                    <div :class="$style.skeletonFeatureGrid">
                        <div v-for="index in 6" :key="`feature-${index}`" :class="[$style.skeletonBlock, $style.skeletonFeature]" />
                    </div>
                </div>
            </section>

            <section :class="$style.skeletonSplitPanel">
                <div :class="$style.skeletonColumn">
                    <div :class="[$style.skeletonBlock, $style.skeletonSectionTitle]" />
                    <div :class="[$style.skeletonBlock, $style.skeletonArchitecture]" />
                </div>
                <div :class="$style.skeletonColumn">
                    <div :class="[$style.skeletonBlock, $style.skeletonSectionTitle]" />
                    <div v-for="index in 4" :key="`stack-${index}`" :class="[$style.skeletonBlock, $style.skeletonStack]" />
                </div>
            </section>
        </section>

        <section v-else :class="$style.notFound">
            <HeaderSection title="PROJECT NOT FOUND" />
            <RouterLink to="/projects" class="type-button-sb text-main-primary">
                Back to projects
            </RouterLink>
        </section>

        <AppFooter />
    </main>
</template>

<style module>
.projectDetail {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    min-height: 100dvh;
    gap: var(--spacing-space-16);
    overflow-y: auto;
    scrollbar-width: none;
}

.projectDetail::-webkit-scrollbar {
    display: none;
}

.pageContainer,
.notFound {
    display: flex;
    flex: 1;
    flex-direction: column;
    width: min(calc(100% - (var(--spacing-space-16) * 2)), 1133px);
    margin: 0 auto;
    gap: var(--spacing-space-6);
}

.skeletonPage {
    pointer-events: none;
}

.skeletonBlock {
    overflow: hidden;
    border-radius: var(--radius-lg);
    background: linear-gradient(
        100deg,
        var(--color-main-surface) 20%,
        var(--color-main-secondary) 45%,
        var(--color-main-surface) 70%
    );
    background-size: 240% 100%;
    animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

.skeletonHeader {
    width: 214px;
    height: 42px;
}

.skeletonNav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 71px;
    padding: 10px;
    gap: var(--spacing-space-5);
}

.skeletonBreadcrumb {
    width: min(360px, 70%);
    height: 35px;
}

.skeletonLanguage {
    width: 84px;
    height: 34px;
    border-radius: var(--radius-xl);
}

.skeletonGallery {
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: var(--radius-2xl);
}

.skeletonPanel,
.skeletonSplitPanel {
    display: flex;
    box-sizing: border-box;
    padding: var(--spacing-space-4);
    gap: 10px;
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
}

.skeletonPanel,
.skeletonColumn {
    flex-direction: column;
}

.skeletonSplitPanel {
    gap: var(--spacing-space-8);
}

.skeletonColumn {
    display: flex;
    flex: 1;
    min-width: 0;
    gap: 10px;
}

.skeletonTitle {
    width: min(280px, 60%);
    height: 24px;
}

.skeletonSectionTitle {
    width: 132px;
    height: 20px;
}

.skeletonLine {
    width: 100%;
    height: 16px;
}

.skeletonLineShort {
    width: 72%;
}

.skeletonMetricGrid,
.skeletonFeatureGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.skeletonFeatureGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.skeletonMetric {
    height: 106px;
    border-radius: var(--radius-xl);
}

.skeletonFeature,
.skeletonStack {
    height: 48px;
    border-radius: var(--radius-xl);
}

.skeletonArchitecture {
    width: 100%;
    aspect-ratio: 1980 / 1080;
    border-radius: var(--radius-2xl);
}

.skeletonStack {
    border-radius: var(--radius-full);
}

@keyframes skeleton-shimmer {
    from {
        background-position: 100% 0;
    }

    to {
        background-position: -100% 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .skeletonBlock {
        animation: none;
    }
}

.detailNav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 71px;
    padding: 10px;
    gap: var(--spacing-space-5);
}

.breadcrumb {
    display: flex;
    flex: 1;
    align-items: center;
    max-width: max-content;
    min-width: 0;
    min-height: 35px;
    padding: 8px 10px;
    gap: 10px;
    overflow: hidden;
    border-radius: var(--radius-lg);
    background-color: var(--color-main-secondary);
    color: var(--color-button-secondary-btn-text);
    white-space: nowrap;
}

.navActions,
.adminActions {
    display: flex;
    align-items: center;
}

.navActions {
    flex-shrink: 0;
    gap: var(--spacing-space-4);
}

.adminActions {
    gap: 10px;
}

.breadcrumbLink {
    display: inline-grid;
    color: inherit;
    text-decoration: none;
}

.breadcrumbLink::after,
.breadcrumbLink span {
    grid-area: 1 / 1;
}

.breadcrumbLink::after {
    visibility: hidden;
    font-weight: 600;
    content: attr(data-label);
}

.breadcrumbLink:hover,
.breadcrumbLink:focus-visible {
    color: var(--color-text-secondary);
    font-weight: 600;
}

.breadcrumbSeparator {
    color: var(--color-main-surface);
}

.currentBreadcrumb {
    overflow: hidden;
    text-overflow: ellipsis;
}

.descriptionPanel,
.panelBody {
    box-sizing: border-box;
    padding: var(--spacing-space-4);
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.descriptionPanel {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.projectName,
.description,
.overviewNote p {
    margin: 0;
}

.panelDivider {
    width: 100%;
    height: 1px;
    margin: 0;
    border: 0;
    border-top: 1px solid var(--color-main-divider);
}

.desktopOverviewFeatures {
    display: flex;
    flex-direction: column;
}

.mobileOverviewFeatures {
    display: none;
}

.combinedTabs {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
}

.overviewFeaturesBody {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-height: 395px;
    padding: var(--spacing-space-4);
    gap: 10px;
    border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.overviewFeaturesColumns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1;
    min-height: 0;
    gap: var(--spacing-space-8);
}

.overviewColumn {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.roleList {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.roleChip {
    padding: 6px 10px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
}

.timelinePanel {
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 8px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
}

.timelineHeader,
.timelineSummary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.timelineHeader h3,
.timelineList,
.timelineList h4,
.timelineList p {
    margin: 0;
}

.timelineStatus {
    padding: 4px 8px;
    border-radius: var(--radius-full);
    background-color: var(--color-main-primary);
    color: var(--color-button-primary-btn-text-active);
}

.timelineSummary strong {
    margin-left: auto;
    color: var(--color-main-primary);
}

.timelineList {
    display: flex;
    flex-direction: column;
    padding: 2px 0 0 16px;
    gap: 10px;
    list-style: none;
}

.timelineList li {
    position: relative;
    padding-left: 14px;
}

.timelineList li:not(:last-child)::before {
    position: absolute;
    top: 10px;
    bottom: -12px;
    left: -1px;
    width: 1px;
    background-color: var(--color-main-primary);
    content: "";
}

.timelineDot {
    position: absolute;
    top: 5px;
    left: -5px;
    width: 9px;
    height: 9px;
    border-radius: var(--radius-full);
    background-color: var(--color-main-primary);
}

.timelineList time {
    color: var(--color-main-primary);
}

.desktopArchitectureStack {
    display: flex;
    flex-direction: column;
}

.mobileArchitectureStack {
    display: none;
}

.desktopChallengesLearned {
    display: flex;
    flex-direction: column;
}

.mobileChallengesLearned {
    display: none;
}

.linkPanel {
    display: flex;
    flex-direction: column;
}

.linkBody {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-4);
    gap: 10px;
    border-radius: 0 var(--radius-2xl) var(--radius-2xl) var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.linkButtons {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
}

.architectureTabs {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
}

.architectureStackBody {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-height: 0;
    padding: var(--spacing-space-4);
    gap: 10px;
    border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.architectureColumns {
    display: grid;
    grid-template-columns: minmax(0, 1.85fr) minmax(300px, 1fr);
    flex: 1;
    min-height: 0;
    gap: var(--spacing-space-8);
}

.challengesLearnedBody {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-height: 261px;
    padding: var(--spacing-space-4);
    gap: 10px;
    border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.challengesLearnedColumns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1;
    gap: var(--spacing-space-8);
}

.challengesLearnedColumns p,
.mobileChallengesLearned p {
    margin: 0;
}

.structuredList {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.structuredList article,
.structuredList h3,
.structuredList p {
    margin: 0;
}

.learnedList {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding-left: 27px;
    gap: 4px;
    list-style-position: outside;
    list-style-type: disc;
}

.learnedList li {
    display: list-item;
}

.learnedList li::marker {
    color: var(--color-text-secondary);
}

.tabPanel {
    display: flex;
    flex-direction: column;
}

.panelTab {
    align-self: flex-start;
    margin: 0;
    padding: 8px 10px;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.rightTab {
    align-self: flex-end;
}

.panelBody {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 339px;
    gap: 10px;
    border-top-left-radius: 0;
}

.featuresPanel .panelBody {
    border-top-left-radius: var(--radius-2xl);
    border-top-right-radius: 0;
}

.mobileTechStackBody {
    border-top-left-radius: var(--radius-2xl);
    border-top-right-radius: 0;
}

.architectureImage {
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: contain;
}

.architecturePlaceholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-main-surface);
}

.architecturePlaceholder img {
    width: var(--spacing-space-16);
    height: var(--spacing-space-16);
}

.architectureImageFrame {
    align-self: start;
    min-width: 0;
    min-height: 0;
    aspect-ratio: 1980 / 1080;
    overflow: hidden;
    border-radius: var(--radius-2xl);
}

button.architectureImageFrame,
.mobileArchitectureImageButton {
    padding: 0;
    border: 0;
    background-color: transparent;
    cursor: zoom-in;
}

button.architectureImageFrame:focus-visible,
.mobileArchitectureImageButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.mobileArchitectureImageButton {
    display: block;
    width: 100%;
    aspect-ratio: 1980 / 1080;
    overflow: hidden;
    border-radius: var(--radius-2xl);
}

.techStackGroups {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: var(--spacing-space-5);
}

.techStackGroup {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.techStackGroup h3 {
    margin: 0;
}

.techStackIcons {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: 10px;
    gap: 10px;
    overflow: visible;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
    background-color: var(--color-main-surface);
}

.techStackIcon {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: var(--radius-base);
}

.techStackIcon:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.techStackIcon img {
    width: 24px;
    height: 24px;
    object-fit: contain;
}

.techStackTooltip {
    position: absolute;
    z-index: 2;
    bottom: calc(100% + 10px);
    left: 50%;
    padding: 5px 8px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
    font-size: 0.75rem;
    font-weight: 300;
    line-height: 1;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, 4px);
    transition: opacity 120ms ease, transform 120ms ease;
}

.techStackTooltip::after {
    position: absolute;
    top: 100%;
    left: 50%;
    width: 8px;
    height: 8px;
    border-right: 1px solid var(--color-main-divider);
    border-bottom: 1px solid var(--color-main-divider);
    background-color: var(--color-main-surface);
    content: "";
    transform: translate(-50%, -4px) rotate(45deg);
}

.techStackIcon:hover .techStackTooltip,
.techStackIcon:focus-visible .techStackTooltip {
    opacity: 1;
    transform: translate(-50%, 0);
}

.metricGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.metricCard {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 106px;
    padding: 8px;
    border: 1px solid var(--color-main-secondary);
    border-radius: var(--radius-xl);
    background: var(--gradient-card-highlight);
    text-align: center;
}

.metricValue {
    font-size: 2.25rem;
    line-height: 1.2;
}

.metricLabel {
    color: var(--color-text-secondary);
}

.overviewNote {
    padding: 8px;
    border: 1px solid var(--color-main-secondary);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-secondary);
}

.noteTitle {
    display: flex;
    align-items: center;
    margin: 0;
    gap: 6px;
}

.noteTitle img {
    width: 24px;
    height: 24px;
}

.featureGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    gap: var(--spacing-space-5) 10px;
    list-style: none;
}

.feature {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    min-height: 48px;
    padding: 12px 16px;
    overflow: hidden;
    border: 1px solid var(--color-input-border-disabled);
    border-radius: var(--radius-xl);
    background-color: var(--color-input-bg-disabled);
    color: var(--color-text-input);
    font-size: 1.125rem;
    font-weight: 300;
    text-overflow: ellipsis;
}

@media (max-width: 767px) {
    .projectDetail {
        gap: var(--spacing-space-8);
    }

    .pageContainer,
    .notFound {
        width: min(calc(100% - (var(--spacing-space-4) * 2)), 408px);
    }

    .detailNav {
        flex-direction: column;
        justify-content: center;
        min-height: auto;
        padding-inline: 0;
        gap: 10px;
    }

    .skeletonNav {
        min-height: auto;
        padding-inline: 0;
    }

    .skeletonBreadcrumb {
        width: 64%;
    }

    .skeletonSplitPanel {
        flex-direction: column;
        gap: var(--spacing-space-6);
    }

    .skeletonFeatureGrid {
        grid-template-columns: 1fr;
    }

    .breadcrumb {
        max-width: 100%;
        font-size: 0.875rem;
    }

    .desktopOverviewFeatures {
        display: none;
    }

    .mobileOverviewFeatures {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-space-6);
    }

    .desktopArchitectureStack {
        display: none;
    }

    .mobileArchitectureStack {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-space-6);
    }

    .desktopChallengesLearned {
        display: none;
    }

    .mobileChallengesLearned {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-space-6);
    }

    .mobileLearnedBody {
        border-top-left-radius: var(--radius-2xl);
        border-top-right-radius: 0;
    }

    .architectureImage {
        height: auto;
        flex: none;
        aspect-ratio: 1980 / 1080;
    }

    .panelBody {
        min-height: auto;
    }

    .metricCard {
        min-height: 104px;
    }

    .featureGrid {
        grid-template-columns: 1fr;
    }
}
</style>
