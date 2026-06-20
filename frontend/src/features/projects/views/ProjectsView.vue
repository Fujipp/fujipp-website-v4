<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { AppFooter } from "@/shared/layout";
import { HeaderSection, StatusToast } from "@/shared/ui";
import { AiCard, FeaturedProjectCard, FeatureModal, ProjectTable } from "@/features/projects/components";
import type { ProjectTableRow } from "@/config";
import { aiModels } from "@/features/projects/config";
import { useUserStore } from "@/stores";
import { useProjectStore } from "@/features/projects/stores";
import type { FeaturedProjectId } from "@/features/projects/stores";

type ToastStatus = "success" | "warning" | "error";

const router = useRouter();
const userStore = useUserStore();
const { isAdmin } = storeToRefs(userStore);
const projectStore = useProjectStore();
const { error, isLoading, projects } = storeToRefs(projectStore);
const isFeatureModalOpen = ref(false);
const featuredProjectIds = ref<FeaturedProjectId[]>([]);
const featureError = ref<string | null>(null);
const toast = ref<{ description: string; status: ToastStatus; title: string } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;

const featuredProjects = computed(() => projects.value
    .filter((project) => project.featured)
    .sort((left, right) => (left.featuredOrder ?? 999) - (right.featuredOrder ?? 999))
    .slice(0, 3));

const featuredSkeletonCards = computed(() => isLoading.value && projects.value.length === 0
    ? Array.from({ length: 3 }, (_, index) => index)
    : []);

const featuredAddCards = computed(() => isAdmin.value && featuredSkeletonCards.value.length === 0
    ? Array.from({ length: Math.max(0, 3 - featuredProjects.value.length) }, (_, index) => index)
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
    if (projects.value.length === 0) {
        void projectStore.fetchProjects().catch(() => undefined);
    }
});

function openProject(row: ProjectTableRow): void {
    void router.push({ name: "project-detail", params: { projectId: row.id } });
}

function openNewProject(): void {
    void router.push({ name: "project-new" });
}

function openFeatureModal(): void {
    featuredProjectIds.value = featuredProjects.value.map((project) => project.id);
    featureError.value = null;
    isFeatureModalOpen.value = true;
}

async function saveFeaturedProjects(projectIds: FeaturedProjectId[]): Promise<void> {
    featureError.value = null;

    try {
        await projectStore.updateFeaturedProjects(projectIds);
        await projectStore.fetchProjects();
        isFeatureModalOpen.value = false;
        showToast(
            "Featured projects updated",
            "The featured section has been saved successfully.",
            "success",
        );
    } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to update featured projects.";
        featureError.value = message;
        showToast("Unable to update featured projects", message, "error");
    }
}

function showToast(title: string, description: string, status: ToastStatus): void {
    closeToast();
    toast.value = { description, status, title };
    toastTimeout = setTimeout(closeToast, status === "success" ? 2400 : 5000);
}

function closeToast(): void {
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = undefined;
    }

    toast.value = null;
}

onUnmounted(() => {
    closeToast();
});
</script>

<template>
    <main :class="$style.projects" class="pt-16">
        <div v-if="toast" :class="$style.toastViewport">
            <StatusToast
                :title="toast.title"
                :description="toast.description"
                :status="toast.status"
                @close="closeToast"
            />
        </div>
        <div :class="$style.projectsContainer">
            <section
                v-if="shouldShowFeaturedSection"
                :class="$style.sectionBand"
                aria-label="Featured projects"
            >
                <div :class="$style.sectionStage">
                    <HeaderSection title="Featured" />
                    <div :class="$style.featuredGrid">
                        <FeaturedProjectCard
                            v-for="index in featuredSkeletonCards"
                            :key="`featured-skeleton-${index}`"
                            mode="skeleton"
                            project-name="Loading featured project"
                        />
                        <FeaturedProjectCard
                            v-for="project in featuredProjects"
                            :key="project.id"
                            :admin="isAdmin"
                            :category="project.category"
                            :description-short="project.content.en.descriptionShort"
                            :project-name="project.content.en.projectName"
                            :stack-groups="project.stackGroups"
                            :tech-stack="project.techStack"
                            :thumbnail-src="project.gallery[0] ?? ''"
                            :to="{ name: 'project-detail', params: { projectId: project.id } }"
                            @change="openFeatureModal"
                        />
                        <FeaturedProjectCard
                            v-for="index in featuredAddCards"
                            :key="`featured-add-${index}`"
                            mode="add"
                            project-name="Add featured project"
                            @change="openFeatureModal"
                        />
                    </div>
                </div>
            </section>

            <section :class="[$style.sectionBand, $style.tableBand]" aria-label="All projects">
                <div :class="$style.sectionStage">
                    <HeaderSection title="Projects" />
                    <ProjectTable
                        empty-message="No projects found."
                        :error-message="error ? `Unable to load projects: ${error}` : null"
                        :loading="isLoading"
                        :rows="projectRows"
                        :show-admin-actions="isAdmin"
                        @add="openNewProject"
                        @row-click="openProject"
                    />
                </div>
            </section>

            <section :class="$style.sectionBand" aria-label="AI skills">
                <div :class="$style.sectionStage">
                    <HeaderSection title="Ai Skills" />
                    <div :class="$style.aiFullBleed">
                        <AiCard :items="aiModels" />
                    </div>
                </div>
            </section>
        </div>
        <AppFooter />
        <FeatureModal
            v-if="isFeatureModalOpen"
            v-model="featuredProjectIds"
            :disabled="isLoading"
            :error-message="featureError"
            :rows="projectRows"
            @cancel="isFeatureModalOpen = false"
            @save="saveFeaturedProjects"
        />
    </main>

</template>

<style module>
.projects {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    min-height: 100dvh;
    gap: 0;
    overflow-y: auto;
    scrollbar-width: none;
}

.projects::-webkit-scrollbar {
    display: none;
}

.projectsContainer {
    display: flex;
    flex: 1;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    margin: 0 auto;
    gap: 0;
}

.sectionBand {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    margin: 0 auto;
    padding-block: var(--spacing-space-8);
    background: var(--color-main-surface);
}

.sectionStage {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
    padding-inline: var(--spacing-space-5);
    gap: var(--spacing-space-5);
}

.tableBand .sectionStage {
    gap: 17px;
}

.aiFullBleed {
    position: relative;
    left: 50%;
    width: 100vw;
    margin-left: -50vw;
}

.featuredGrid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-space-5);
}

.toastViewport {
    position: fixed;
    bottom: var(--spacing-space-5);
    right: var(--spacing-space-4);
    z-index: 80;
    width: min(calc(100% - (var(--spacing-space-4) * 2)), 420px);
}

@media (max-width: 767px) {
    .sectionBand {
        padding-block: var(--spacing-space-5);
    }

    .featuredGrid {
        gap: var(--spacing-space-5);
    }
}

@media (min-width: 768px) and (max-width: 1023px) {
    .sectionStage {
        padding-inline: var(--spacing-space-5);
    }
}
</style>
