import { ref } from "vue";
import { defineStore } from "pinia";
import { supabase } from "@/lib/supabase";
import type { ProjectRecord } from "@/config";
import { useUserStore } from "./userStore";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080";
const PROJECT_ASSETS_BUCKET = "project-assets";

export type ProjectPayload = Omit<ProjectRecord, "id">;
export type FeaturedProjectId = ProjectRecord["id"];

export const useProjectStore = defineStore("project", () => {
    const projects = ref<ProjectRecord[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    async function fetchProjects(): Promise<ProjectRecord[]> {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await fetch(`${API_BASE_URL}/api/public/projects`);
            projects.value = await parseResponse<ProjectRecord[]>(response);
            return projects.value;
        } catch (cause) {
            error.value = getErrorMessage(cause);
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
        return project;
    }

    async function updateProject(projectId: string | number, payload: ProjectPayload): Promise<ProjectRecord> {
        const project = await mutate<ProjectRecord>(`/api/projects/${projectId}`, "PUT", payload);
        projects.value = projects.value.map((item) => (String(item.id) === String(project.id) ? project : item));
        return project;
    }

    async function deleteProject(projectId: string | number): Promise<void> {
        await mutate<void>(`/api/projects/${projectId}`, "DELETE");
        projects.value = projects.value.filter((project) => String(project.id) !== String(projectId));
    }

    async function updateFeaturedProjects(projectIds: readonly FeaturedProjectId[]): Promise<ProjectRecord[]> {
        projects.value = await mutate<ProjectRecord[], { projectIds: readonly FeaturedProjectId[] }>(
            "/api/projects/featured",
            "PUT",
            { projectIds },
        );
        return projects.value;
    }

    async function uploadProjectAsset(file: File, directory: string): Promise<string> {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const objectPath = `${directory}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
            .from(PROJECT_ASSETS_BUCKET)
            .upload(objectPath, file, {
                cacheControl: "3600",
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

    return {
        projects,
        isLoading,
        error,
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
