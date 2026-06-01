<script setup lang="ts">
import { useRouter } from "vue-router";
import { AiCard, AppFooter, FeaturedProjectCard, HeaderSection, ProjectTable } from "@/components";
import type { ProjectTableRow } from "@/components";
import { aiModels, projects } from "@/config";

const router = useRouter();

const featuredProjects = projects.slice(0, 3);

const projectRows = projects.map((project) => ({
    id: project.id,
    projectName: project.content.en.projectName,
    description: project.content.en.descriptionShort,
    stack: project.stack,
    category: project.category,
    status: project.status,
})) satisfies readonly ProjectTableRow[];

function openProject(row: ProjectTableRow): void {
    void router.push({ name: "project-detail", params: { projectId: row.id } });
}
</script>

<template>
    <main :class="$style.projects" class="pt-22">
        <div :class="$style.projectsContainer">
            <section :class="$style.featuredSection" aria-label="Featured projects">
                <HeaderSection title="FEATURED" />
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
                <ProjectTable :rows="projectRows" @row-click="openProject" />
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
