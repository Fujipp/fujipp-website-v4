import { ref } from "vue";
import { defineStore } from "pinia";
import { supabase } from "@/shared/lib/supabase";
import { API_BASE_URL } from "@/config";
import type { ProjectRecord } from "@/config";
import { useUserStore } from "@/stores";

const PROJECT_ASSETS_BUCKET = "project-assets";
const PROJECT_CACHE_KEY = "fujipp.projects.v1";
const PROJECT_ASSET_CACHE_SECONDS = "31536000";

export type ProjectPayload = Omit<ProjectRecord, "id">;
export type FeaturedProjectId = ProjectRecord["id"];

export const useProjectStore = defineStore("project", () => {
    const projects = ref<ProjectRecord[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const hasLoadedAll = ref(false);
    let projectsRequest: Promise<ProjectRecord[]> | null = null;

    async function fetchProjects(): Promise<ProjectRecord[]> {
        if (projectsRequest) {
            return projectsRequest;
        }

        projectsRequest = loadProjects();

        try {
            return await projectsRequest;
        } finally {
            projectsRequest = null;
        }
    }

    async function loadProjects(): Promise<ProjectRecord[]> {
        const restoredFromCache = restoreProjects();
        isLoading.value = true;
        error.value = null;

        try {
            const response = await fetch(`${API_BASE_URL}/api/public/projects`);
            projects.value = await parseResponse<ProjectRecord[]>(response);
            hasLoadedAll.value = true;
            persistProjects();
            return projects.value;
        } catch (cause) {
            error.value = getErrorMessage(cause);

            if (restoredFromCache) {
                return projects.value;
            }

            throw cause;
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchProject(projectId: string | number): Promise<ProjectRecord> {
        const existingProject = projects.value.find((project) => String(project.id) === String(projectId));

        if (existingProject) {
            return existingProject;
        }

        isLoading.value = true;
        error.value = null;

        try {
            const response = await fetch(`${API_BASE_URL}/api/public/projects/${projectId}`);
            const project = await parseResponse<ProjectRecord>(response);
            projects.value = [project, ...projects.value.filter((item) => String(item.id) !== String(project.id))];
            persistProjects();
            return project;
        } catch (cause) {
            error.value = getErrorMessage(cause);
            throw cause;
        } finally {
            isLoading.value = false;
        }
    }

    async function createProject(payload: ProjectPayload): Promise<ProjectRecord> {
        const project = await mutate<ProjectRecord>("/api/projects", "POST", payload);
        projects.value = [project, ...projects.value.filter((item) => String(item.id) !== String(project.id))];
        persistProjects();
        return project;
    }

    async function updateProject(projectId: string | number, payload: ProjectPayload): Promise<ProjectRecord> {
        const project = await mutate<ProjectRecord>(`/api/projects/${projectId}`, "PUT", payload);
        projects.value = projects.value.map((item) => (String(item.id) === String(project.id) ? project : item));
        persistProjects();
        return project;
    }

    async function deleteProject(projectId: string | number): Promise<void> {
        await mutate<void>(`/api/projects/${projectId}`, "DELETE");
        projects.value = projects.value.filter((project) => String(project.id) !== String(projectId));
        persistProjects();
    }

    async function updateFeaturedProjects(projectIds: readonly FeaturedProjectId[]): Promise<ProjectRecord[]> {
        projects.value = await mutate<ProjectRecord[], { projectIds: readonly FeaturedProjectId[] }>(
            "/api/projects/featured",
            "PUT",
            { projectIds },
        );
        persistProjects();
        return projects.value;
    }

    async function uploadProjectAsset(file: File, directory: string): Promise<string> {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const objectPath = `${directory}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
            .from(PROJECT_ASSETS_BUCKET)
            .upload(objectPath, file, {
                cacheControl: PROJECT_ASSET_CACHE_SECONDS,
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            throw new Error(uploadError.message);
        }

        const { data } = supabase.storage.from(PROJECT_ASSETS_BUCKET).getPublicUrl(objectPath);
        return data.publicUrl;
    }

    async function mutate<T, Payload = ProjectPayload>(
        path: string,
        method: "POST" | "PUT" | "DELETE",
        payload?: Payload,
    ): Promise<T> {
        const userStore = useUserStore();

        if (!userStore.accessToken || !userStore.isAdmin) {
            throw new Error("Admin role required");
        }

        isLoading.value = true;
        error.value = null;

        try {
            const response = await fetch(`${API_BASE_URL}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${userStore.accessToken}`,
                    ...(payload ? { "Content-Type": "application/json" } : {}),
                },
                body: payload ? JSON.stringify(payload) : undefined,
            });

            return await parseResponse<T>(response);
        } catch (cause) {
            error.value = getErrorMessage(cause);
            throw cause;
        } finally {
            isLoading.value = false;
        }
    }

    function restoreProjects(): boolean {
        if (projects.value.length > 0 || typeof window === "undefined") {
            return projects.value.length > 0;
        }

        try {
            const cached = window.localStorage.getItem(PROJECT_CACHE_KEY);

            if (!cached) {
                return false;
            }

            const parsed = JSON.parse(cached) as ProjectRecord[];

            if (!Array.isArray(parsed)) {
                return false;
            }

            projects.value = parsed;
            hasLoadedAll.value = true;
            return true;
        } catch {
            window.localStorage.removeItem(PROJECT_CACHE_KEY);
            return false;
        }
    }

    function persistProjects(): void {
        if (typeof window === "undefined") {
            return;
        }

        try {
            window.localStorage.setItem(PROJECT_CACHE_KEY, JSON.stringify(projects.value));
        } catch {
            // Storage can be unavailable or full; the in-memory store remains the fallback.
        }
    }

    return {
        projects,
        isLoading,
        error,
        hasLoadedAll,
        createProject,
        deleteProject,
        fetchProject,
        fetchProjects,
        updateProject,
        updateFeaturedProjects,
        uploadProjectAsset,
    };
});

async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return await response.json() as T;
}

function getErrorMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : "Unexpected project request error";
}
