<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { AiCard, AppFooter, FeaturedProjectCard, HeaderSection, PrimaryButton, ProjectTable } from "@/components";
import type { ProjectTableRow } from "@/components";
import { aiModels } from "@/config";
import { useProjectStore, useUserStore } from "@/stores";

const router = useRouter();
const userStore = useUserStore();
const { isAdmin } = storeToRefs(userStore);
const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);

const featuredProjects = computed(() => projects.value.filter((project) => project.featured).slice(0, 3));

const projectRows = computed(() => projects.value.map((project) => ({
    id: project.id,
    projectName: project.content.en.projectName,
    description: project.content.en.descriptionShort,
    stack: project.stack,
    category: project.category,
    status: project.status,
})) satisfies readonly ProjectTableRow[]);

onMounted(() => {
    void projectStore.fetchProjects();
});

function openProject(row: ProjectTableRow): void {
    void router.push({ name: "project-detail", params: { projectId: row.id } });
}

function openNewProject(): void {
    void router.push({ name: "project-new" });
}
</script>

<template>
    <main :class="$style.projects" class="pt-22">
        <div :class="$style.projectsContainer">
            <section :class="$style.featuredSection" aria-label="Featured projects">
                <HeaderSection title="FEATURED" />
                <div v-if="isAdmin" :class="$style.featuredActions">
                    <PrimaryButton>Edit</PrimaryButton>
                </div>
                <div :class="$style.featuredGrid">
                    <FeaturedProjectCard
                        v-for="project in featuredProjects"
                        :key="project.id"
                        :category="project.category"
                        :description-short="project.content.en.descriptionShort"
                        :project-name="project.content.en.projectName"
                        :stack-groups="project.stackGroups"
                        :thumbnail-src="project.gallery[0] ?? ''"
                        :to="{ name: 'project-detail', params: { projectId: project.id } }"
                    />
                </div>
            </section>

            <section :class="$style.tableSection" aria-label="All projects">
                <HeaderSection title="PROJECTS" />
                <ProjectTable
                    :rows="projectRows"
                    :show-admin-actions="isAdmin"
                    @add="openNewProject"
                    @row-click="openProject"
                />
            </section>

            <section :class="$style.aiSection" aria-label="AI skills">
                <HeaderSection title="AI SKILLS" />
                <div :class="$style.aiFullBleed">
                    <AiCard :items="aiModels" />
                </div>
            </section>
        </div>
        <AppFooter />
    </main>

</template>

<style module>
.projects {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    min-height: 100dvh;
    gap: var(--spacing-space-16);
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
    padding-inline: var(--spacing-space-16);
    gap: var(--spacing-space-16);
}

.featuredSection {
    display: flex;
    flex-direction: column;
    width: min(100%, 1133px);
    margin: 0 auto;
    gap: var(--spacing-space-6);
}

.tableSection {
    display: flex;
    flex-direction: column;
    width: min(100%, 1133px);
    margin: 0 auto;
    gap: var(--spacing-space-6);
}

.aiSection {
    display: flex;
    flex-direction: column;
    width: min(100%, 1133px);
    margin: 0 auto;
    gap: var(--spacing-space-6);
}

.aiFullBleed {
    position: relative;
    left: 50%;
    width: 100vw;
    margin-left: -50vw;
}

.featuredGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.featuredActions {
    display: flex;
    justify-content: center;
}

@media (max-width: 767px) {
    .projects {
        gap: var(--spacing-space-8);
    }

    .projectsContainer {
        padding-inline: var(--spacing-space-4);
    }

    .featuredGrid {
        grid-template-columns: 1fr;
    }
}

@media (min-width: 768px) and (max-width: 1023px) {
    .featuredGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>
