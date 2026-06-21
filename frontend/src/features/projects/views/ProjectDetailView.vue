<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { AppFooter } from "@/shared/layout";
import { ActionButton, HeaderSection, LanguageButton, SecondaryButton } from "@/shared/ui";
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
const rootEl = ref<HTMLElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);
const showIsland = ref(false);
let revealObserver: IntersectionObserver | null = null;

function handleScroll(): void {
    showIsland.value = (scrollEl.value?.scrollTop ?? 0) > 220;
}

const project = computed(() => (
    projectStore.projects.find((item) => String(item.id) === String(route.params.projectId))
));
const content = computed(() => project.value?.content[locale.value]);
const timeline = computed(() => project.value?.timeline);
const hasTimeline = computed(() => Boolean(
    timeline.value?.startDate ||
    timeline.value?.endDate ||
    timeline.value?.milestones.length,
));
const durationMonths = computed(() => {
    if (!timeline.value?.startDate) return 0;

    const start = parseTimelineMonth(timeline.value.startDate);
    const end = parseTimelineMonth(timeline.value.endDate) ?? new Date();

    if (!start) return 0;

    const months = ((end.getFullYear() - start.getFullYear()) * 12) + end.getMonth() - start.getMonth() + 1;

    return months > 0 ? months : 0;
});
const timelineDuration = computed(() => {
    const months = durationMonths.value;

    if (!months) return "";
    return months === 1 ? "1 month" : `${months} months`;
});

const heroCoverStyle = computed(() => {
    const cover = project.value?.gallery[0];

    return cover ? { backgroundImage: `url("${cover}")` } : {};
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
        label: "GitHub",
    },
    youtube: {
        icon: "/images/icons/common/youtube.svg",
        label: "YouTube",
    },
    certificate: {
        icon: "/images/icons/common/certificate.svg",
        label: "Certificate",
    },
    figma: {
        icon: "/images/icons/stacks/ux-ui/figma.svg",
        label: "Figma",
    },
    live: {
        icon: "/images/icons/common/live-demo.svg",
        label: "Live Demo",
    },
    website: {
        icon: "/images/icons/common/website.svg",
        label: "Website",
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

    if (techStackTotal.value) {
        metrics.push({ label: "Technologies", value: techStackTotal.value });
    }

    metrics.push({
        label: content.value.features.length === 1 ? "Feature" : "Features",
        value: content.value.features.length,
    });

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

function revealAllNow(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        el.setAttribute("data-revealed", "");
    });
}

function scanReveals(): void {
    const root = rootEl.value;

    if (!root || !revealObserver) return;

    root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])").forEach((el) => {
        revealObserver?.observe(el);
    });
}

onMounted(() => {
    scrollEl.value?.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
        watch(content, async () => {
            await nextTick();
            if (rootEl.value) revealAllNow(rootEl.value);
        }, { immediate: true });
        return;
    }

    revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.setAttribute("data-revealed", "");
                    revealObserver?.unobserve(entry.target);
                }
            });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    watch(content, async () => {
        await nextTick();
        scanReveals();
    }, { immediate: true });
});

onBeforeUnmount(() => {
    scrollEl.value?.removeEventListener("scroll", handleScroll);
    revealObserver?.disconnect();
    revealObserver = null;
});
</script>

<template>
    <main ref="scrollEl" :class="$style.projectDetail" class="pt-16">
        <article v-if="project && content" ref="rootEl" :class="$style.page">
            <!-- HERO -->
            <header
                :class="[$style.hero, project.gallery.length ? '' : $style.heroEmpty]"
                :style="heroCoverStyle"
                aria-label="Project overview"
            >
                <div :class="$style.heroScrim" aria-hidden="true" />

                <div :class="[$style.heroInner, $style.stage]">
                    <nav :class="$style.heroTopBar" aria-label="Project detail navigation">
                        <SecondaryButton
                            to="/projects"
                            :class="$style.backButton"
                            aria-label="Back to projects"
                        >
                            <span :class="$style.backLabel">
                                <span :class="$style.backArrow" aria-hidden="true">←</span>
                                Back
                            </span>
                        </SecondaryButton>
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

                    <div :class="$style.heroBody">
                        <div :class="[$style.heroChips, $style.heroRise]">
                            <span :class="$style.categoryChip" class="type-overline-sb">{{ project.category }}</span>
                            <span :class="[$style.statusChip, $style[`status${project.status.replace(/\s+/g, '')}`]]" class="type-overline-sb">
                                <span :class="$style.statusDot" aria-hidden="true" />
                                {{ project.status }}
                            </span>
                        </div>
                        <h1 :class="[$style.heroTitle, $style.heroRise]">{{ content.projectName }}</h1>
                        <p :class="[$style.heroLede, $style.heroRise]" class="type-body-main-r">
                            {{ content.descriptionShort || content.description }}
                        </p>
                        <div v-if="project.links.length" :class="[$style.heroLinks, $style.heroRise]">
                            <SecondaryButton
                                v-for="link in project.links"
                                :key="link.type"
                                variant="icon-reveal"
                                :href="link.url"
                                :icon="projectLinkMeta[link.type].icon"
                                :aria-label="projectLinkMeta[link.type].label"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {{ projectLinkMeta[link.type].label }}
                            </SecondaryButton>
                        </div>
                    </div>

                    <div :class="$style.scrollCue" aria-hidden="true">
                        <span :class="$style.scrollCueText" class="type-overline-sb">SCROLL</span>
                        <span :class="$style.scrollCueLine" />
                    </div>
                </div>
            </header>

            <!-- DYNAMIC ISLAND (appears once the hero controls scroll away) -->
            <div :class="[$style.island, showIsland ? $style.islandVisible : '']" aria-label="Quick controls">
                <div :class="$style.islandInner">
                    <RouterLink to="/projects" :class="$style.islandBtn" aria-label="Back to projects">
                        <span :class="$style.islandArrow" aria-hidden="true">←</span>
                    </RouterLink>
                    <span :class="$style.islandSep" aria-hidden="true" />
                    <div :class="$style.islandLang" role="group" aria-label="Language">
                        <button
                            type="button"
                            :class="[$style.islandLangBtn, locale === 'en' ? $style.islandLangActive : '']"
                            @click="locale = 'en'"
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            :class="[$style.islandLangBtn, locale === 'th' ? $style.islandLangActive : '']"
                            @click="locale = 'th'"
                        >
                            TH
                        </button>
                    </div>
                </div>
            </div>

            <!-- BENTO OVERVIEW -->
            <section :class="[$style.stage, $style.bentoSection]" aria-label="Project at a glance">
                <div :class="$style.bentoEyebrow">
                    <span :class="$style.tileHeadAccent" aria-hidden="true" />
                    <span class="type-overline-sb">AT A GLANCE</span>
                </div>
                <div :class="$style.bento">
                    <article
                        v-for="metric in overviewMetrics"
                        :key="metric.label"
                        :class="[$style.tile, $style.tileMetric, $style.reveal]"
                        data-reveal
                    >
                        <strong :class="$style.tileMetricValue">{{ metric.value }}</strong>
                        <span :class="$style.tileMetricBar" aria-hidden="true" />
                        <span :class="$style.tileMetricLabel" class="type-overline-sb">{{ metric.label }}</span>
                    </article>

                    <article :class="[$style.tile, $style.tileStatus, $style.reveal]" data-reveal>
                        <span :class="$style.tileKicker" class="type-overline-sb">STATUS</span>
                        <span :class="[$style.tileStatusValue, $style[`status${project.status.replace(/\s+/g, '')}`]]">
                            <span :class="$style.statusDot" aria-hidden="true" />
                            <span class="type-h3-card-title-sb">{{ project.status }}</span>
                        </span>
                        <div v-if="timeline && timeline.startDate" :class="$style.tileStatusMeta">
                            <span :class="$style.tileDateRange" class="type-overline-r">
                                <img :class="$style.tileDateIcon" src="/images/icons/common/calendar.svg" alt="" aria-hidden="true">
                                {{ formatTimelineMonth(timeline.startDate) }}
                                <template v-if="timeline.endDate">
                                    <span aria-hidden="true">→</span>
                                    {{ formatTimelineMonth(timeline.endDate) }}
                                </template>
                            </span>
                        </div>
                    </article>

                    <article v-if="project.roles.length" :class="[$style.tile, $style.tileWide, $style.reveal]" data-reveal>
                        <header :class="$style.tileHead">
                            <img :class="$style.tileHeadIcon" src="/images/icons/sidebar/about.svg" alt="" aria-hidden="true">
                            <span :class="$style.tileKicker" class="type-overline-sb">MY ROLE</span>
                            <span :class="$style.tileBadge" class="type-overline-sb">{{ project.roles.length }}</span>
                        </header>
                        <div :class="$style.roleList">
                            <span v-for="role in project.roles" :key="role" :class="$style.roleChip" class="type-caption-r">
                                {{ role }}
                            </span>
                        </div>
                    </article>

                    <article :class="[$style.tile, $style.tileWide, $style.reveal]" data-reveal>
                        <header :class="$style.tileHead">
                            <img :class="$style.tileHeadIcon" src="/images/icons/sidebar/contact.svg" alt="" aria-hidden="true">
                            <span :class="$style.tileKicker" class="type-overline-sb">TARGET USERS</span>
                        </header>
                        <p :class="$style.tileText" class="type-caption-r">{{ content.targetUsers }}</p>
                    </article>
                </div>
            </section>

            <!-- CONTENT SECTIONS -->
            <div :class="$style.contentSections">
                <section :class="[$style.stage, $style.block]" aria-label="Overview">
                    <div :class="$style.blockAside">
                        <span :class="$style.blockNum" aria-hidden="true" />
                        <span :class="$style.blockRule" aria-hidden="true" />
                    </div>
                    <div :class="$style.blockBody">
                        <h2 :class="[$style.blockTitle, $style.reveal]" data-reveal>Overview</h2>
                        <p :class="[$style.bodyText, $style.reveal]" data-reveal class="type-body-main-r">{{ content.description }}</p>
                        <div :class="$style.noteRow">
                            <div :class="[$style.note, $style.reveal]" data-reveal>
                                <h3 :class="$style.noteTitle" class="type-caption-sb">
                                    <img src="/images/icons/common/switch.svg" alt="" aria-hidden="true">
                                    Feasibility
                                </h3>
                                <p class="type-caption-r">{{ content.feasibility }}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section v-if="project.gallery.length" :class="[$style.stage, $style.block]" aria-label="Preview">
                    <div :class="$style.blockAside">
                        <span :class="$style.blockNum" aria-hidden="true" />
                        <span :class="$style.blockRule" aria-hidden="true" />
                    </div>
                    <div :class="$style.blockBody">
                        <h2 :class="[$style.blockTitle, $style.reveal]" data-reveal>Preview</h2>
                        <div :class="[$style.galleryWrap, $style.reveal]" data-reveal>
                            <ProjectImage :images="project.gallery" :project-name="content.projectName" />
                        </div>
                    </div>
                </section>

                <section :class="[$style.stage, $style.block]" aria-label="Features">
                    <div :class="$style.blockAside">
                        <span :class="$style.blockNum" aria-hidden="true" />
                        <span :class="$style.blockRule" aria-hidden="true" />
                    </div>
                    <div :class="$style.blockBody">
                        <h2 :class="[$style.blockTitle, $style.reveal]" data-reveal>Features</h2>
                        <ul :class="$style.featureGrid">
                            <li
                                v-for="(feature, index) in content.features.slice(0, 8)"
                                :key="index"
                                :class="[$style.feature, $style.reveal]"
                                data-reveal
                            >
                                <span :class="$style.featureMarker" aria-hidden="true" />
                                <span>{{ feature }}</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section :class="[$style.stage, $style.block]" aria-label="System architecture and tech stack">
                    <div :class="$style.blockAside">
                        <span :class="$style.blockNum" aria-hidden="true" />
                        <span :class="$style.blockRule" aria-hidden="true" />
                    </div>
                    <div :class="$style.blockBody">
                        <h2 :class="[$style.blockTitle, $style.reveal]" data-reveal>Architecture &amp; Stack</h2>
                        <div :class="$style.architectureColumns">
                            <button
                                v-if="project.architectureImage"
                                type="button"
                                :class="[$style.architectureImageFrame, $style.reveal]"
                                data-reveal
                                aria-label="Open system architecture image"
                                @click="openImageModal(project.architectureImage, `${content.projectName} system architecture`)"
                            >
                                <img
                                    :class="$style.architectureImage"
                                    :src="project.architectureImage"
                                    :alt="`${content.projectName} system architecture`"
                                >
                                <span :class="$style.architectureZoom" aria-hidden="true">
                                    <img src="/images/icons/common/gallery.svg" alt="">
                                </span>
                            </button>
                            <div
                                v-else
                                :class="[$style.architectureImageFrame, $style.architecturePlaceholder, $style.reveal]"
                                data-reveal
                                role="img"
                                :aria-label="`${content.projectName} has no system architecture image`"
                            >
                                <img src="/images/icons/common/gallery.svg" alt="" aria-hidden="true">
                            </div>
                            <div :class="[$style.techStackGroups, $style.reveal]" data-reveal>
                                <section v-for="group in techStackGroups" :key="group.label" :class="$style.techStackGroup">
                                    <h3 :class="$style.techStackLabel" class="type-overline-sb">{{ group.label }}</h3>
                                    <div :class="$style.techGrid">
                                        <div
                                            v-for="item in group.items"
                                            :key="item.label"
                                            :class="$style.techCell"
                                            :title="item.label"
                                        >
                                            <img :class="$style.techCellIcon" :src="item.icon" :alt="item.label">
                                            <span :class="$style.techCellLabel">{{ item.label }}</span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </section>

                <section v-if="hasTimeline && timeline" :class="[$style.stage, $style.block]" aria-label="Timeline">
                    <div :class="$style.blockAside">
                        <span :class="$style.blockNum" aria-hidden="true" />
                        <span :class="$style.blockRule" aria-hidden="true" />
                    </div>
                    <div :class="$style.blockBody">
                        <h2 :class="[$style.blockTitle, $style.reveal]" data-reveal>Timeline</h2>
                        <div :class="[$style.timelineSummary, $style.reveal]" data-reveal class="type-caption-r">
                            <span v-if="timeline.startDate">{{ formatTimelineMonth(timeline.startDate) }}</span>
                            <span v-if="timeline.startDate && timeline.endDate" aria-hidden="true">→</span>
                            <span v-if="timeline.endDate">{{ formatTimelineMonth(timeline.endDate) }}</span>
                            <span :class="$style.timelineStatus" class="type-overline-sb">{{ timeline.status }}</span>
                            <strong v-if="timelineDuration">{{ timelineDuration }}</strong>
                        </div>
                        <ol v-if="timeline.milestones.length" :class="$style.timelineList">
                            <li
                                v-for="milestone in timeline.milestones"
                                :key="`${milestone.date}-${milestone.title}`"
                                :class="$style.reveal"
                                data-reveal
                            >
                                <span :class="$style.timelineDot" aria-hidden="true" />
                                <div>
                                    <time :class="$style.timelineTime" class="type-overline-sb">{{ formatTimelineMonth(milestone.date) }}</time>
                                    <h3 class="type-body-small-sb">{{ milestone.title }}</h3>
                                    <p v-if="milestone.description" class="type-caption-r">{{ milestone.description }}</p>
                                </div>
                            </li>
                        </ol>
                    </div>
                </section>

                <section :class="[$style.stage, $style.block]" aria-label="Challenges and lessons">
                    <div :class="$style.blockAside">
                        <span :class="$style.blockNum" aria-hidden="true" />
                        <span :class="$style.blockRule" aria-hidden="true" />
                    </div>
                    <div :class="$style.blockBody">
                        <h2 :class="[$style.blockTitle, $style.reveal]" data-reveal>Challenges &amp; Lessons</h2>
                        <div :class="$style.dualLists">
                            <div :class="[$style.listCard, $style.reveal]" data-reveal>
                                <h3 :class="$style.listCardTitle" class="type-body-small-sb">Challenges</h3>
                                <ul :class="$style.learnedList">
                                    <li v-for="challenge in content.challenges" :key="`${challenge.title}-${challenge.content}`">
                                        <strong v-if="challenge.title">{{ challenge.title }}: </strong>{{ challenge.content }}
                                    </li>
                                </ul>
                            </div>
                            <div :class="[$style.listCard, $style.reveal]" data-reveal>
                                <h3 :class="$style.listCardTitle" class="type-body-small-sb">What I Learned</h3>
                                <ul :class="$style.learnedList">
                                    <li v-for="lesson in content.whatILearned.slice(0, 8)" :key="`${lesson.title}-${lesson.content}`">
                                        <strong v-if="lesson.title">{{ lesson.title }}: </strong>{{ lesson.content }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

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
        </article>

        <!-- SKELETON -->
        <section
            v-else-if="projectStore.isLoading"
            :class="[$style.page, $style.skeletonPage]"
            aria-label="Loading project details"
            aria-busy="true"
        >
            <div :class="$style.skeletonHero">
                <div :class="$style.stage">
                    <div :class="$style.skeletonHeroBody">
                        <div :class="[$style.skeletonBlock, $style.skeletonChip]" />
                        <div :class="[$style.skeletonBlock, $style.skeletonHeroTitle]" />
                        <div :class="[$style.skeletonBlock, $style.skeletonHeroTitleSm]" />
                        <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
                        <div :class="$style.skeletonHeroLinks">
                            <div v-for="index in 2" :key="`hero-link-${index}`" :class="[$style.skeletonBlock, $style.skeletonHeroLink]" />
                        </div>
                    </div>
                </div>
            </div>

            <div :class="[$style.stage, $style.bentoSection]">
                <div :class="$style.bento">
                    <div v-for="index in 3" :key="`metric-${index}`" :class="[$style.skeletonBlock, $style.tile, $style.skeletonTile]" />
                    <div :class="[$style.skeletonBlock, $style.tile, $style.skeletonTile]" />
                    <div :class="[$style.skeletonBlock, $style.tile, $style.tileWide, $style.skeletonTile]" />
                    <div :class="[$style.skeletonBlock, $style.tile, $style.tileWide, $style.skeletonTile]" />
                </div>
            </div>

            <div :class="$style.contentSections">
                <div v-for="index in 2" :key="`block-${index}`" :class="[$style.stage, $style.block]">
                    <div :class="$style.blockAside">
                        <div :class="[$style.skeletonBlock, $style.skeletonNum]" />
                    </div>
                    <div :class="$style.blockBody">
                        <div :class="[$style.skeletonBlock, $style.skeletonBlockTitle]" />
                        <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
                        <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
                        <div :class="[$style.skeletonBlock, $style.skeletonLine, $style.skeletonLineShort]" />
                    </div>
                </div>
            </div>
        </section>

        <section v-else :class="[$style.stage, $style.notFound]">
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
    gap: 0;
    overflow-y: auto;
    scrollbar-width: none;
    background-color: var(--color-main-section-background);
}

.projectDetail::-webkit-scrollbar {
    display: none;
}

.page {
    display: flex;
    flex: 1;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    margin: 0 auto;
}

.stage {
    width: min(100%, var(--container-7xl));
    box-sizing: border-box;
    margin: 0 auto;
    padding-inline: var(--spacing-space-5);
}

/* ---------- Hero ---------- */

.hero {
    position: relative;
    display: flex;
    width: 100%;
    min-height: clamp(560px, 86vh, 880px);
    box-sizing: border-box;
    overflow: hidden;
    background-color: var(--color-main-section-background);
    background-position: center;
    background-size: cover;
}

.heroEmpty {
    background-image: radial-gradient(120% 90% at 50% 0%, #262a3a 0%, var(--color-main-section-background) 60%);
}

.heroScrim {
    position: absolute;
    inset: 0;
    z-index: 0;
    background: linear-gradient(
        180deg,
        rgb(28 28 28 / 55%) 0%,
        rgb(28 28 28 / 20%) 30%,
        rgb(28 28 28 / 78%) 70%,
        var(--color-main-section-background) 100%
    );
}

.heroGlow {
    position: absolute;
    z-index: 0;
    bottom: -10%;
    left: -6%;
    width: 50vw;
    max-width: 640px;
    aspect-ratio: 1;
    border-radius: var(--radius-full);
    background: radial-gradient(circle, rgb(121 135 172 / 42%) 0%, transparent 65%);
    filter: blur(90px);
    pointer-events: none;
    animation: glow-drift 18s ease-in-out infinite;
}

@keyframes glow-drift {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(14%, -8%) scale(1.2); }
}

.heroInner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    padding-block: var(--spacing-space-6) var(--spacing-space-10);
}

.heroTopBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-5);
}

/* ---------- Dynamic island ---------- */

.island {
    position: fixed;
    top: 50%;
    right: var(--spacing-space-5);
    z-index: 30;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-50%) translateX(16px) scale(0.7);
    transition: opacity 240ms ease, transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.islandVisible {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(-50%) translateX(0) scale(1);
}

.islandInner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-space-2);
    padding: 8px 6px;
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 16%, transparent);
    border-radius: var(--radius-full);
    background:
        linear-gradient(
            150deg,
            color-mix(in srgb, var(--color-neutral-50) 14%, transparent) 0%,
            color-mix(in srgb, var(--color-neutral-50) 4%, transparent) 42%,
            color-mix(in srgb, var(--color-neutral-900) 28%, transparent) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 45%, transparent),
        inset 0 -8px 16px color-mix(in srgb, var(--color-neutral-900) 30%, transparent),
        0 10px 28px color-mix(in srgb, var(--color-neutral-900) 38%, transparent);
    backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
}

.islandBtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-full);
    color: var(--color-neutral-50);
    text-decoration: none;
    transition: background-color 180ms ease;
}

.islandBtn:hover,
.islandBtn:focus-visible {
    background-color: rgb(255 255 255 / 12%);
    outline: none;
}

.islandArrow {
    font-size: 1.125rem;
    line-height: 1;
}

.islandSep {
    width: 20px;
    height: 1px;
    background-color: rgb(255 255 255 / 14%);
}

.islandLang {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.islandLangBtn {
    min-width: 34px;
    height: 34px;
    padding: 0 10px;
    border: 0;
    border-radius: var(--radius-full);
    background-color: transparent;
    color: var(--color-neutral-400);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
}

.islandLangBtn:hover {
    color: var(--color-neutral-50);
}

.islandLangBtn:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.islandLangActive {
    background-color: var(--color-main-primary);
    color: var(--color-button-primary-btn-text-active);
}

.backButton {
    width: auto;
    min-width: 0;
    padding-inline: var(--spacing-space-5);
}

.backLabel {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.backArrow {
    font-size: 1.125rem;
    line-height: 1;
    transition: transform 200ms ease;
}

.backButton:hover .backArrow {
    transform: translateX(-3px);
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

.heroBody {
    display: flex;
    flex-direction: column;
    margin-top: auto;
    gap: var(--spacing-space-4);
    max-width: 920px;
}

.heroChips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-space-2);
}

.categoryChip {
    padding: 5px 14px;
    border-radius: var(--radius-full);
    background-color: var(--color-main-surface);
    color: var(--color-button-primary-btn-text-active);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    box-shadow: 0 8px 24px -10px rgb(121 135 172 / 70%);
}

.statusChip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 14px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
    background-color: rgb(255 255 255 / 8%);
    color: var(--color-text-secondary);
    backdrop-filter: blur(8px);
}

.statusDot {
    position: relative;
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background-color: var(--color-text-disabled);
}

.statusDot::after {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-full);
    background-color: inherit;
    content: "";
    animation: status-ping 1.8s ease-out infinite;
}

.statusActive .statusDot,
.statusInProgress .statusDot {
    background-color: var(--color-status-warning);
}

.statusCompleted .statusDot {
    background-color: var(--color-status-success);
}

.statusArchived .statusDot {
    background-color: var(--color-text-disabled);
}

.statusArchived .statusDot::after {
    animation: none;
}

@keyframes status-ping {
    0% { transform: scale(1); opacity: 0.7; }
    70%, 100% { transform: scale(2.6); opacity: 0; }
}

.heroTitle {
    margin: 0;
    max-width: 16ch;
    font-family: var(--font-sans);
    font-size: clamp(2.5rem, 6vw, 4.75rem);
    font-weight: 800;
    line-height: 1.02;
    letter-spacing: -0.02em;
    background: linear-gradient(
        120deg,
        var(--color-button-primary-btn-text-active) 0%,
        var(--color-text-secondary) 40%,
        var(--color-data-pastel-1) 100%
    );
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
}

.heroLede {
    margin: 0;
    max-width: 680px;
    color: var(--color-text-secondary);
    line-height: 1.55;
    text-shadow: 0 2px 12px rgb(0 0 0 / 35%);
}

.heroLinks {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin-top: var(--spacing-space-2);
    gap: 10px;
}

.scrollCue {
    position: absolute;
    right: var(--spacing-space-5);
    bottom: var(--spacing-space-8);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--color-text-disabled);
}

.scrollCueText {
    writing-mode: vertical-rl;
    letter-spacing: 0.2em;
}

.scrollCueLine {
    width: 1px;
    height: 48px;
    overflow: hidden;
    background-color: rgb(255 255 255 / 18%);
}

.scrollCueLine::after {
    display: block;
    width: 100%;
    height: 40%;
    background-color: var(--color-data-pastel-1);
    content: "";
    animation: scroll-cue 1.8s ease-in-out infinite;
}

@keyframes scroll-cue {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(250%); }
}

/* ---------- Hero entrance ---------- */

.heroRise {
    opacity: 0;
    animation: hero-rise 0.75s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}

.heroRise:nth-child(1) { animation-delay: 0.1s; }
.heroRise:nth-child(2) { animation-delay: 0.2s; }
.heroRise:nth-child(3) { animation-delay: 0.3s; }
.heroRise:nth-child(4) { animation-delay: 0.4s; }

@keyframes hero-rise {
    from { opacity: 0; transform: translateY(28px); }
    to { opacity: 1; transform: translateY(0); }
}

/* ---------- Bento ---------- */

.bentoSection {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-5);
    padding-block: var(--spacing-space-12) 0;
}

.bentoEyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--color-text-disabled);
    letter-spacing: 0.14em;
}

.tileHeadAccent {
    flex-shrink: 0;
    width: 4px;
    height: 16px;
    border-radius: var(--radius-full);
    background: linear-gradient(var(--color-main-primary), var(--color-data-pastel-1));
}

.bento {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: minmax(150px, auto);
    gap: var(--spacing-space-4);
}

.tile {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-height: 150px;
    padding: var(--spacing-space-5);
    gap: var(--spacing-space-2);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-2xl);
    background:
        linear-gradient(180deg, rgb(255 255 255 / 4%) 0%, transparent 45%),
        var(--color-main-surface);
    color: var(--color-text-secondary);
    transition: transform 280ms ease, border-color 280ms ease, box-shadow 280ms ease;
}

.tile:hover {
    transform: translateY(-4px);
    border-color: var(--color-main-primary);
    box-shadow: 0 24px 50px -28px rgb(121 135 172 / 55%);
}

.tileMetric {
    align-items: flex-start;
    justify-content: flex-end;
    gap: 8px;
    background:
        linear-gradient(160deg, rgb(121 135 172 / 16%) 0%, transparent 55%),
        var(--gradient-card-highlight);
}

.tileMetricValue {
    font-size: clamp(2.5rem, 4vw, 3.5rem);
    font-weight: 800;
    line-height: 1;
}

.tileMetricBar {
    width: 36px;
    height: 3px;
    border-radius: var(--radius-full);
    background: linear-gradient(90deg, var(--color-main-primary), var(--color-data-pastel-1));
}

.tileMetricLabel {
    color: var(--color-text-secondary);
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.tileKicker {
    color: var(--color-text-disabled);
    letter-spacing: 0.1em;
}

.tileHead {
    display: flex;
    align-items: center;
    gap: 8px;
}

.tileHeadIcon {
    width: 20px;
    height: 20px;
    opacity: 0.85;
}

.tileBadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 22px;
    margin-left: auto;
    padding: 0 8px;
    border-radius: var(--radius-full);
    background-color: var(--color-main-secondary);
    color: var(--color-text-secondary);
}

.tileStatus {
    justify-content: flex-start;
}

.tileStatusValue {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-top: auto;
}

.tileStatusValue .statusDot {
    width: 10px;
    height: 10px;
}

.tileStatusMeta {
    display: flex;
    flex-direction: column;
    margin-top: var(--spacing-space-3);
    padding-top: var(--spacing-space-3);
    gap: 4px;
    border-top: 1px solid var(--color-main-divider);
}

.tileDateRange {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    color: var(--color-text-secondary);
}

.tileDateIcon {
    width: 16px;
    height: 16px;
    /* tint the black calendar.svg to text-secondary (#E4E4E4) like the tile header icons */
    filter: brightness(0) invert(0.9);
    opacity: 0.85;
}

.tileWide {
    grid-column: span 2;
    justify-content: flex-start;
    gap: var(--spacing-space-3);
}

.tileText {
    margin: 0;
    color: var(--color-text-secondary);
    line-height: 1.55;
}

.roleList {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.roleChip {
    padding: 7px 14px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
    background-color: rgb(255 255 255 / 4%);
    transition: border-color 200ms ease, color 200ms ease, background-color 200ms ease, transform 200ms ease;
}

.roleChip:hover {
    border-color: var(--color-main-primary);
    background-color: rgb(121 135 172 / 16%);
    color: var(--color-data-pastel-1);
    transform: translateY(-2px);
}

/* ---------- Content sections ---------- */

.contentSections {
    display: flex;
    flex-direction: column;
    counter-reset: section;
    padding-block: var(--spacing-space-16) var(--spacing-space-12);
    gap: var(--spacing-space-20);
}

.block {
    display: grid;
    grid-template-columns: minmax(0, 200px) minmax(0, 1fr);
    align-items: start;
    gap: var(--spacing-space-10);
}

.blockAside {
    position: sticky;
    top: var(--spacing-space-8);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    counter-increment: section;
}

.blockNum {
    font-family: var(--font-sans);
    font-size: clamp(3rem, 5vw, 4.5rem);
    font-weight: 800;
    line-height: 0.9;
    background: linear-gradient(160deg, var(--color-text-secondary) 0%, var(--color-main-primary) 100%);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
}

.blockNum::before {
    content: counter(section, decimal-leading-zero);
}

.blockRule {
    width: 56px;
    height: 3px;
    border-radius: var(--radius-full);
    background: linear-gradient(90deg, var(--color-main-primary), var(--color-data-pastel-1));
}

.blockBody {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: var(--spacing-space-5);
}

.blockTitle {
    margin: 0;
    font-family: var(--font-sans);
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: var(--color-text-secondary);
}

.bodyText {
    margin: 0;
    max-width: 70ch;
    color: var(--color-text-secondary);
    line-height: 1.7;
}

.noteRow {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-space-4);
}

.note {
    flex: 1;
    min-width: 240px;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-secondary);
    transition: border-color 240ms ease;
}

.note:hover {
    border-color: var(--color-main-primary);
}

.note p {
    margin: 8px 0 0;
    color: var(--color-text-secondary);
    line-height: 1.55;
}

.noteTitle {
    display: flex;
    align-items: center;
    margin: 0;
    gap: 8px;
    color: var(--color-text-secondary);
}

.noteTitle img {
    width: 24px;
    height: 24px;
}

.galleryWrap {
    width: 100%;
}

/* ---------- Features ---------- */

.featureGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    gap: var(--spacing-space-3);
    list-style: none;
}

.feature {
    position: relative;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    min-height: 56px;
    padding: 14px 18px;
    gap: 12px;
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-secondary);
    color: var(--color-text-secondary);
    font-size: 1.0625rem;
    font-weight: 300;
    line-height: 1.35;
    transition: transform 240ms ease, border-color 240ms ease;
}

.feature::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: linear-gradient(var(--color-main-primary), var(--color-data-pastel-1));
    content: "";
    opacity: 0;
    transition: opacity 240ms ease;
}

.feature:hover {
    transform: translateX(5px);
    border-color: var(--color-main-primary);
}

.feature:hover::before {
    opacity: 1;
}

.featureMarker {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background-color: var(--color-main-primary);
    transition: transform 240ms ease, box-shadow 240ms ease;
}

.feature:hover .featureMarker {
    transform: scale(1.5);
    box-shadow: 0 0 0 4px rgb(121 135 172 / 22%);
}

/* ---------- Architecture & stack ---------- */

.architectureColumns {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-6);
}

.architectureImageFrame {
    position: relative;
    width: 100%;
    min-width: 0;
    aspect-ratio: 1980 / 1080;
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-2xl);
}

button.architectureImageFrame {
    padding: 0;
    background-color: transparent;
    cursor: zoom-in;
    transition: border-color 240ms ease, box-shadow 240ms ease;
}

button.architectureImageFrame:hover {
    border-color: var(--color-main-primary);
    box-shadow: 0 18px 40px -26px rgb(121 135 172 / 60%);
}

button.architectureImageFrame:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.architectureImage {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: transform 400ms ease;
}

button.architectureImageFrame:hover .architectureImage {
    transform: scale(1.04);
}

.architectureZoom {
    position: absolute;
    right: 12px;
    bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background-color: rgb(23 23 23 / 70%);
    backdrop-filter: blur(4px);
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 240ms ease, transform 240ms ease;
}

.architectureZoom img {
    width: 18px;
    height: 18px;
}

button.architectureImageFrame:hover .architectureZoom,
button.architectureImageFrame:focus-visible .architectureZoom {
    opacity: 1;
    transform: translateY(0);
}

.architecturePlaceholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-main-secondary);
}

.architecturePlaceholder img {
    width: var(--spacing-space-16);
    height: var(--spacing-space-16);
}

.techStackGroups {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
}

.techStackGroup {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.techStackLabel {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    color: var(--color-text-disabled);
    letter-spacing: 0.06em;
}

.techStackLabel::after {
    flex: 1;
    height: 1px;
    background-color: var(--color-main-divider);
    content: "";
}

.techGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 10px;
}

.techCell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: 92px;
    padding: 14px 8px;
    gap: 10px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background:
        linear-gradient(180deg, rgb(255 255 255 / 3%) 0%, transparent 45%),
        var(--color-main-surface);
    text-align: center;
    transition: transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
}

.techCell:hover {
    transform: translateY(-4px);
    border-color: var(--color-main-primary);
    box-shadow: 0 18px 36px -22px rgb(121 135 172 / 55%);
}

.techCellIcon {
    width: 34px;
    height: 34px;
    object-fit: contain;
    transition: transform 240ms ease;
}

.techCell:hover .techCellIcon {
    transform: scale(1.08);
}

.techCellLabel {
    overflow: hidden;
    max-width: 100%;
    font-family: var(--font-sans);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.2;
    color: var(--color-text-disabled);
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 200ms ease;
}

.techCell:hover .techCellLabel {
    color: var(--color-data-pastel-1);
}

/* ---------- Timeline ---------- */

.timelineSummary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    color: var(--color-text-secondary);
}

.timelineStatus {
    padding: 4px 12px;
    border-radius: var(--radius-full);
    background-color: var(--color-main-primary);
    color: var(--color-button-primary-btn-text-active);
}

.timelineSummary strong {
    margin-left: auto;
    color: var(--color-data-pastel-1);
}

.timelineList {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: var(--spacing-space-2) 0 0 var(--spacing-space-4);
    gap: var(--spacing-space-5);
    list-style: none;
}

.timelineList li {
    position: relative;
    padding-left: 22px;
}

.timelineList h3,
.timelineList p {
    margin: 4px 0 0;
    color: var(--color-text-secondary);
}

.timelineList li:not(:last-child)::before {
    position: absolute;
    top: 14px;
    bottom: -22px;
    left: 1px;
    width: 2px;
    background: linear-gradient(var(--color-main-primary), transparent);
    content: "";
}

.timelineDot {
    position: absolute;
    top: 5px;
    left: -3px;
    width: 12px;
    height: 12px;
    border-radius: var(--radius-full);
    background-color: var(--color-main-primary);
    box-shadow: 0 0 0 5px rgb(121 135 172 / 18%);
}

.timelineTime {
    color: var(--color-data-pastel-1);
}

/* ---------- Challenges / lessons ---------- */

.dualLists {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.listCard {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-5);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-2xl);
    background:
        linear-gradient(180deg, rgb(255 255 255 / 3%) 0%, transparent 45%),
        var(--color-main-surface);
    transition: transform 280ms ease, border-color 280ms ease;
}

.listCard:hover {
    transform: translateY(-4px);
    border-color: var(--color-main-primary);
}

.listCardTitle {
    margin: 0;
    color: var(--color-data-pastel-1);
}

.learnedList {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding-left: 22px;
    gap: 10px;
    color: var(--color-text-secondary);
    font-size: 1.0625rem;
    font-weight: 300;
    line-height: 1.55;
    list-style-position: outside;
    list-style-type: disc;
}

.learnedList strong {
    font-weight: 600;
}

.learnedList li::marker {
    color: var(--color-main-primary);
}

/* ---------- CTA ---------- */

/* ---------- Scroll reveal ---------- */

.reveal {
    opacity: 0;
    transform: translateY(32px);
    transition: opacity 0.65s ease, transform 0.65s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.reveal[data-revealed] {
    opacity: 1;
    transform: none;
}

/* ---------- Not found ---------- */

.notFound {
    display: flex;
    flex-direction: column;
    padding-block: var(--spacing-space-24);
    gap: var(--spacing-space-5);
}

.notFound h2 {
    color: var(--color-text-secondary);
}

/* ---------- Skeleton ---------- */

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

.skeletonHero {
    display: flex;
    width: 100%;
    min-height: clamp(560px, 86vh, 880px);
    background-color: var(--color-main-section-background);
}

.skeletonHero .stage {
    display: flex;
    align-items: flex-end;
}

.skeletonHeroBody {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 720px;
    padding-bottom: var(--spacing-space-10);
    gap: var(--spacing-space-4);
}

.skeletonChip {
    width: 130px;
    height: 28px;
    border-radius: var(--radius-full);
}

.skeletonHeroTitle {
    width: min(560px, 90%);
    height: 56px;
}

.skeletonHeroTitleSm {
    width: min(380px, 60%);
    height: 56px;
}

.skeletonLine {
    width: 100%;
    height: 16px;
}

.skeletonLineShort {
    width: 65%;
}

.skeletonHeroLinks {
    display: flex;
    margin-top: var(--spacing-space-2);
    gap: 12px;
}

.skeletonHeroLink {
    width: 132px;
    height: 44px;
    border-radius: var(--radius-full);
}

.skeletonTile {
    min-height: 150px;
}

.skeletonNum {
    width: 80px;
    height: 64px;
}

.skeletonBlockTitle {
    width: 220px;
    height: 36px;
    margin-bottom: var(--spacing-space-2);
}

@keyframes skeleton-shimmer {
    from { background-position: 100% 0; }
    to { background-position: -100% 0; }
}

/* ---------- Responsive ---------- */

@media (max-width: 1023px) {
    .bento {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .architectureColumns {
        grid-template-columns: minmax(0, 1fr);
    }
}

@media (max-width: 767px) {
    .hero {
        min-height: clamp(480px, 78vh, 640px);
    }

    .heroTopBar {
        gap: var(--spacing-space-3);
    }

    .scrollCue {
        display: none;
    }

    .bento {
        grid-template-columns: 1fr;
    }

    .tileWide {
        grid-column: span 1;
    }

    .contentSections {
        padding-block: var(--spacing-space-10);
        gap: var(--spacing-space-12);
    }

    .block {
        grid-template-columns: 1fr;
        gap: var(--spacing-space-4);
    }

    .blockAside {
        position: static;
        flex-direction: row;
        align-items: center;
        gap: var(--spacing-space-4);
    }

    .featureGrid,
    .dualLists {
        grid-template-columns: 1fr;
    }
}

@media (prefers-reduced-motion: reduce) {
    .heroGlow,
    .statusDot::after,
    .scrollCueLine::after {
        animation: none;
    }

    .heroRise,
    .reveal {
        opacity: 1;
        transform: none;
        animation: none;
        transition: none;
    }

    .island,
    .islandVisible,
    .island:not(.islandVisible) {
        transform: translateY(-50%);
        transition: opacity 240ms ease;
    }

    .skeletonBlock {
        animation: none;
    }
}
</style>
