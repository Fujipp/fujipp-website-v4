<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AppFooter } from "@/shared/layout";
import { ActionButton, PrimaryButton } from "@/shared/ui/buttons";
import { SelectField, TextareaField, TextField } from "@/shared/ui/fields";
import { backend, database, devops, frontend, language, externalService, getIconColorMode, icons } from "@/config";
import type { ProjectLocale, ProjectLocalizedContent, ProjectRecord } from "@/config";
import { useProjectStore } from "@/features/projects/stores";
import type { ProjectPayload } from "@/features/projects/stores";
import { useToastStore } from "@/stores";

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
const toastStore = useToastStore();
const isSubmitting = ref(false);
const editingProjectId = computed(() => (
    typeof route.params.projectId === "string" ? route.params.projectId : ""
));
const isEditing = computed(() => Boolean(editingProjectId.value));

/* Icon-only Back on mobile: drop the label slot so PrimaryButton renders square. */
const mobileQuery = typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)") : null;
const isMobile = ref(mobileQuery?.matches ?? false);

function handleMobileChange(event: MediaQueryListEvent): void {
    isMobile.value = event.matches;
}

mobileQuery?.addEventListener("change", handleMobileChange);

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
const roleOptions = [
    "Full Stack Engineer",
    "Frontend Engineer",
    "Backend Engineer",
    "UI/UX Specialist",
    "Database Architect",
    "System Architect",
    "DevOps Engineer",
    "Project Manager",
    "Quality Assurance Engineer",
]
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
    { key: "language", label: "Language", options: language.slice(1) },
    { key: "frontend", label: "Frontend", options: frontend.slice(1) },
    { key: "backend", label: "Backend", options: backend.slice(1) },
    { key: "database", label: "Database", options: database.slice(1) },
    { key: "externalService", label: "External Service", options: externalService.slice(1) },
    { key: "devops", label: "DevOps", options: devops.slice(1) },
];

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

function addFeature(): void {
    if (activeContent.value.features.length < 8) {
        activeContent.value.features.push("");
    }
}

function removeFeature(index: number): void {
    const features = activeContent.value.features;

    if (features.length === 1) {
        features[0] = "";
        return;
    }

    features.splice(index, 1);
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

function countStructuredItems(items: StructuredItem[]): number {
    return items.filter((item) => item.title.trim() || item.content.trim()).length;
}

function getStackIcon(group: TechStackGroup, label: string): string {
    return group.options.find((option) => option.label === label)?.icon ?? "";
}

function isOriginalColorIcon(icon: string): boolean {
    return getIconColorMode(icon) === "original";
}

function iconMaskStyle(icon: string): Record<string, string> {
    return { "--stack-icon-src": `url(${icon})` };
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

function removeGalleryImage(index: number): void {
    gallery.value[index] = "";
    galleryFiles.value[index] = null;

    const input = document.getElementById(`gallery-image-${index}`) as HTMLInputElement | null;
    if (input) {
        input.value = "";
    }
}

function moveGalleryImage(index: number, direction: -1 | 1): void {
    const target = index + direction;

    if (target < 0 || target >= gallery.value.length) {
        return;
    }

    [gallery.value[index], gallery.value[target]] = [gallery.value[target]!, gallery.value[index]!];
    [galleryFiles.value[index], galleryFiles.value[target]] = [galleryFiles.value[target]!, galleryFiles.value[index]!];
}

function removeArchitectureImage(): void {
    architectureImage.value = "";
    architectureFile.value = null;

    const input = document.getElementById("architecture-image") as HTMLInputElement | null;
    if (input) {
        input.value = "";
    }
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
    toastStore.show(title, description, status);
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
        features: content.features.length
            ? content.features.map((feature) => feature)
            : [""],
        whatILearned: content.whatILearned.length
            ? content.whatILearned.map((item) => ({ ...item }))
            : [emptyStructuredItem()],
    };
}

onUnmounted(() => {
    mobileQuery?.removeEventListener("change", handleMobileChange);
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
});
</script>

<template>
    <main :class="$style.newProject" class="pt-16">
            <form :class="$style.pageContainer" @submit.prevent="handleSubmit">
            <div :class="$style.section">
                <div :class="$style.headRow">
                    <PrimaryButton
                        v-if="isMobile"
                        width-mode="hug"
                        :leading-icon="icons.arrowBack"
                        to="/projects"
                        aria-label="Back to projects"
                    />
                    <PrimaryButton
                        v-else
                        :class="$style.backButton"
                        width-mode="hug"
                        :leading-icon="icons.arrowBack"
                        to="/projects"
                    >
                        Back to projects
                    </PrimaryButton>
                    <h1 :class="$style.pageTitle">{{ isEditing ? "Edit projects" : "New projects" }}</h1>
                    <div :class="$style.headActions" aria-label="Project form language">
                        <button type="button" :class="$style.languageButton" aria-label="Edit Thai content" @click="locale = 'th'">
                            <img :src="icons.languageThai" alt="" aria-hidden="true">
                        </button>
                        <button type="button" :class="$style.languageButton" aria-label="Edit English content" @click="locale = 'en'">
                            <img :src="icons.languageUs" alt="" aria-hidden="true">
                        </button>
                    </div>
                </div>

                <div :class="$style.fieldRow">
                    <TextField
                        v-model="activeContent.projectName"
                        :class="$style.nameField"
                        label="Project Name"
                        placeholder="Placeholder"
                    />
                    <TextareaField
                        v-model="activeContent.descriptionShort"
                        :class="$style.shortDescriptionField"
                        label="Projects Description Short"
                        placeholder="Placeholder"
                        :rows="2"
                    />
                    <SelectField
                        v-model="form.category"
                        :class="$style.selectField"
                        label="Category"
                        placeholder="Placeholder"
                        :options="categories"
                    />
                    <SelectField
                        v-model="form.status"
                        :class="$style.selectField"
                        label="Status"
                        placeholder="Placeholder"
                        :options="statuses"
                    />
                </div>
            </div>

            <section :class="$style.section" aria-label="At a glance">
                <div :class="$style.sectionHeader">
                    <h2 :class="$style.sectionTitle">At a glance</h2>
                    <span :class="$style.sectionRule" aria-hidden="true" />
                </div>
                <div :class="$style.fieldRow">
                    <TextField
                        v-model="form.timeline.startDate"
                        :class="$style.dateField"
                        label="Start Date"
                        type="month"
                    />
                    <TextField
                        v-model="form.timeline.endDate"
                        :class="$style.dateField"
                        label="End Date"
                        type="month"
                    />
                    <SelectField
                        :class="$style.positionField"
                        label="Position"
                        placeholder="Placeholder"
                        :options="availableRoleOptions"
                        @select="addRole"
                    />
                </div>
                <div v-if="form.roles.length" :class="$style.chipRow">
                    <button
                        v-for="role in form.roles"
                        :key="role"
                        type="button"
                        :class="$style.roleCard"
                        :aria-label="`Remove ${role}`"
                        :title="`Remove ${role}`"
                        @click="removeRole(role)"
                    >
                        {{ role }}
                    </button>
                </div>

                <div :class="$style.sectionHeader">
                    <h2 :class="$style.sectionTitle">Summary</h2>
                    <span :class="$style.sectionRule" aria-hidden="true" />
                </div>
                <TextareaField
                    v-model="activeContent.description"
                    label="Overview"
                    placeholder="Placeholder"
                    :rows="3"
                />
                <TextareaField
                    v-model="activeContent.targetUsers"
                    label="Intended Users"
                    placeholder="Placeholder"
                    :rows="3"
                />
                <TextareaField
                    v-model="activeContent.feasibility"
                    label="Feasibility Study"
                    placeholder="Placeholder"
                    :rows="3"
                />
            </section>

            <section :class="$style.section" aria-label="Features">
                <div :class="$style.sectionHeader">
                    <h2 :class="$style.sectionTitle">Feature</h2>
                    <span :class="$style.sectionRule" aria-hidden="true" />
                </div>
                <div
                    v-for="(_, index) in activeContent.features"
                    :key="index"
                    :class="$style.itemRow"
                >
                    <TextField
                        v-model="activeContent.features[index]"
                        :class="$style.itemField"
                        :label="`Feature ${index + 1}`"
                        placeholder="Enter a description here."
                    />
                    <ActionButton
                        :class="$style.itemDelete"
                        action="delete"
                        :aria-label="`Delete feature ${index + 1}`"
                        @click="removeFeature(index)"
                    />
                </div>
                <ActionButton
                    v-if="activeContent.features.length < 8"
                    action="add"
                    aria-label="Add feature"
                    @click="addFeature"
                />
            </section>

            <section :class="$style.section" aria-label="System architecture">
                <div :class="$style.sectionHeader">
                    <h2 :class="$style.sectionTitle">Architecture</h2>
                    <span :class="$style.sectionRule" aria-hidden="true" />
                </div>
                <img
                    v-if="architectureImage"
                    :class="$style.architecturePreview"
                    :src="architectureImage"
                    alt="Architecture preview"
                >
                <div :class="$style.architectureActions">
                    <PrimaryButton
                        width-mode="hug"
                        :leading-icon="icons.upload"
                        @click="openFilePicker('architecture-image')"
                    >
                        Upload File
                    </PrimaryButton>
                    <PrimaryButton
                        v-if="architectureImage"
                        width-mode="hug"
                        @click="removeArchitectureImage"
                    >
                        Delete
                    </PrimaryButton>
                    <input
                        id="architecture-image"
                        :class="$style.hiddenInput"
                        type="file"
                        accept="image/*"
                        @change="updatePreview($event, 'architecture')"
                    >
                </div>

                <div :class="$style.sectionHeader">
                    <h2 :class="$style.sectionTitle">Stack</h2>
                    <span :class="$style.sectionRule" aria-hidden="true" />
                </div>
                <template v-for="group in techStackGroups" :key="group.key">
                    <SelectField
                        :class="$style.stackSelect"
                        :label="group.label"
                        placeholder="Placeholder"
                        :options="getAvailableStackOptions(group)"
                        @select="addTechStack($event, group)"
                    />
                    <div v-if="form.techStack[group.key].length" :class="$style.stackChips">
                        <button
                            v-for="item in form.techStack[group.key]"
                            :key="item"
                            type="button"
                            :class="$style.stackChip"
                            :aria-label="`Remove ${item}`"
                            :title="`Remove ${item}`"
                            @click="removeTechStack(group, item)"
                        >
                            <img
                                v-if="getStackIcon(group, item) && isOriginalColorIcon(getStackIcon(group, item))"
                                :class="$style.stackChipIcon"
                                :src="getStackIcon(group, item)"
                                alt=""
                                aria-hidden="true"
                            >
                            <span
                                v-else-if="getStackIcon(group, item)"
                                :class="[$style.stackChipIcon, $style.maskIcon]"
                                :style="iconMaskStyle(getStackIcon(group, item))"
                                aria-hidden="true"
                            />
                            <span>{{ item }}</span>
                        </button>
                    </div>
                </template>
            </section>

            <section :class="$style.section" aria-label="Preview gallery">
                <div :class="$style.sectionHeader">
                    <h2 :class="$style.sectionTitle">Previews</h2>
                    <span :class="$style.sectionRule" aria-hidden="true" />
                </div>
                <div :class="$style.galleryRow">
                    <div v-for="(_, index) in gallery" :key="index" :class="$style.galleryItem">
                        <div
                            :class="$style.gallerySlot"
                            role="button"
                            tabindex="0"
                            :aria-label="gallery[index] ? `Change project image ${index + 1}` : `Add project image ${index + 1}`"
                            @click="openFilePicker(`gallery-image-${index}`)"
                            @keydown="openFilePickerOnKeydown($event, `gallery-image-${index}`)"
                        >
                            <img
                                v-if="gallery[index]"
                                :class="$style.galleryImage"
                                :src="gallery[index]"
                                :alt="`Project image ${index + 1}`"
                            >
                            <ActionButton v-else action="add" aria-hidden="true" tabindex="-1" />
                            <input
                                :id="`gallery-image-${index}`"
                                :class="$style.hiddenInput"
                                type="file"
                                accept="image/*"
                                @change="updatePreview($event, index)"
                            >
                        </div>
                        <div v-if="gallery[index]" :class="$style.galleryControls">
                            <ActionButton
                                action="back"
                                :aria-label="`Move image ${index + 1} left`"
                                :disabled="index === 0"
                                @click="moveGalleryImage(index, -1)"
                            />
                            <ActionButton
                                action="delete"
                                :aria-label="`Delete image ${index + 1}`"
                                @click="removeGalleryImage(index)"
                            />
                            <ActionButton
                                action="next"
                                :aria-label="`Move image ${index + 1} right`"
                                :disabled="index === gallery.length - 1"
                                @click="moveGalleryImage(index, 1)"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section :class="$style.section" aria-label="Challenges">
                <div :class="$style.sectionHeader">
                    <h2 :class="$style.sectionTitle">Challenges</h2>
                    <span :class="$style.sectionRule" aria-hidden="true" />
                </div>
                <template v-for="(challenge, index) in activeContent.challenges" :key="index">
                    <div :class="$style.itemRow">
                        <TextField
                            :class="$style.itemField"
                            :label="`Title ${index + 1}`"
                            placeholder="Placeholder"
                            :model-value="challenge.title"
                            @update:model-value="challenge.title = $event"
                        />
                        <ActionButton
                            :class="$style.itemDelete"
                            action="delete"
                            :aria-label="`Delete challenge ${index + 1}`"
                            @click="removeStructuredItem(activeContent.challenges, index)"
                        />
                    </div>
                    <TextareaField
                        :class="$style.itemDetail"
                        label="Detail"
                        placeholder="Placeholder"
                        :rows="2"
                        :model-value="challenge.content"
                        @update:model-value="challenge.content = $event"
                    />
                </template>
                <ActionButton
                    v-if="activeContent.challenges.length < 8"
                    action="add"
                    aria-label="Add challenge"
                    @click="addStructuredItem(activeContent.challenges)"
                />
            </section>

            <section :class="$style.section" aria-label="Lessons">
                <div :class="$style.sectionHeader">
                    <h2 :class="$style.sectionTitle">Lessons</h2>
                    <span :class="$style.sectionRule" aria-hidden="true" />
                </div>
                <template v-for="(lesson, index) in activeContent.whatILearned" :key="index">
                    <div :class="$style.itemRow">
                        <TextField
                            :class="$style.itemField"
                            :label="`Title ${index + 1}`"
                            placeholder="Placeholder"
                            :model-value="lesson.title"
                            @update:model-value="lesson.title = $event"
                        />
                        <ActionButton
                            :class="$style.itemDelete"
                            action="delete"
                            :aria-label="`Delete lesson ${index + 1}`"
                            @click="removeStructuredItem(activeContent.whatILearned, index)"
                        />
                    </div>
                    <TextareaField
                        :class="$style.itemDetail"
                        label="Detail"
                        placeholder="Placeholder"
                        :rows="2"
                        :model-value="lesson.content"
                        @update:model-value="lesson.content = $event"
                    />
                </template>
                <ActionButton
                    v-if="activeContent.whatILearned.length < 8"
                    action="add"
                    aria-label="Add lesson"
                    @click="addStructuredItem(activeContent.whatILearned)"
                />
            </section>

            <section :class="$style.section" aria-label="Project links">
                <div :class="$style.sectionHeader">
                    <h2 :class="$style.sectionTitle">Link</h2>
                    <span :class="$style.sectionRule" aria-hidden="true" />
                </div>
                <div :class="$style.fieldRow">
                    <TextField v-model="form.githubUrl" :class="$style.linkField" label="Github" placeholder="https://github.com/..." type="url" />
                    <TextField v-model="form.youtubeUrl" :class="$style.linkField" label="Youtube" placeholder="https://youtube.com/..." type="url" />
                    <TextField v-model="form.figmaUrl" :class="$style.linkField" label="Figma" placeholder="https://figma.com/..." type="url" />
                    <TextField v-model="form.liveUrl" :class="$style.linkField" label="Live Demo" placeholder="https://..." type="url" />
                    <TextField v-model="form.websiteUrl" :class="$style.linkField" label="Website" placeholder="https://..." type="url" />
                </div>
                <div :class="$style.certificateField">
                    <span :class="$style.certificateLabel">Certificate</span>
                    <div :class="$style.certificateControl">
                        <PrimaryButton
                            width-mode="hug"
                            :leading-icon="icons.upload"
                            @click="openFilePicker('certificate-file')"
                        >
                            {{ certificateFile?.name || (form.certificateUrl ? "Certificate uploaded" : "Choose PDF or image") }}
                        </PrimaryButton>
                        <PrimaryButton
                            v-if="certificateFile || form.certificateUrl"
                            width-mode="hug"
                            aria-label="Remove certificate"
                            @click="removeCertificate"
                        >
                            Delete
                        </PrimaryButton>
                        <input
                            id="certificate-file"
                            :class="$style.hiddenInput"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                            @change="updateCertificate"
                        >
                    </div>
                    <span :class="$style.certificateHint">PDF, PNG, JPG, or WebP. Maximum 10 MB.</span>
                </div>
            </section>

            <div :class="$style.submitRow">
                <PrimaryButton width-mode="hug" type="submit" :disabled="isSubmitting">
                    {{ isSubmitting ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update" : "Add") }}
                </PrimaryButton>
            </div>
        </form>
        <AppFooter />
    </main>
</template>

<style module>
.newProject {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    /* Transparent so the fixed BackgroundEffect shows through. */
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    transition: color 300ms ease;
}

.pageContainer {
    display: flex;
    flex: 1;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
}

.section {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    align-self: stretch;
    padding: 12px 16px;
    gap: 8px;
}

.headRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    align-self: stretch;
    gap: 20px;
}

.pageTitle {
    margin: 0;
    font-size: var(--type-size-h1-page-title);
    font-weight: 300;
    text-align: center;
}

.headActions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 180px;
    gap: 8px;
}

.backButton {
    width: 180px;
}

.languageButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: var(--spacing-space-1);
    border: 0;
    border-radius: var(--radius-base);
    background: transparent;
    cursor: pointer;
}

.languageButton img {
    width: 24px;
    height: 24px;
}

.languageButton:hover {
    box-shadow: 0 4px 4px rgb(0 0 0 / 10%);
}

.languageButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.sectionHeader {
    display: flex;
    align-items: center;
    align-self: stretch;
    gap: 8px;
}

.sectionTitle {
    margin: 0;
    font-size: var(--type-size-h2-section-title);
    font-weight: 300;
    white-space: nowrap;
}

.sectionRule {
    flex: 1;
    height: 1px;
    border-top: 1px solid var(--color-main-divider);
}

.fieldRow {
    display: flex;
    align-items: flex-start;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 8px;
}

.nameField {
    width: min(100%, 600px);
}

.selectField {
    width: min(100%, 295px);
}

.shortDescriptionField {
    width: min(100%, 602px);
}

.dateField {
    width: min(100%, 260px);
}

.positionField {
    width: min(100%, 461px);
}

.chipRow {
    display: flex;
    align-items: center;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 8px;
}

.roleCard {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 12px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--type-size-body-main);
    font-weight: 300;
    cursor: pointer;
    transition: background-color 180ms ease, border-color 180ms ease;
}

.roleCard:hover {
    border-color: var(--color-status-error);
    color: var(--color-status-error);
}

.roleCard:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.itemRow {
    display: flex;
    align-items: flex-end;
    align-self: stretch;
    justify-content: center;
    gap: 12px;
}

.itemField {
    width: min(100%, 600px);
}

.itemDelete {
    margin-bottom: 8px;
}

.itemDetail {
    align-self: center;
    width: min(100%, 600px);
}

.architecturePreview {
    align-self: stretch;
    width: 100%;
    height: 664px;
    border-radius: var(--radius-xl);
    object-fit: cover;
}

.architectureActions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    align-self: stretch;
    gap: 8px;
}

.stackSelect {
    width: min(100%, 526px);
}

.stackChips {
    display: flex;
    align-items: center;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 4px;
}

.stackChip {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    padding: 4px;
    gap: 4px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    background-color: transparent;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--type-size-overline);
    font-weight: 300;
    cursor: pointer;
    transition: border-color 180ms ease, color 180ms ease;
}

.stackChip:hover {
    border-color: var(--color-status-error);
    color: var(--color-status-error);
}

.stackChip:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.stackChipIcon {
    width: 24px;
    height: 24px;
    object-fit: contain;
}

.maskIcon {
    display: inline-block;
    flex-shrink: 0;
    background-color: var(--color-text-primary);
    mask: var(--stack-icon-src) center / contain no-repeat;
    -webkit-mask: var(--stack-icon-src) center / contain no-repeat;
    transition: background-color 300ms ease;
}

.galleryRow {
    display: flex;
    align-items: flex-start;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 12px;
}

.galleryItem {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.galleryControls {
    display: flex;
    align-items: center;
    gap: 8px;
}

.gallerySlot {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 205px;
    max-width: 100%;
    height: 112px;
    overflow: hidden;
    border: 1px dashed var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    cursor: pointer;
    transition: border-color 180ms ease;
}

.gallerySlot:hover {
    border-color: var(--color-main-primary);
}

.gallerySlot:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.galleryImage {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.linkField {
    width: min(100%, 400px);
}

.certificateField {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    gap: 8px;
}

.certificateLabel {
    color: var(--color-input-title);
    font-size: var(--type-size-overline);
    font-weight: 800;
}

.certificateControl {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.certificateHint {
    color: var(--color-text-secondary);
    font-size: var(--type-size-overline);
    font-weight: 300;
}

.hiddenInput {
    display: none;
}

.submitRow {
    display: flex;
    justify-content: flex-end;
    align-self: stretch;
    padding: 12px 16px 24px;
}

@media (max-width: 767px) {
    .section {
        padding: 4px 8px;
    }

    .headActions {
        width: auto;
    }

    .galleryRow {
        justify-content: center;
    }

    .architecturePreview {
        height: auto;
        aspect-ratio: 16 / 9;
    }
}
</style>
