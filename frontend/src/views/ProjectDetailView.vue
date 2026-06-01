<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { AppFooter, HeaderSection, LanguageButton, PrimaryButton, ProjectImage } from "@/components";
import { backend, database, devops, frontend, getProjectById, language } from "@/config";
import type { ProjectLinkType, ProjectLocale } from "@/config";

const route = useRoute();
const locale = ref<ProjectLocale>("en");

const project = computed(() => getProjectById(route.params.projectId as string));
const content = computed(() => project.value?.content[locale.value]);
const projectNumber = computed(() => String(project.value?.id ?? 0).padStart(2, "0"));

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
    devops,
} as const;

const projectLinkMeta: Record<ProjectLinkType, { icon: string; label: string }> = {
    github: {
        icon: "/images/icons/stacks/tools/github.svg",
        label: "GITHUB",
    },
    youtube: {
        icon: "/images/icons/assets/youtube.svg",
        label: "YOUTUBE",
    },
};

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
        { label: "EXTERNAL SERVICE", items: [] },
        { label: "DEVOPS", items: resolveStackItems(project.value.techStack.devops, stackCatalog.devops) },
    ];

    return groups.filter((group) => group.items.length > 0);
});
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
                <LanguageButton v-model="locale" />
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
                            <div :class="$style.overviewNote">
                                <h3 :class="$style.noteTitle" class="type-caption-sb">
                                    <img src="/images/icons/sidebar/about.svg" alt="" aria-hidden="true">
                                    Target Users
                                </h3>
                                <p class="type-overline-r">{{ content.targetUsers }}</p>
                            </div>
                            <div :class="$style.overviewNote">
                                <h3 :class="$style.noteTitle" class="type-caption-sb">
                                    <img src="/images/icons/assets/switch.svg" alt="" aria-hidden="true">
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
                        <div :class="$style.overviewNote">
                            <h3 :class="$style.noteTitle" class="type-caption-sb">
                                <img src="/images/icons/sidebar/about.svg" alt="" aria-hidden="true">
                                Target Users
                            </h3>
                            <p class="type-overline-r">{{ content.targetUsers }}</p>
                        </div>
                        <div :class="$style.overviewNote">
                            <h3 :class="$style.noteTitle" class="type-caption-sb">
                                <img src="/images/icons/assets/switch.svg" alt="" aria-hidden="true">
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
                        <div :class="$style.architectureImageFrame">
                            <img
                                :class="$style.architectureImage"
                                :src="project.architectureImage"
                                :alt="`${content.projectName} system architecture`"
                            >
                        </div>
                        <div :class="$style.techStackGroups">
                            <section v-for="group in techStackGroups" :key="group.label" :class="$style.techStackGroup">
                                <h3 class="type-caption-sb">{{ group.label }}</h3>
                                <div :class="$style.techStackIcons">
                                    <img
                                        v-for="item in group.items"
                                        :key="item.label"
                                        :src="item.icon"
                                        :alt="item.label"
                                        :title="item.label"
                                    >
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
                        <img
                            :class="$style.architectureImage"
                            :src="project.architectureImage"
                            :alt="`${content.projectName} system architecture`"
                        >
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
                                    <img
                                        v-for="item in group.items"
                                        :key="item.label"
                                        :src="item.icon"
                                        :alt="item.label"
                                        :title="item.label"
                                    >
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
                        <p class="type-body-main-r">{{ content.challenges }}</p>
                        <ul :class="$style.learnedList" class="type-body-main-r">
                            <li v-for="lesson in content.whatILearned.slice(0, 7)" :key="lesson">
                                {{ lesson }}
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
                        <p class="type-body-main-r">{{ content.challenges }}</p>
                    </div>
                </article>

                <article :class="$style.tabPanel">
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">WHAT I LEARNED</h2>
                    <div :class="[$style.panelBody, $style.mobileLearnedBody]">
                        <hr :class="$style.panelDivider">
                        <ul :class="$style.learnedList" class="type-body-main-r">
                            <li v-for="lesson in content.whatILearned.slice(0, 7)" :key="lesson">
                                {{ lesson }}
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
        </div>

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
    align-items: center;
    max-width: calc(100% - 104px);
    min-height: 35px;
    padding: 8px 10px;
    gap: 10px;
    overflow: hidden;
    border-radius: var(--radius-lg);
    background-color: var(--color-main-secondary);
    color: var(--color-button-secondary-btn-text);
    white-space: nowrap;
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
    height: 612px;
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
    object-fit: cover;
}

.architectureImageFrame {
    min-width: 0;
    min-height: 0;
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
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
    background-color: var(--color-main-surface);
}

.techStackIcons img {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    object-fit: contain;
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
    color: var(--color-text-disabled);
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
        aspect-ratio: 376 / 290;
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
