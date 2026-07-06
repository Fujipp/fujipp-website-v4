<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { AppFooter } from "@/shared/layout";
import { FeaturedProjectCard, FeatureModal, ProjectTable } from "@/features/projects/components";
import type { ProjectTableRow } from "@/config";
import { useToastStore, useUserStore } from "@/stores";
import { useProjectStore } from "@/features/projects/stores";
import type { FeaturedProjectId } from "@/features/projects/stores";

const router = useRouter();
const userStore = useUserStore();
const { isAdmin } = storeToRefs(userStore);
const projectStore = useProjectStore();
const toastStore = useToastStore();
const { error, isLoading, projects } = storeToRefs(projectStore);
const isFeatureModalOpen = ref(false);
const editingSlot = ref(0);
const editingProjectId = ref<FeaturedProjectId | null>(null);

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
    if (!projectStore.hasLoadedAll) {
        void projectStore.fetchProjects().catch(() => undefined);
    }
});

function openProject(row: ProjectTableRow): void {
    void router.push({ name: "project-detail", params: { projectId: row.id } });
}

function openNewProject(): void {
    void router.push({ name: "project-new" });
}

/* Each featured card edits its own slot: change replaces it, add appends. */
function openFeatureModal(slot: number): void {
    editingSlot.value = slot;
    editingProjectId.value = featuredProjects.value[slot]?.id ?? null;
    isFeatureModalOpen.value = true;
}

const excludedFeaturedIds = computed(() => featuredProjects.value
    .filter((_, index) => index !== editingSlot.value)
    .map((project) => project.id));

async function saveFeaturedSlot(projectId: FeaturedProjectId | null): Promise<void> {
    const projectIds = featuredProjects.value.map((project) => project.id);

    if (editingSlot.value < projectIds.length) {
        if (projectId === null) {
            projectIds.splice(editingSlot.value, 1);
        } else {
            projectIds[editingSlot.value] = projectId;
        }
    } else if (projectId !== null) {
        projectIds.push(projectId);
    }

    /* Close right away; the outcome is reported through a toast only. */
    isFeatureModalOpen.value = false;

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
</script>

<template>
    <main :class="$style.projects" class="pt-16">
            <div :class="$style.projectsContainer">
            <section
                v-if="shouldShowFeaturedSection"
                :class="$style.featuredSection"
                aria-label="Featured projects"
            >
                <h1 :class="$style.featuredTitle" class="type-h1-page-title-eb">Featured</h1>
                <div :class="$style.featuredGrid">
                    <FeaturedProjectCard
                        v-for="index in featuredSkeletonCards"
                        :key="`featured-skeleton-${index}`"
                        mode="skeleton"
                        project-name="Loading featured project"
                    />
                    <FeaturedProjectCard
                        v-for="(project, index) in featuredProjects"
                        :key="project.id"
                        :admin="isAdmin"
                        :category="project.category"
                        :description-short="project.content.en.descriptionShort"
                        :project-name="project.content.en.projectName"
                        :stack-groups="project.stackGroups"
                        :tech-stack="project.techStack"
                        :thumbnail-src="project.gallery[0] ?? ''"
                        :to="{ name: 'project-detail', params: { projectId: project.id } }"
                        @change="openFeatureModal(index)"
                    />
                    <FeaturedProjectCard
                        v-for="index in featuredAddCards"
                        :key="`featured-add-${index}`"
                        mode="add"
                        project-name="Add featured project"
                        @change="openFeatureModal(featuredProjects.length + index)"
                    />
                </div>
            </section>

            <section :class="$style.allProjectSection" aria-label="All projects">
                <h2 :class="$style.allProjectTitle" class="type-h2-section-title-eb">All Project</h2>
                <p :class="$style.allProjectSubtitle">
                    Please feel free to explore any projects that catch your interest.
                </p>
                <ProjectTable
                    empty-message="No projects found."
                    :error-message="error ? `Unable to load projects: ${error}` : null"
                    :loading="isLoading"
                    :rows="projectRows"
                    :show-admin-actions="isAdmin"
                    @add="openNewProject"
                    @row-click="openProject"
                />
            </section>
        </div>
        <AppFooter />
        <FeatureModal
            v-if="isFeatureModalOpen"
            :model-value="editingProjectId"
            :title="`Featured ${editingSlot + 1}`"
            :disabled="isLoading"
            :exclude-ids="excludedFeaturedIds"
            :rows="projectRows"
            @cancel="isFeatureModalOpen = false"
            @save="saveFeaturedSlot"
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

.featuredSection {
    display: flex;
    flex-direction: column;
    align-self: stretch;
}

.featuredTitle {
    margin: 0;
    padding: 12px 16px;
    color: var(--color-text-primary);
    text-align: center;
}

.featuredGrid {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    flex-wrap: wrap;
    padding: 12px 16px;
    gap: 8px;
}

.allProjectSection {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    padding: 12px 16px;
    gap: 8px;
}

.allProjectTitle {
    margin: 0;
    color: var(--color-text-primary);
}

.allProjectSubtitle {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--type-size-subtitle);
    font-weight: 300;
}

</style>
