<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AppFooter } from "@/shared/layout";
import {
    ActionButton,
    HeaderSection,
    LanguageButton,
    SecondaryButton,
    StatusToast,
    TextField,
    TextareaField,
    SelectField,
} from "@/shared/ui";
import { backend, database, devops, frontend, language, externalService } from "@/config";
import type { ProjectLocale, ProjectLocalizedContent, ProjectRecord } from "@/config";
import { useProjectStore } from "@/features/projects/stores";
import type { ProjectPayload } from "@/features/projects/stores";

interface LocalizedForm {
    challenges: StructuredItem[];
    description: string;
    descriptionShort: string;
    feasibility: string;
    features: string[];
    projectName: string;
    targetUsers: string;
    whatILearned: StructuredItem[];
}

interface StructuredItem {
    content: string;
    title: string;
}

interface TimelineMilestone {
    date: string;
    description: string;
    title: string;
}

interface TechStackGroup {
    key: TechStackKey;
    label: string;
    options: readonly { icon?: string; label: string }[];
}

type TechStackKey = "language" | "frontend" | "backend" | "database" | "externalService" | "devops";
type ToastStatus = "success" | "warning" | "error";

const PROJECT_DRAFT_STORAGE_KEY = "new-project-draft";
const locale = ref<ProjectLocale>("en");
const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const editingProject = ref<ProjectRecord | null>(null);
const gallery = ref<string[]>(Array.from({ length: 5 }, () => ""));
const galleryFiles = ref<(File | null)[]>(Array.from({ length: 5 }, () => null));
const architectureImage = ref("");
const architectureFile = ref<File | null>(null);
const certificateFile = ref<File | null>(null);
const objectUrls = new Set<string>();
const toast = ref<{ description: string; status: ToastStatus; title: string } | null>(null);
const isSubmitting = ref(false);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;
const editingProjectId = computed(() => (
    typeof route.params.projectId === "string" ? route.params.projectId : ""
));
const isEditing = computed(() => Boolean(editingProjectId.value));

const categories = [
    "Client Project",
    "Senior Project",
    "Internship Project",
    "Personal Project",
    "Open Source",
    "Experimental",
    "Team Project",
    "Startup",
].map((value) => ({ label: value, value }));

const statuses = ["Active", "Completed", "In Progress", "Archived"].map((value) => ({ label: value, value }));
const timelineStatuses = ["Completed", "In Progress", "On Hold"].map((value) => ({ label: value, value }));
const roleOptions = ["User", "Admin", "Guest", "Moderator", "Developer", "Owner"]
    .map((value) => ({ label: value, value }));

const emptyLocalizedForm = (): LocalizedForm => ({
    challenges: [emptyStructuredItem()],
    description: "",
    descriptionShort: "",
    feasibility: "",
    features: Array.from({ length: 8 }, () => ""),
    projectName: "",
    targetUsers: "",
    whatILearned: [emptyStructuredItem()],
});

function emptyStructuredItem(): StructuredItem {
    return { content: "", title: "" };
}

function emptyTimelineMilestone(): TimelineMilestone {
    return { date: "", description: "", title: "" };
}

const form = reactive({
    category: "",
    certificateUrl: "",
    content: {
        en: emptyLocalizedForm(),
        th: emptyLocalizedForm(),
    },
    githubUrl: "",
    figmaUrl: "",
    liveUrl: "",
    websiteUrl: "",
    roles: [] as string[],
    status: "",
    timeline: {
        endDate: "",
        milestones: [emptyTimelineMilestone()],
        startDate: "",
        status: "Completed",
    },
    techStack: {
        language: [] as string[],
        frontend: [] as string[],
        backend: [] as string[],
        database: [] as string[],
        externalService: [] as string[],
        devops: [] as string[],
    },
    youtubeUrl: "",
});

if (!isEditing.value) {
    restoreProjectDraft();
}

watch(
    form,
    () => {
        if (!isEditing.value) {
            saveProjectDraft();
        }
    },
    { deep: true },
);

watch(
    editingProjectId,
    (projectId) => {
        if (projectId) {
            void loadProjectForEditing(projectId);
        }
    },
    { immediate: true },
);

const activeContent = computed(() => form.content[locale.value]);

const techStackGroups: readonly TechStackGroup[] = [
    { key: "language", label: "LANGUAGE", options: language.slice(1) },
    { key: "frontend", label: "FRONTEND", options: frontend.slice(1) },
    { key: "backend", label: "BACKEND", options: backend.slice(1) },
    { key: "database", label: "DATABASE", options: database.slice(1) },
    { key: "externalService", label: "EXTERNAL SERVICE", options: externalService.slice(1) },
    { key: "devops", label: "DEVOPS", options: devops.slice(1) },
];

const overviewMetrics = computed(() => [
    { label: "Core Roles", value: form.roles.length },
    { label: "Challenge Areas", value: countStructuredItems(activeContent.value.challenges) },
    {
        label: "Stack Group",
        value: Object.values(form.techStack).filter((items) => items.length > 0).length,
    },
]);

const availableRoleOptions = computed(() => (
    roleOptions.filter((option) => !form.roles.includes(option.value))
));

function addRole(value: string): void {
    if (value && !form.roles.includes(value)) {
        form.roles.push(value);
    }
}

function removeRole(role: string): void {
    form.roles = form.roles.filter((item) => item !== role);
}

function addStructuredItem(items: StructuredItem[], maxItems = 8): void {
    if (items.length < maxItems) {
        items.push(emptyStructuredItem());
    }
}

function removeStructuredItem(items: StructuredItem[], index: number): void {
    if (items.length === 1) {
        items[0] = emptyStructuredItem();
        return;
    }

    items.splice(index, 1);
}

function addTimelineMilestone(): void {
    if (form.timeline.milestones.length < 6) {
        form.timeline.milestones.push(emptyTimelineMilestone());
    }
}

function removeTimelineMilestone(index: number): void {
    if (form.timeline.milestones.length === 1) {
        form.timeline.milestones[0] = emptyTimelineMilestone();
        return;
    }

    form.timeline.milestones.splice(index, 1);
}

function countStructuredItems(items: StructuredItem[]): number {
    return items.filter((item) => item.title.trim() || item.content.trim()).length;
}

function getStackIcon(group: TechStackGroup, label: string): string {
    return group.options.find((option) => option.label === label)?.icon ?? "";
}

function getAvailableStackOptions(group: TechStackGroup): { label: string; value: string }[] {
    return group.options
        .filter((option) => !form.techStack[group.key].includes(option.label))
        .map((option) => ({ label: option.label, value: option.label }));
}

function addTechStack(value: string, group: TechStackGroup): void {
    if (value && !form.techStack[group.key].includes(value)) {
        form.techStack[group.key].push(value);
    }
}

function removeTechStack(group: TechStackGroup, label: string): void {
    form.techStack[group.key] = form.techStack[group.key].filter((item) => item !== label);
}

function updatePreview(event: Event, target: "architecture" | number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
        return;
    }

    const previewUrl = URL.createObjectURL(file);
    objectUrls.add(previewUrl);

    if (target === "architecture") {
        architectureImage.value = previewUrl;
        architectureFile.value = file;
        return;
    }

    gallery.value[target] = previewUrl;
    galleryFiles.value[target] = file;
}

function updateCertificate(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
        return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
        input.value = "";
        showToast("Unsupported certificate file", "Please select a PDF, PNG, JPG, or WebP file.", "warning");
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        input.value = "";
        showToast("Certificate file is too large", "Please select a file smaller than 10 MB.", "warning");
        return;
    }

    certificateFile.value = file;
}

function removeCertificate(): void {
    certificateFile.value = null;
    form.certificateUrl = "";

    const input = document.getElementById("certificate-file") as HTMLInputElement | null;
    if (input) {
        input.value = "";
    }
}

function openFilePicker(inputId: string): void {
    document.getElementById(inputId)?.click();
}

function openFilePickerOnKeydown(event: KeyboardEvent, inputId: string): void {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFilePicker(inputId);
    }
}

async function handleSubmit(): Promise<void> {
    if (isSubmitting.value) {
        return;
    }

    closeToast();

    try {
        const slug = createSlug(form.content.en.projectName || form.content.th.projectName);

        if (!slug) {
            showToast("Missing project name", "Please enter the project name before adding the project.", "warning");
            return;
        }

        if (!form.category || !form.status) {
            showToast("Missing project details", "Please select the project category and status.", "warning");
            return;
        }

        if (
            !form.content.en.projectName.trim() ||
            !form.content.th.projectName.trim() ||
            !form.content.en.descriptionShort.trim() ||
            !form.content.th.descriptionShort.trim()
        ) {
            showToast(
                "Incomplete bilingual content",
                "Please enter the project name and short description in both EN and TH.",
                "warning",
            );
            return;
        }

        isSubmitting.value = true;
        const directory = `${slug}-${Date.now()}`;
        const galleryUrls = (await Promise.all(
            gallery.value.map(async (existingUrl, index) => {
                const file = galleryFiles.value[index];

                return file
                    ? projectStore.uploadProjectAsset(file, `${directory}/gallery`)
                    : existingUrl;
            }),
        )).filter(Boolean);

        const architectureUrl = architectureFile.value
            ? await projectStore.uploadProjectAsset(architectureFile.value, `${directory}/architecture`)
            : architectureImage.value;

        const certificateUrl = certificateFile.value
            ? await projectStore.uploadProjectAsset(certificateFile.value, `${directory}/certificate`)
            : form.certificateUrl;

        const payload = createPayload(slug, galleryUrls, architectureUrl, certificateUrl);
        const project = isEditing.value
            ? await projectStore.updateProject(editingProjectId.value, payload)
            : await projectStore.createProject(payload);

        if (!isEditing.value) {
            localStorage.removeItem(PROJECT_DRAFT_STORAGE_KEY);
        }

        showToast(
            isEditing.value ? "Project updated" : "Project added",
            isEditing.value
                ? "The project has been updated successfully."
                : "The project has been added successfully.",
            "success",
        );
        await new Promise((resolve) => setTimeout(resolve, 800));
        await router.push({ name: "project-detail", params: { projectId: project.id } });
    } catch (cause) {
        showToast(
            isEditing.value ? "Unable to update project" : "Unable to add project",
            cause instanceof Error ? cause.message : "Please try again.",
            "error",
        );
    } finally {
        isSubmitting.value = false;
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

function createPayload(slug: string, galleryUrls: string[], architectureUrl: string, certificateUrl: string): ProjectPayload {
    const stackGroups = ["frontend", "backend", "database"] as const;

    return {
        architectureImage: architectureUrl,
        category: form.category,
        content: {
            en: cleanLocalizedContent(form.content.en),
            th: cleanLocalizedContent(form.content.th),
        },
        featured: editingProject.value?.featured ?? false,
        featuredOrder: editingProject.value?.featuredOrder ?? null,
        gallery: galleryUrls,
        links: [
            ...(form.githubUrl ? [{ type: "github" as const, url: form.githubUrl }] : []),
            ...(form.youtubeUrl ? [{ type: "youtube" as const, url: form.youtubeUrl }] : []),
            ...(certificateUrl ? [{ type: "certificate" as const, url: certificateUrl }] : []),
            ...(form.figmaUrl ? [{ type: "figma" as const, url: form.figmaUrl }] : []),
            ...(form.liveUrl ? [{ type: "live" as const, url: form.liveUrl }] : []),
            ...(form.websiteUrl ? [{ type: "website" as const, url: form.websiteUrl }] : []),
        ],
        overview: {
            challengeAreas: Math.max(
                countStructuredItems(form.content.en.challenges),
                countStructuredItems(form.content.th.challenges),
            ),
            coreRoles: form.roles.length,
            stackGroup: Object.values(form.techStack).filter((items) => items.length > 0).length,
        },
        roles: form.roles,
        slug,
        stack: [
            form.techStack.frontend[0],
            form.techStack.backend[0],
            form.techStack.database[0],
        ].filter((item): item is string => Boolean(item)),
        stackGroups,
        status: form.status as ProjectPayload["status"],
        techStack: {
            backend: form.techStack.backend,
            database: form.techStack.database,
            devops: form.techStack.devops,
            externalService: form.techStack.externalService,
            frontend: form.techStack.frontend,
            language: form.techStack.language,
        },
        timeline: {
            endDate: form.timeline.endDate,
            milestones: form.timeline.milestones
                .map((milestone) => ({
                    date: milestone.date,
                    description: milestone.description.trim(),
                    title: milestone.title.trim(),
                }))
                .filter((milestone) => milestone.date && milestone.title),
            startDate: form.timeline.startDate,
            status: form.timeline.status as ProjectPayload["timeline"]["status"],
        },
    };
}

function cleanLocalizedContent(content: LocalizedForm): LocalizedForm {
    return {
        ...content,
        features: content.features.filter((feature) => feature.trim()),
        challenges: cleanStructuredItems(content.challenges),
        whatILearned: cleanStructuredItems(content.whatILearned),
    };
}

function cleanStructuredItems(items: StructuredItem[]): StructuredItem[] {
    return items
        .map((item) => ({ content: item.content.trim(), title: item.title.trim() }))
        .filter((item) => item.title || item.content);
}

function createSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9ก-๙]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function restoreProjectDraft(): void {
    const draft = localStorage.getItem(PROJECT_DRAFT_STORAGE_KEY);

    if (!draft) {
        return;
    }

    try {
        Object.assign(form, JSON.parse(draft));
    } catch {
        localStorage.removeItem(PROJECT_DRAFT_STORAGE_KEY);
    }
}

function saveProjectDraft(): void {
    localStorage.setItem(PROJECT_DRAFT_STORAGE_KEY, JSON.stringify(form));
}

async function loadProjectForEditing(projectId: string): Promise<void> {
    try {
        const project = await projectStore.fetchProject(projectId);
        editingProject.value = project;
        populateForm(project);
    } catch (cause) {
        showToast(
            "Unable to load project",
            cause instanceof Error ? cause.message : "Please try again.",
            "error",
        );
    }
}

function populateForm(project: ProjectRecord): void {
    form.category = project.category;
    form.certificateUrl = project.links.find((link) => link.type === "certificate")?.url ?? "";
    form.content.en = createEditableLocalizedContent(project.content.en);
    form.content.th = createEditableLocalizedContent(project.content.th);
    form.figmaUrl = project.links.find((link) => link.type === "figma")?.url ?? "";
    form.githubUrl = project.links.find((link) => link.type === "github")?.url ?? "";
    form.liveUrl = project.links.find((link) => link.type === "live")?.url ?? "";
    form.websiteUrl = project.links.find((link) => link.type === "website")?.url ?? "";
    form.roles = [...project.roles];
    form.status = project.status;
    form.timeline.endDate = project.timeline?.endDate ?? "";
    form.timeline.milestones = project.timeline?.milestones.length
        ? project.timeline.milestones.map((milestone) => ({ ...milestone }))
        : [emptyTimelineMilestone()];
    form.timeline.startDate = project.timeline?.startDate ?? "";
    form.timeline.status = project.timeline?.status ?? "Completed";
    form.techStack.backend = [...project.techStack.backend];
    form.techStack.database = [...project.techStack.database];
    form.techStack.devops = [...project.techStack.devops];
    form.techStack.externalService = [...project.techStack.externalService];
    form.techStack.frontend = [...project.techStack.frontend];
    form.techStack.language = [...project.techStack.language];
    form.youtubeUrl = project.links.find((link) => link.type === "youtube")?.url ?? "";
    gallery.value = Array.from({ length: 5 }, (_, index) => project.gallery[index] ?? "");
    galleryFiles.value = Array.from({ length: 5 }, () => null);
    architectureImage.value = project.architectureImage;
    architectureFile.value = null;
    certificateFile.value = null;
}

function createEditableLocalizedContent(content: ProjectLocalizedContent): LocalizedForm {
    return {
        ...content,
        challenges: content.challenges.length
            ? content.challenges.map((item) => ({ ...item }))
            : [emptyStructuredItem()],
        features: Array.from({ length: 8 }, (_, index) => content.features[index] ?? ""),
        whatILearned: content.whatILearned.length
            ? content.whatILearned.map((item) => ({ ...item }))
            : [emptyStructuredItem()],
    };
}

onUnmounted(() => {
    closeToast();
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
});
</script>

<template>
    <main :class="$style.newProject" class="pt-22">
        <div v-if="toast" :class="$style.toastViewport">
            <StatusToast
                :title="toast.title"
                :description="toast.description"
                :status="toast.status"
                @close="closeToast"
            />
        </div>
        <form :class="$style.pageContainer" @submit.prevent="handleSubmit">
            <HeaderSection :title="isEditing ? 'EDIT PROJECT' : 'NEW PROJECTS'" />

            <nav :class="$style.detailNav" aria-label="New project navigation">
                <RouterLink to="/projects" :class="$style.projectsLink" class="type-button-r">
                    PROJECTS
                </RouterLink>
                <LanguageButton v-model="locale" />
            </nav>

            <section :class="$style.basicSelectors" aria-label="Project classification">
                <SelectField v-model="form.category" label="Category" :options="categories" />
                <SelectField v-model="form.status" label="Status" :options="statuses" />
            </section>

            <section :class="$style.gallery" aria-label="Project gallery">
                <div
                    :class="[$style.uploadSlot, $style.mainUpload]"
                    role="button"
                    tabindex="0"
                    aria-label="Add main project image"
                    @click="openFilePicker('gallery-image-0')"
                    @keydown="openFilePickerOnKeydown($event, 'gallery-image-0')"
                >
                    <img v-if="gallery[0]" :class="$style.previewImage" :src="gallery[0]" alt="Main project preview">
                    <ActionButton
                        variant="add"
                        aria-hidden="true"
                        tabindex="-1"
                    />
                    <input id="gallery-image-0" type="file" accept="image/*" @change="updatePreview($event, 0)">
                </div>
                <div :class="$style.thumbnailGrid">
                    <div
                        v-for="index in 4"
                        :key="index"
                        :class="[$style.uploadSlot, $style.thumbnailUpload]"
                        role="button"
                        tabindex="0"
                        :aria-label="`Add project thumbnail ${index}`"
                        @click="openFilePicker(`gallery-image-${index}`)"
                        @keydown="openFilePickerOnKeydown($event, `gallery-image-${index}`)"
                    >
                        <img
                            v-if="gallery[index]"
                            :class="$style.previewImage"
                            :src="gallery[index]"
                            :alt="`Project thumbnail ${index}`"
                        >
                        <ActionButton
                            variant="add"
                            aria-hidden="true"
                            tabindex="-1"
                        />
                        <input
                            :id="`gallery-image-${index}`"
                            type="file"
                            accept="image/*"
                            @change="updatePreview($event, index)"
                        >
                    </div>
                </div>
            </section>

            <section :class="$style.descriptionPanel">
                <TextField v-model="activeContent.projectName" label="Project Name" />
                <hr :class="$style.panelDivider">
                <TextField v-model="activeContent.descriptionShort" label="Description Short" />
                <TextareaField v-model="activeContent.description" label="Project Description" :rows="6" />
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
                            <div :class="$style.roleSelector">
                                <SelectField
                                    label="Core Roles"
                                    :options="availableRoleOptions"
                                    placeholder="Select role"
                                    tone="dark"
                                    @select="addRole"
                                />
                                <div v-if="form.roles.length" :class="$style.roleChips">
                                    <button
                                        v-for="role in form.roles"
                                        :key="role"
                                        type="button"
                                        :class="$style.roleChip"
                                        :aria-label="`Remove ${role}`"
                                        @click="removeRole(role)"
                                    >
                                        {{ role }}
                                    </button>
                                </div>
                            </div>
                            <div :class="$style.timelineEditor">
                                <span class="type-caption-sb">PROJECT TIMELINE</span>
                                <div :class="$style.timelineSummaryFields">
                                    <TextField v-model="form.timeline.startDate" label="Start Month" type="month" />
                                    <TextField v-model="form.timeline.endDate" label="End Month" type="month" />
                                    <SelectField
                                        v-model="form.timeline.status"
                                        label="Timeline Status"
                                        :options="timelineStatuses"
                                        tone="dark"
                                    />
                                </div>
                                <div :class="$style.timelineMilestones">
                                    <div
                                        v-for="(milestone, index) in form.timeline.milestones"
                                        :key="index"
                                        :class="$style.timelineMilestone"
                                    >
                                        <div :class="$style.structuredItemHeader">
                                            <span class="type-overline-sb">Milestone {{ index + 1 }}</span>
                                            <ActionButton
                                                variant="delete"
                                                :aria-label="`Remove milestone ${index + 1}`"
                                                @click="removeTimelineMilestone(index)"
                                            />
                                        </div>
                                        <TextField v-model="milestone.date" label="Month" type="month" />
                                        <TextField v-model="milestone.title" label="Title" />
                                        <TextareaField v-model="milestone.description" label="Description" :rows="3" />
                                    </div>
                                    <ActionButton
                                        v-if="form.timeline.milestones.length < 6"
                                        variant="add"
                                        aria-label="Add milestone"
                                        @click="addTimelineMilestone"
                                    />
                                </div>
                            </div>
                            <TextareaField v-model="activeContent.targetUsers" label="Target Users" :rows="4" />
                            <TextareaField v-model="activeContent.feasibility" label="Feasibility" :rows="4" />
                        </div>
                        <div :class="$style.featureFields">
                            <TextField
                                v-for="(_, index) in activeContent.features"
                                :key="index"
                                v-model="activeContent.features[index]"
                                :label="`Feature ${index + 1}`"
                            />
                        </div>
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
                        <div :class="$style.roleSelector">
                            <SelectField
                                label="Core Roles"
                                :options="availableRoleOptions"
                                placeholder="Select role"
                                tone="dark"
                                @select="addRole"
                            />
                            <div v-if="form.roles.length" :class="$style.roleChips">
                                <button
                                    v-for="role in form.roles"
                                    :key="role"
                                    type="button"
                                    :class="$style.roleChip"
                                    :aria-label="`Remove ${role}`"
                                    @click="removeRole(role)"
                                >
                                    {{ role }}
                                </button>
                            </div>
                        </div>
                        <div :class="$style.timelineEditor">
                            <span class="type-caption-sb">PROJECT TIMELINE</span>
                            <div :class="$style.timelineSummaryFields">
                                <TextField v-model="form.timeline.startDate" label="Start Month" type="month" />
                                <TextField v-model="form.timeline.endDate" label="End Month" type="month" />
                                <SelectField
                                    v-model="form.timeline.status"
                                    label="Timeline Status"
                                    :options="timelineStatuses"
                                    tone="dark"
                                />
                            </div>
                            <div :class="$style.timelineMilestones">
                                <div
                                    v-for="(milestone, index) in form.timeline.milestones"
                                    :key="index"
                                    :class="$style.timelineMilestone"
                                >
                                    <div :class="$style.structuredItemHeader">
                                        <span class="type-overline-sb">Milestone {{ index + 1 }}</span>
                                        <ActionButton
                                            variant="delete"
                                            :aria-label="`Remove milestone ${index + 1}`"
                                            @click="removeTimelineMilestone(index)"
                                        />
                                    </div>
                                    <TextField v-model="milestone.date" label="Month" type="month" />
                                    <TextField v-model="milestone.title" label="Title" />
                                    <TextareaField v-model="milestone.description" label="Description" :rows="3" />
                                </div>
                                <ActionButton
                                    v-if="form.timeline.milestones.length < 6"
                                    variant="add"
                                    aria-label="Add milestone"
                                    @click="addTimelineMilestone"
                                />
                            </div>
                        </div>
                        <TextareaField v-model="activeContent.targetUsers" label="Target Users" :rows="4" />
                        <TextareaField v-model="activeContent.feasibility" label="Feasibility" :rows="4" />
                    </div>
                </article>
                <article :class="[$style.tabPanel, $style.rightPanel]">
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">FEATURES</h2>
                    <div :class="[$style.panelBody, $style.rightPanelBody]">
                        <hr :class="$style.panelDivider">
                        <div :class="$style.featureFields">
                            <TextField
                                v-for="(_, index) in activeContent.features"
                                :key="index"
                                v-model="activeContent.features[index]"
                                :label="`Feature ${index + 1}`"
                            />
                        </div>
                    </div>
                </article>
            </section>

            <section :class="$style.desktopArchitectureStack" aria-label="Project architecture and tech stack">
                <div :class="$style.combinedTabs">
                    <h2 :class="$style.panelTab" class="type-button-sb">SYSTEM ARCHITECTURE</h2>
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">TECH STACK</h2>
                </div>
                <div :class="$style.architectureStackBody">
                    <hr :class="$style.panelDivider">
                    <div :class="$style.architectureColumns">
                        <div
                            :class="[$style.uploadSlot, $style.architectureUpload]"
                            role="button"
                            tabindex="0"
                            aria-label="Add system architecture image"
                            @click="openFilePicker('architecture-image-desktop')"
                            @keydown="openFilePickerOnKeydown($event, 'architecture-image-desktop')"
                        >
                            <img v-if="architectureImage" :class="$style.previewImage" :src="architectureImage" alt="Architecture preview">
                            <ActionButton
                                variant="add"
                                aria-hidden="true"
                                tabindex="-1"
                            />
                            <input
                                id="architecture-image-desktop"
                                type="file"
                                accept="image/*"
                                @change="updatePreview($event, 'architecture')"
                            >
                        </div>
                        <div :class="$style.techStackGroups">
                            <section v-for="group in techStackGroups" :key="group.key" :class="$style.techStackGroup">
                                <SelectField
                                    :label="group.label"
                                    :options="getAvailableStackOptions(group)"
                                    placeholder="Select"
                                    tone="dark"
                                    @select="addTechStack($event, group)"
                                />
                                <div v-if="form.techStack[group.key].length" :class="$style.techStackItems">
                                    <button
                                        v-for="item in form.techStack[group.key]"
                                        :key="item"
                                        type="button"
                                        :class="$style.techStackChip"
                                        :aria-label="`Remove ${item}`"
                                        :title="`Remove ${item}`"
                                        @click="removeTechStack(group, item)"
                                    >
                                        <img v-if="getStackIcon(group, item)" :src="getStackIcon(group, item)" :alt="item">
                                        <span v-else>{{ item }}</span>
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </section>

            <section :class="$style.mobileArchitectureStack" aria-label="Project architecture and tech stack">
                <article :class="$style.tabPanel">
                    <h2 :class="$style.panelTab" class="type-button-sb">SYSTEM ARCHITECTURE</h2>
                    <div :class="$style.panelBody">
                        <hr :class="$style.panelDivider">
                        <div
                            :class="[$style.uploadSlot, $style.mobileArchitectureUpload]"
                            role="button"
                            tabindex="0"
                            aria-label="Add system architecture image"
                            @click="openFilePicker('architecture-image-mobile')"
                            @keydown="openFilePickerOnKeydown($event, 'architecture-image-mobile')"
                        >
                            <img v-if="architectureImage" :class="$style.previewImage" :src="architectureImage" alt="Architecture preview">
                            <ActionButton
                                variant="add"
                                aria-hidden="true"
                                tabindex="-1"
                            />
                            <input
                                id="architecture-image-mobile"
                                type="file"
                                accept="image/*"
                                @change="updatePreview($event, 'architecture')"
                            >
                        </div>
                    </div>
                </article>
                <article :class="[$style.tabPanel, $style.rightPanel]">
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">TECH STACK</h2>
                    <div :class="[$style.panelBody, $style.rightPanelBody]">
                        <hr :class="$style.panelDivider">
                        <div :class="$style.techStackGroups">
                            <section v-for="group in techStackGroups" :key="group.key" :class="$style.techStackGroup">
                                <SelectField
                                    :label="group.label"
                                    :options="getAvailableStackOptions(group)"
                                    placeholder="Select"
                                    tone="dark"
                                    @select="addTechStack($event, group)"
                                />
                                <div v-if="form.techStack[group.key].length" :class="$style.techStackItems">
                                    <button
                                        v-for="item in form.techStack[group.key]"
                                        :key="item"
                                        type="button"
                                        :class="$style.techStackChip"
                                        :aria-label="`Remove ${item}`"
                                        @click="removeTechStack(group, item)"
                                    >
                                        <img v-if="getStackIcon(group, item)" :src="getStackIcon(group, item)" :alt="item">
                                        <span v-else>{{ item }}</span>
                                    </button>
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
                        <div :class="$style.structuredFields">
                            <div v-for="(challenge, index) in activeContent.challenges" :key="index" :class="$style.structuredItem">
                                <div :class="$style.structuredItemHeader">
                                    <span class="type-overline-sb">Challenge {{ index + 1 }}</span>
                                    <ActionButton variant="delete" :aria-label="`Remove challenge ${index + 1}`" @click="removeStructuredItem(activeContent.challenges, index)" />
                                </div>
                                <TextField v-model="challenge.title" label="Title" />
                                <TextareaField v-model="challenge.content" label="Content" :rows="4" />
                            </div>
                            <ActionButton variant="add" aria-label="Add challenge" @click="addStructuredItem(activeContent.challenges)" />
                        </div>
                        <div :class="$style.structuredFields">
                            <div v-for="(lesson, index) in activeContent.whatILearned" :key="index" :class="$style.structuredItem">
                                <div :class="$style.structuredItemHeader">
                                    <span class="type-overline-sb">Lesson {{ index + 1 }}</span>
                                    <ActionButton variant="delete" :aria-label="`Remove lesson ${index + 1}`" @click="removeStructuredItem(activeContent.whatILearned, index)" />
                                </div>
                                <TextField v-model="lesson.title" label="Title" />
                                <TextareaField v-model="lesson.content" label="Content" :rows="4" />
                            </div>
                            <ActionButton v-if="activeContent.whatILearned.length < 8" variant="add" aria-label="Add lesson" @click="addStructuredItem(activeContent.whatILearned)" />
                        </div>
                    </div>
                </div>
            </section>

            <section :class="$style.mobileChallengesLearned" aria-label="Project challenges and lessons learned">
                <article :class="$style.tabPanel">
                    <h2 :class="$style.panelTab" class="type-button-sb">CHALLENGES</h2>
                    <div :class="$style.panelBody">
                        <hr :class="$style.panelDivider">
                        <div :class="$style.structuredFields">
                            <div v-for="(challenge, index) in activeContent.challenges" :key="index" :class="$style.structuredItem">
                                <div :class="$style.structuredItemHeader">
                                    <span class="type-overline-sb">Challenge {{ index + 1 }}</span>
                                    <ActionButton variant="delete" :aria-label="`Remove challenge ${index + 1}`" @click="removeStructuredItem(activeContent.challenges, index)" />
                                </div>
                                <TextField v-model="challenge.title" label="Title" />
                                <TextareaField v-model="challenge.content" label="Content" :rows="4" />
                            </div>
                            <ActionButton variant="add" aria-label="Add challenge" @click="addStructuredItem(activeContent.challenges)" />
                        </div>
                    </div>
                </article>
                <article :class="[$style.tabPanel, $style.rightPanel]">
                    <h2 :class="[$style.panelTab, $style.rightTab]" class="type-button-sb">WHAT I LEARNED</h2>
                    <div :class="[$style.panelBody, $style.rightPanelBody]">
                        <hr :class="$style.panelDivider">
                        <div :class="$style.structuredFields">
                            <div v-for="(lesson, index) in activeContent.whatILearned" :key="index" :class="$style.structuredItem">
                                <div :class="$style.structuredItemHeader">
                                    <span class="type-overline-sb">Lesson {{ index + 1 }}</span>
                                    <ActionButton variant="delete" :aria-label="`Remove lesson ${index + 1}`" @click="removeStructuredItem(activeContent.whatILearned, index)" />
                                </div>
                                <TextField v-model="lesson.title" label="Title" />
                                <TextareaField v-model="lesson.content" label="Content" :rows="4" />
                            </div>
                            <ActionButton v-if="activeContent.whatILearned.length < 8" variant="add" aria-label="Add lesson" @click="addStructuredItem(activeContent.whatILearned)" />
                        </div>
                    </div>
                </article>
            </section>

            <section :class="$style.linkPanel" aria-label="Project links">
                <h2 :class="$style.panelTab" class="type-button-sb">LINK</h2>
                <div :class="$style.linkBody">
                    <hr :class="$style.panelDivider">
                    <div :class="$style.linkFields">
                        <TextField v-model="form.githubUrl" label="Github" placeholder="https://github.com/..." type="url" />
                        <TextField v-model="form.youtubeUrl" label="Youtube" placeholder="https://youtube.com/..." type="url" />
                        <TextField v-model="form.figmaUrl" label="Figma" placeholder="https://figma.com/..." type="url" />
                        <TextField v-model="form.liveUrl" label="Live Demo" placeholder="https://..." type="url" />
                        <TextField v-model="form.websiteUrl" label="Website" placeholder="https://..." type="url" />
                        <div :class="$style.certificateField">
                            <span class="type-overline-r">Certificate</span>
                            <div :class="$style.certificateControl">
                                <button
                                    type="button"
                                    :class="$style.certificatePicker"
                                    class="type-caption-r"
                                    @click="openFilePicker('certificate-file')"
                                >
                                    {{ certificateFile?.name || (form.certificateUrl ? "Certificate uploaded" : "Choose PDF or image") }}
                                </button>
                                <button
                                    v-if="certificateFile || form.certificateUrl"
                                    type="button"
                                    :class="$style.certificateRemove"
                                    class="type-overline-sb"
                                    aria-label="Remove certificate"
                                    @click="removeCertificate"
                                >
                                    REMOVE
                                </button>
                                <input
                                    id="certificate-file"
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                                    @change="updateCertificate"
                                >
                            </div>
                            <span class="type-overline-r">PDF, PNG, JPG, or WebP. Maximum 10 MB.</span>
                        </div>
                    </div>
                </div>
            </section>

            <div :class="$style.submitRow">
                <SecondaryButton type="submit" :disabled="isSubmitting">
                    {{ isSubmitting ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update" : "Add") }}
                </SecondaryButton>
            </div>
        </form>
        <AppFooter />
    </main>
</template>

<style module>
.newProject {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    min-height: 100dvh;
    gap: var(--spacing-space-16);
    overflow-y: auto;
    scrollbar-width: none;
}

.newProject::-webkit-scrollbar {
    display: none;
}

.pageContainer {
    display: flex;
    flex: 1;
    flex-direction: column;
    width: min(calc(100% - (var(--spacing-space-16) * 2)), 1133px);
    margin: 0 auto;
    gap: var(--spacing-space-6);
}

.detailNav,
.basicSelectors {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    gap: var(--spacing-space-5);
}

.projectsLink {
    padding: 8px 10px;
    border-radius: var(--radius-lg);
    background-color: var(--color-main-secondary);
    color: var(--color-button-secondary-btn-text);
    text-decoration: none;
}

.basicSelectors {
    justify-content: flex-start;
}

.basicSelectors > * {
    width: 295px;
}

.gallery {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 189px;
    gap: var(--spacing-space-6);
}

.thumbnailGrid {
    display: grid;
    grid-template-rows: repeat(4, auto);
    align-content: space-between;
    gap: var(--spacing-space-6);
}

.uploadSlot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background-color: var(--color-text-secondary);
    cursor: pointer;
}

.uploadSlot input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
}

.uploadSlot :global(button) {
    z-index: 1;
    pointer-events: none;
}

.mainUpload,
.architectureUpload,
.mobileArchitectureUpload {
    border-radius: var(--radius-2xl);
}

.mainUpload,
.thumbnailUpload,
.architectureUpload,
.mobileArchitectureUpload {
    aspect-ratio: 16 / 9;
}

.architectureUpload,
.mobileArchitectureUpload {
    aspect-ratio: 1980 / 1080;
}

.thumbnailUpload {
    border-radius: var(--radius-base);
}

.previewImage {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.descriptionPanel,
.overviewFeaturesBody,
.architectureStackBody,
.challengesLearnedBody,
.linkBody,
.panelBody {
    box-sizing: border-box;
    padding: var(--spacing-space-4);
    gap: 10px;
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.descriptionPanel,
.overviewFeaturesBody,
.architectureStackBody,
.challengesLearnedBody,
.linkBody,
.panelBody {
    display: flex;
    flex-direction: column;
}

.descriptionPanel :global(label),
.overviewFeaturesBody :global(label),
.architectureStackBody :global(label),
.challengesLearnedBody :global(label),
.linkBody :global(label),
.panelBody :global(label) {
    color: var(--color-text-secondary);
}

.panelDivider {
    width: 100%;
    height: 1px;
    margin: 0;
    border: 0;
    border-top: 1px solid var(--color-main-divider);
}

.desktopOverviewFeatures,
.desktopArchitectureStack,
.desktopChallengesLearned,
.linkPanel,
.tabPanel {
    display: flex;
    flex-direction: column;
}

.mobileOverviewFeatures,
.mobileArchitectureStack,
.mobileChallengesLearned {
    display: none;
}

.combinedTabs {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
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

.overviewFeaturesBody,
.architectureStackBody,
.challengesLearnedBody {
    border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
}

.overviewFeaturesColumns,
.challengesLearnedColumns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-space-8);
}

.overviewColumn,
.featureFields,
.lessonFields,
.structuredFields,
.techStackGroups {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.roleSelector,
.structuredItem,
.timelineEditor,
.timelineMilestones,
.timelineMilestone {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.timelineEditor {
    padding: 10px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
}

.timelineSummaryFields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}

.timelineSummaryFields > :last-child {
    grid-column: 1 / -1;
}

.timelineMilestone {
    padding: 10px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
}

.roleChips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.roleChip {
    padding: 6px 10px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
    background-color: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
}

.roleChip:hover {
    border-color: var(--color-main-primary);
}

.structuredFields {
    align-items: flex-start;
}

.structuredItem {
    box-sizing: border-box;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
}

.structuredItemHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.featureFields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-content: start;
    gap: var(--spacing-space-5) 10px;
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
    color: var(--color-text-secondary);
    text-align: center;
}

.metricValue {
    font-size: 2.25rem;
    line-height: 1.2;
}

.architectureStackBody {
    min-height: 0;
}

.architectureColumns {
    display: grid;
    grid-template-columns: minmax(0, 1.85fr) minmax(300px, 1fr);
    flex: 1;
    min-height: 0;
    gap: var(--spacing-space-8);
}

.architectureUpload {
    align-self: start;
}

.techStackGroups {
    justify-content: center;
    gap: var(--spacing-space-4);
}

.techStackGroup {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 6px;
}

.techStackItems {
    display: flex;
    align-items: center;
    min-height: 36px;
    padding: 4px 10px;
    gap: 6px;
    overflow-x: auto;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-full);
    scrollbar-width: none;
}

.techStackItems::-webkit-scrollbar {
    display: none;
}

.techStackChip {
    display: inline-flex;
    align-items: center;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
}

.techStackChip img {
    width: 24px;
    height: 24px;
    object-fit: contain;
}

.linkBody {
    border-radius: 0 var(--radius-2xl) var(--radius-2xl) var(--radius-2xl);
}

.linkFields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.certificateField {
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: var(--color-text-input);
}

.certificateControl {
    position: relative;
    display: flex;
    min-height: 48px;
    align-items: center;
    gap: 8px;
}

.certificateControl input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
}

.certificatePicker,
.certificateRemove {
    border: 0;
    cursor: pointer;
}

.certificatePicker {
    flex: 1;
    min-width: 0;
    height: 48px;
    overflow: hidden;
    padding: 0 14px;
    border-radius: var(--radius-lg);
    background-color: var(--color-text-secondary);
    color: var(--color-text-input);
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.certificateRemove {
    padding: 8px;
    border-radius: var(--radius-base);
    background-color: transparent;
    color: var(--color-status-error);
}

.certificatePicker:focus-visible,
.certificateRemove:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.submitRow {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
}

.toastViewport {
    position: fixed;
    bottom: 25dvh;
    right: var(--spacing-space-4);
    z-index: 30;
    width: min(calc(100% - (var(--spacing-space-4) * 2)), 420px);
}

@media (max-width: 767px) {
    .newProject {
        gap: var(--spacing-space-8);
    }

    .pageContainer {
        width: min(calc(100% - (var(--spacing-space-4) * 2)), 408px);
    }

    .basicSelectors {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
    }

    .basicSelectors > * {
        width: auto;
    }

    .gallery {
        display: flex;
        flex-direction: column;
        height: auto;
    }

    .mainUpload {
        height: auto;
    }

    .thumbnailGrid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        grid-template-rows: 72px;
        gap: var(--spacing-space-5);
    }

    .thumbnailUpload {
        height: auto;
    }

    .thumbnailUpload:nth-child(4) {
        display: none;
    }

    .desktopOverviewFeatures,
    .desktopArchitectureStack,
    .desktopChallengesLearned {
        display: none;
    }

    .mobileOverviewFeatures,
    .mobileArchitectureStack,
    .mobileChallengesLearned {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-space-6);
    }

    .panelBody {
        border-top-left-radius: 0;
    }

    .rightPanelBody {
        border-top-left-radius: var(--radius-2xl);
        border-top-right-radius: 0;
    }

    .featureFields,
    .linkFields {
        grid-template-columns: 1fr;
    }

    .mobileArchitectureUpload {
        height: auto;
    }

    .techStackGroups {
        gap: var(--spacing-space-5);
    }
}
</style>
