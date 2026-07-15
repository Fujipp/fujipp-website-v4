<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { AppFooter } from "@/shared/layout";
import { ActionButton, PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { SelectField } from "@/shared/ui/fields";
import { ConfirmModal } from "@/shared/ui/modals";
import { StatusTag } from "@/shared/ui/tags";
import { ProjectImage } from "@/features/projects/components";
import { backend, database, devops, frontend, language, externalService, getIconColorMode, icons } from "@/config";
import type { ProjectLinkType, ProjectLocale, ProjectRecord } from "@/config";
import { useToastStore, useUserStore } from "@/stores";
import { useProjectStore } from "@/features/projects/stores";
import type { ProjectPayload } from "@/features/projects/stores";

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] extends readonly (infer Item)[]
    ? Mutable<Item>[]
    : T[Key] extends object
        ? Mutable<T[Key]>
        : T[Key] };
type EditableProject = Mutable<ProjectRecord>;
type TechStackKey = keyof EditableProject["techStack"];

const route = useRoute();
const router = useRouter();
const locale = ref<ProjectLocale>("en");

function selectDetailLanguage(language: ProjectLocale): void {
    locale.value = language;
}
const projectStore = useProjectStore();
const toastStore = useToastStore();
const userStore = useUserStore();
const { isAdmin } = storeToRefs(userStore);
const isSaveModalOpen = ref(false);
const isSaving = ref(false);
const editableProject = ref<EditableProject | null>(null);
const imageFiles = ref<(File | null)[]>([]);
const architectureFile = ref<File | null>(null);
const certificateFile = ref<File | null>(null);
const draggedImageIndex = ref<number | null>(null);
const showScrollTop = ref(false);
const techStackKeys: TechStackKey[] = ["language", "frontend", "backend", "database", "externalService", "devops"];
const statusOptions = ["Active", "Completed", "In Progress", "Archived"].map((value) => ({ label: value, value }));
const roleOptions = [
    "Full Stack Engineer", "Frontend Engineer", "Backend Engineer", "UI/UX Specialist",
    "Database Architect", "System Architect", "DevOps Engineer", "Project Manager",
    "Quality Assurance Engineer",
].map((value) => ({ label: value, value }));

/* Icon-only buttons on mobile must drop the label slot entirely —
   hiding the text with CSS leaves PrimaryButton's text padding/gap behind. */
const mobileQuery = typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)") : null;
const isMobile = ref(mobileQuery?.matches ?? false);

function handleMobileChange(event: MediaQueryListEvent): void {
    isMobile.value = event.matches;
}

function handleWindowScroll(): void {
    showScrollTop.value = window.scrollY > 40;
}

function scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    mobileQuery?.addEventListener("change", handleMobileChange);
    handleWindowScroll();
});

onUnmounted(() => {
    window.removeEventListener("scroll", handleWindowScroll);
    mobileQuery?.removeEventListener("change", handleMobileChange);
});

const storedProject = computed(() => (
    projectStore.projects.find((item) => String(item.id) === String(route.params.projectId))
));
const isInlineCreate = computed(() => route.name === "project-inline-new");
const isInlineEditing = computed(() => isAdmin.value && (isInlineCreate.value || route.query.edit === "inline"));
const project = computed<EditableProject | null>(() => (
    isInlineEditing.value
        ? editableProject.value
        : (storedProject.value as EditableProject | undefined) ?? null
));
const content = computed(() => project.value?.content[locale.value]);
const timeline = computed(() => project.value?.timeline);
const availableRoleOptions = computed(() => roleOptions.filter((option) => !project.value?.roles.includes(option.value)));
const durationMonths = computed(() => {
    if (!timeline.value?.startDate) return 0;

    const start = parseTimelineMonth(timeline.value.startDate);
    const end = parseTimelineMonth(timeline.value.endDate) ?? new Date();

    if (!start) return 0;

    const months = ((end.getFullYear() - start.getFullYear()) * 12) + end.getMonth() - start.getMonth() + 1;

    return months > 0 ? months : 0;
});

interface TechStackItem {
    icon: string;
    label: string;
}

interface TechStackGroup {
    icon: string;
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
        icon: icons.github,
        label: "GitHub",
    },
    youtube: {
        icon: icons.youtube,
        label: "YouTube",
    },
    certificate: {
        icon: icons.certificate,
        label: "Certificate",
    },
    figma: {
        icon: icons.stack.uxUi.figma,
        label: "Figma",
    },
    live: {
        icon: icons.demo,
        label: "Live Demo",
    },
    /* No dedicated website glyph exists in public/icons yet; demo.svg stands in. */
    website: {
        icon: icons.demo,
        label: "Website",
    },
};

function isOriginalColorIcon(icon: string): boolean {
    return getIconColorMode(icon) === "original";
}

function iconMaskStyle(icon: string): Record<string, string> {
    return { "--detail-icon-src": `url(${icon})` };
}

watch(
    [() => route.params.projectId, () => route.query.edit, () => route.name],
    async ([projectId]) => {
        if (isInlineCreate.value) {
            editableProject.value = createBlankProject();
            imageFiles.value = [];
            architectureFile.value = null;
            certificateFile.value = null;
            return;
        }
        if (projectId) {
            const loaded = await projectStore.fetchProject(projectId as string).catch(() => undefined);
            if (loaded && route.query.edit === "inline") {
                editableProject.value = cloneProject(loaded);
                imageFiles.value = loaded.gallery.map(() => null);
                architectureFile.value = null;
                certificateFile.value = null;
            }
        }
    },
    { immediate: true },
);

function cloneProject(value: ProjectRecord): EditableProject {
    return JSON.parse(JSON.stringify(value)) as EditableProject;
}

function createBlankProject(): EditableProject {
    const emptyContent = () => ({
        challenges: [{ content: "", title: "" }], description: "", descriptionShort: "",
        feasibility: "", features: [""], projectName: "", targetUsers: "",
        whatILearned: [{ content: "", title: "" }],
    });
    return {
        architectureImage: "", category: "Personal Project", content: { en: emptyContent(), th: emptyContent() },
        featured: false, featuredOrder: null, gallery: [""], id: "new", links: [],
        overview: { challengeAreas: 0, coreRoles: 0, stackGroup: 0 }, roles: [], slug: "",
        stack: [], stackGroups: ["frontend", "backend", "database"], status: "In Progress",
        techStack: { backend: [], database: [], devops: [], externalService: [], frontend: [], language: [] },
        timeline: { endDate: "", milestones: [], startDate: "", status: "In Progress" },
    };
}

function createSlug(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-+|-+$/g, "");
}

function addTextItem(items: string[]): void { if (items.length < 8) items.push(""); }
function removeTextItem(items: string[], index: number): void { items.splice(index, 1); if (!items.length) items.push(""); }
function addStructuredItem(items: EditableProject["content"]["en"]["challenges"]): void {
    if (items.length < 8) items.push({ title: "", content: "" });
}
function removeStructuredItem(items: EditableProject["content"]["en"]["challenges"], index: number): void {
    items.splice(index, 1); if (!items.length) items.push({ title: "", content: "" });
}

function chooseImage(index: number): void { document.getElementById(`inline-gallery-${index}`)?.click(); }
function chooseArchitecture(): void { document.getElementById("inline-architecture")?.click(); }
function chooseCertificate(): void { document.getElementById("inline-certificate")?.click(); }
function updateInlineImage(event: Event, index: number): void {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file || !editableProject.value) return;
    editableProject.value.gallery[index] = URL.createObjectURL(file); imageFiles.value[index] = file;
}
function updateInlineArchitecture(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file || !editableProject.value) return;
    editableProject.value.architectureImage = URL.createObjectURL(file); architectureFile.value = file;
}
function removeArchitecture(): void {
    if (!editableProject.value) return;
    editableProject.value.architectureImage = "";
    architectureFile.value = null;
    const input = document.getElementById("inline-architecture") as HTMLInputElement | null;
    if (input) input.value = "";
}
function updateProjectStatus(value: string): void {
    if (!editableProject.value) return;
    editableProject.value.status = value as EditableProject["status"];
    editableProject.value.timeline.status = value === "Completed" ? "Completed" : "In Progress";
}
function addRole(value: string): void {
    if (!editableProject.value || !value || editableProject.value.roles.includes(value)) return;
    editableProject.value.roles.push(value);
}
function removeRole(index: number): void {
    editableProject.value?.roles.splice(index, 1);
}
function addInlineStack(key: TechStackKey, value: string): void {
    if (!editableProject.value) return;
    if (value && !editableProject.value.techStack[key].includes(value)) editableProject.value.techStack[key].push(value);
}
function removeInlineStack(key: TechStackKey, value: string): void {
    if (!editableProject.value) return;
    editableProject.value.techStack[key] = editableProject.value.techStack[key].filter((item) => item !== value);
}
function getInlineStackOptions(key: TechStackKey): { label: string; value: string }[] {
    const selected = editableProject.value?.techStack[key] ?? [];
    return stackCatalog[key].slice(1).filter((item) => !selected.includes(item.label)).map((item) => ({ label: item.label, value: item.label }));
}
function updateInlineLink(type: ProjectLinkType, url: string): void {
    if (!editableProject.value) return;
    const links = editableProject.value.links.filter((link) => link.type !== type);
    if (url.trim()) links.push({ type, url: url.trim() });
    editableProject.value.links = links;
}
function startImageDrag(index: number): void { draggedImageIndex.value = index; }
function endImageDrag(): void { draggedImageIndex.value = null; }
function dropImage(index: number): void {
    if (!editableProject.value || draggedImageIndex.value === null || draggedImageIndex.value === index) return;
    const from = draggedImageIndex.value;
    const [image] = editableProject.value.gallery.splice(from, 1);
    const [file] = imageFiles.value.splice(from, 1);
    editableProject.value.gallery.splice(index, 0, image ?? "");
    imageFiles.value.splice(index, 0, file ?? null);
    draggedImageIndex.value = null;
}
function removeInlineImage(index: number): void {
    if (!editableProject.value) return;
    editableProject.value.gallery.splice(index, 1);
    imageFiles.value.splice(index, 1);
    if (!editableProject.value.gallery.length) {
        editableProject.value.gallery.push("");
        imageFiles.value.push(null);
    }
}
function updateCertificate(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
        toastStore.show("Unsupported certificate", "Please select a PDF certificate.", "warning");
        input.value = "";
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        toastStore.show("Certificate is too large", "Please select a PDF smaller than 10 MB.", "warning");
        input.value = "";
        return;
    }
    certificateFile.value = file;
}
function removeCertificate(): void {
    certificateFile.value = null;
    updateInlineLink("certificate", "");
}

function cancelInlineEditing(): void {
    if (isInlineCreate.value) void router.push({ name: "projects" });
    else void router.replace({ name: "project-detail", params: { projectId: route.params.projectId } });
}

async function saveInlineProject(): Promise<void> {
    const draft = editableProject.value; if (!draft || isSaving.value) return;
    const name = draft.content.en.projectName.trim() || draft.content.th.projectName.trim();
    if (!name) { toastStore.show("Missing project name", "Enter a project name before saving.", "warning"); return; }
    isSaving.value = true;
    try {
        const slug = draft.slug || createSlug(name);
        const directory = `${slug}-${Date.now()}`;
        const gallery = (await Promise.all(draft.gallery.map(async (url, index) => {
            const file = imageFiles.value[index]; return file ? projectStore.uploadProjectAsset(file, `${directory}/gallery`) : url;
        }))).filter(Boolean);
        const architectureImage = architectureFile.value
            ? await projectStore.uploadProjectAsset(architectureFile.value, `${directory}/architecture`) : draft.architectureImage;
        const certificateUrl = certificateFile.value
            ? await projectStore.uploadProjectAsset(certificateFile.value, `${directory}/certificate`)
            : draft.links.find((link) => link.type === "certificate")?.url ?? "";
        const { id: _id, ...payloadDraft } = draft;
        const cleanContent = (value: EditableProject["content"]["en"]) => ({
            ...value,
            features: value.features.map((item) => item.trim()).filter(Boolean),
            challenges: value.challenges.map((item) => ({ title: item.title.trim(), content: item.content.trim() })).filter((item) => item.title || item.content),
            whatILearned: value.whatILearned.map((item) => ({ title: item.title.trim(), content: item.content.trim() })).filter((item) => item.title || item.content),
        });
        const contentPayload = { en: cleanContent(draft.content.en), th: cleanContent(draft.content.th) };
        const techStack: ProjectPayload["techStack"] = {
            backend: draft.techStack.backend.filter(Boolean),
            database: draft.techStack.database.filter(Boolean),
            devops: draft.techStack.devops.filter(Boolean),
            externalService: draft.techStack.externalService.filter(Boolean),
            frontend: draft.techStack.frontend.filter(Boolean),
            language: draft.techStack.language.filter(Boolean),
        };
        const roles = draft.roles.map((role) => role.trim()).filter(Boolean);
        const links = payloadDraft.links.filter((link) => link.type !== "certificate");
        if (certificateUrl) links.push({ type: "certificate", url: certificateUrl });
        const payload: ProjectPayload = {
            ...payloadDraft,
            slug, gallery, architectureImage, roles, techStack, content: contentPayload, links,
            stackGroups: ["frontend", "backend", "database"],
            stack: [techStack.frontend[0], techStack.backend[0], techStack.database[0]]
                .filter((item): item is string => Boolean(item)),
            overview: {
                challengeAreas: Math.max(contentPayload.en.challenges.length, contentPayload.th.challenges.length),
                coreRoles: roles.length,
                stackGroup: Object.values(techStack).filter((items) => items.length).length,
            },
        };
        const saved = isInlineCreate.value
            ? await projectStore.createProject(payload)
            : await projectStore.updateProject(route.params.projectId as string, payload);
        isSaveModalOpen.value = false;
        toastStore.show(isInlineCreate.value ? "Project added" : "Project updated", "Your inline changes were saved.", "success");
        await router.replace({ name: "project-detail", params: { projectId: saved.id } });
    } catch (cause) {
        toastStore.show("Unable to save project", cause instanceof Error ? cause.message : "Please try again.", "error");
    } finally { isSaving.value = false; }
}

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

    metrics.push({
        label: content.value.features.length === 1 ? "Feature" : "Features",
        value: content.value.features.length,
    });

    if (techStackTotal.value) {
        metrics.push({ label: "Technologies", value: techStackTotal.value });
    }

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
        { label: "Language", icon: stackCatalog.language[0]?.icon ?? "", items: resolveStackItems(project.value.techStack.language, stackCatalog.language) },
        { label: "Frontend", icon: stackCatalog.frontend[0]?.icon ?? "", items: resolveStackItems(project.value.techStack.frontend, stackCatalog.frontend) },
        { label: "Backend", icon: stackCatalog.backend[0]?.icon ?? "", items: resolveStackItems(project.value.techStack.backend, stackCatalog.backend) },
        { label: "Database", icon: stackCatalog.database[0]?.icon ?? "", items: resolveStackItems(project.value.techStack.database, stackCatalog.database) },
        { label: "External Service", icon: stackCatalog.externalService[0]?.icon ?? "", items: resolveStackItems(project.value.techStack.externalService, stackCatalog.externalService) },
        { label: "DevOps", icon: stackCatalog.devops[0]?.icon ?? "", items: resolveStackItems(project.value.techStack.devops, stackCatalog.devops) },
    ];

    return groups.filter((group) => group.items.length > 0);
});

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

</script>

<template>
    <main :class="$style.projectDetail" class="pt-16">
            <div :class="[$style.scrollTop, showScrollTop ? $style.scrollTopVisible : '']">
            <ActionButton action="scroll-top" @click="scrollToTop" />
        </div>
        <article v-if="project && content" :class="$style.page">
            <div v-if="isInlineEditing" :class="$style.inlineBar" role="status">
                <span><strong>{{ isInlineCreate ? "Add Project" : "Edit Project" }}</strong> · Click any outlined field or image to change it.</span>
                <div :class="$style.inlineBarActions">
                    <SecondaryButton type="button" @click="cancelInlineEditing">Cancel</SecondaryButton>
                    <PrimaryButton type="button" :leading-icon="icons.save" @click="isSaveModalOpen = true">Save</PrimaryButton>
                </div>
            </div>
            <section :class="[$style.section, $style.previewSection]" aria-label="Preview">
                <div :class="$style.previewHead">
                    <PrimaryButton
                        v-if="isMobile"
                        width-mode="hug"
                        :leading-icon="icons.directionLeft"
                        to="/projects"
                        aria-label="Back to projects"
                    />
                    <PrimaryButton
                        v-else
                        :class="$style.backButton"
                        width-mode="hug"
                        :leading-icon="icons.directionLeft"
                        to="/projects"
                    >
                        Back to projects
                    </PrimaryButton>
                    <h2 v-if="project.gallery.length || isInlineEditing" :class="$style.previewTitle">Preview</h2>
                    <span v-else aria-hidden="true" />
                    <div :class="$style.previewLanguageButtons" aria-label="Project language">
                        <button
                            type="button"
                            :class="$style.previewLanguageButton"
                            aria-label="Show project in Thai"
                            @click="selectDetailLanguage('th')"
                        >
                            <img :src="icons.languageThai" alt="" aria-hidden="true">
                        </button>
                        <button
                            type="button"
                            :class="$style.previewLanguageButton"
                            aria-label="Show project in English"
                            @click="selectDetailLanguage('en')"
                        >
                            <img :src="icons.languageUs" alt="" aria-hidden="true">
                        </button>
                    </div>
                </div>
                <div v-if="isInlineEditing" :class="$style.inlineGallery">
                    <div
                        v-for="(image, index) in project.gallery"
                        :key="index"
                        :class="$style.inlineImageSlot"
                        draggable="true"
                        @dragstart="startImageDrag(index)"
                        @dragend="endImageDrag"
                        @dragover.prevent
                        @drop.prevent="dropImage(index)"
                    >
                        <button type="button" :class="$style.inlineImageButton" @click="chooseImage(index)">
                            <img v-if="image" :src="image" alt="" aria-hidden="true">
                            <span v-else>+ Add preview image</span>
                            <input :id="`inline-gallery-${index}`" type="file" accept="image/*" hidden @change="updateInlineImage($event, index)">
                        </button>
                        <span :class="$style.inlineDragHandle" aria-hidden="true">⠿</span>
                        <button type="button" :class="$style.inlineImageDelete" :aria-label="`Delete preview image ${index + 1}`" @click="removeInlineImage(index)">×</button>
                    </div>
                    <button v-if="project.gallery.length < 5" type="button" :class="$style.inlineAddButton" @click="project.gallery.push(''); imageFiles.push(null)">+ Image</button>
                </div>
                <ProjectImage
                    v-else-if="project.gallery.length"
                    :images="project.gallery"
                    :project-name="content.projectName"
                />
            </section>

            <section :class="$style.detailOverviewSection" aria-label="Project overview">
            <header :class="$style.projectHeader">
                <div :class="$style.projectHeading">
                    <input v-if="isInlineEditing" v-model="content.projectName" :class="[$style.inlineField, $style.inlineTitleField]" aria-label="Project name">
                    <h1 v-else :class="$style.projectName">{{ content.projectName }}</h1>
                    <input v-if="isInlineEditing" v-model="project.category" :class="$style.inlineField" aria-label="Project category">
                    <p v-else :class="$style.projectCategory">{{ project.category }}</p>
                    <input v-if="isInlineEditing" v-model="content.descriptionShort" :class="$style.inlineField" placeholder="Short description" aria-label="Short project description">
                </div>
                <div :class="$style.projectActions">
                    <template v-for="link in project.links" :key="link.type">
                        <PrimaryButton
                            v-if="isMobile"
                            width-mode="hug"
                            :leading-icon="projectLinkMeta[link.type].icon"
                            :href="link.url"
                            :aria-label="projectLinkMeta[link.type].label"
                            target="_blank"
                            rel="noopener noreferrer"
                        />
                        <PrimaryButton
                            v-else
                            width-mode="hug"
                            :leading-icon="projectLinkMeta[link.type].icon"
                            :href="link.url"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {{ projectLinkMeta[link.type].label }}
                        </PrimaryButton>
                    </template>
                </div>
            </header>

            <div :class="$style.glanceGroup" aria-label="Project at a glance">
                <div :class="$style.glanceRow">
                    <div :class="[$style.glanceCard, isInlineEditing ? $style.glanceEditorCard : '']">
                        <div :class="$style.glanceStatusRow">
                            <span :class="$style.glanceText">Status :</span>
                            <SelectField
                                v-if="isInlineEditing"
                                label="Status"
                                hide-label
                                :model-value="project.status"
                                :options="statusOptions"
                                @update:model-value="updateProjectStatus"
                            />
                            <StatusTag v-else :status="project.status" />
                        </div>
                        <div v-if="isInlineEditing" :class="$style.inlineDates">
                            <label><span>Start month</span><input v-model="project.timeline.startDate" type="month" :class="$style.inlineField"></label>
                            <label><span>End month</span><input v-model="project.timeline.endDate" type="month" :class="$style.inlineField"></label>
                        </div>
                        <div v-if="!isInlineEditing && timeline && timeline.startDate" :class="$style.glanceDates">
                            <span :class="[$style.glanceIcon, $style.maskIcon]" :style="iconMaskStyle(icons.calendar)" aria-hidden="true" />
                            <span :class="$style.glanceText">{{ formatTimelineMonth(timeline.startDate) }}</span>
                            <template v-if="timeline.endDate">
                                <span :class="$style.glanceText" aria-hidden="true">→</span>
                                <span :class="$style.glanceText">{{ formatTimelineMonth(timeline.endDate) }}</span>
                            </template>
                        </div>
                    </div>
                    <div
                        v-for="metric in overviewMetrics"
                        :key="metric.label"
                        :class="[$style.glanceCard, $style.metricCard]"
                    >
                        <span :class="$style.metricValue">{{ metric.value }}</span>
                        <span :class="$style.metricLabel">{{ metric.label }}</span>
                    </div>
                </div>
                <div v-if="project.roles.length || isInlineEditing" :class="$style.roleRow">
                    <div :class="[$style.roleChip, $style.roleHead]">
                        <span :class="[$style.glanceIcon, $style.maskIcon]" :style="iconMaskStyle(icons.user)" aria-hidden="true" />
                        <span :class="$style.roleHeadLabel">My Role</span>
                    </div>
                    <div v-for="(role, index) in project.roles" :key="role" :class="$style.roleChip">
                        <span :class="$style.glanceText">{{ role }}</span>
                        <button v-if="isInlineEditing" type="button" :class="$style.inlineRoleDelete" :aria-label="`Remove ${role}`" @click="removeRole(index)">×</button>
                    </div>
                    <div v-if="isInlineEditing" :class="$style.inlineRoleSelect">
                        <SelectField label="Add role" hide-label :options="availableRoleOptions" placeholder="+ Role" @select="addRole" />
                    </div>
                </div>
            </div>

            <div v-if="content.description || isInlineEditing" :class="$style.overviewGroup" aria-label="Overview">
                <h2 :class="$style.sectionTitle">Overview</h2>
                <textarea v-if="isInlineEditing" v-model="content.description" :class="[$style.inlineField, $style.inlineTextarea]" aria-label="Project overview" />
                <p v-else :class="$style.overviewText">{{ content.description }}</p>
            </div>
            </section>

            <section
                v-if="content.feasibility || content.targetUsers || isInlineEditing"
                :class="[$style.section, $style.noteSection]"
                aria-label="Feasibility and target users"
            >
                <template v-if="content.feasibility || isInlineEditing">
                    <h2 :class="$style.noteTitle">Feasibility</h2>
                    <textarea v-if="isInlineEditing" v-model="content.feasibility" :class="[$style.inlineField, $style.inlineTextarea]" aria-label="Feasibility" />
                    <p v-else :class="$style.noteText">{{ content.feasibility }}</p>
                </template>
                <template v-if="content.targetUsers || isInlineEditing">
                    <h2 :class="$style.noteTitle">Target Users</h2>
                    <textarea v-if="isInlineEditing" v-model="content.targetUsers" :class="[$style.inlineField, $style.inlineTextarea]" aria-label="Target users" />
                    <p v-else :class="$style.noteText">{{ content.targetUsers }}</p>
                </template>
            </section>

            <section
                v-if="project.architectureImage || techStackGroups.length || isInlineEditing"
                :class="[$style.section, $style.architectureSection]"
                aria-label="System architecture and tech stack"
            >
                <h2 :class="$style.architectureTitle">Architecture</h2>
                <div :class="$style.architectureContent">
                    <div v-if="isInlineEditing" :class="$style.inlineArchitectureEditor">
                        <button type="button" :class="[$style.inlineImageButton, $style.inlineArchitecture]" @click="chooseArchitecture">
                            <img v-if="project.architectureImage" :src="project.architectureImage" alt="" aria-hidden="true">
                            <span v-else>+ Add architecture image</span>
                            <input id="inline-architecture" type="file" accept="image/*" hidden @change="updateInlineArchitecture">
                        </button>
                        <button v-if="project.architectureImage" type="button" :class="$style.inlineImageDelete" aria-label="Delete architecture image" @click="removeArchitecture">×</button>
                    </div>
                    <img
                        v-else-if="project.architectureImage"
                        :class="$style.architectureImage"
                        :src="project.architectureImage"
                        :alt="`${content.projectName} system architecture`"
                        draggable="false"
                    >
                    <div v-if="techStackGroups.length && !isInlineEditing" :class="$style.architectureStack">
                        <div v-for="group in techStackGroups" :key="group.label" :class="$style.stackGroup">
                            <div :class="$style.stackGroupHeading">
                                <img
                                    v-if="group.icon && isOriginalColorIcon(group.icon)"
                                    :class="$style.stackGroupIcon"
                                    :src="group.icon"
                                    alt=""
                                    aria-hidden="true"
                                >
                                <span
                                    v-else-if="group.icon"
                                    :class="[$style.stackGroupIcon, $style.maskIcon]"
                                    :style="iconMaskStyle(group.icon)"
                                    aria-hidden="true"
                                />
                                <span :class="$style.stackGroupLabel">{{ group.label }}</span>
                            </div>
                            <div :class="$style.stackChips">
                                <span
                                    v-for="item in group.items"
                                    :key="item.label"
                                    :class="$style.stackChip"
                                    role="img"
                                    :aria-label="item.label"
                                    tabindex="0"
                                >
                                    <img
                                        v-if="isOriginalColorIcon(item.icon)"
                                        :class="$style.stackChipIcon"
                                        :src="item.icon"
                                        alt=""
                                        aria-hidden="true"
                                        draggable="false"
                                    >
                                    <span
                                        v-else
                                        :class="[$style.stackChipIcon, $style.maskIcon]"
                                        :style="iconMaskStyle(item.icon)"
                                        aria-hidden="true"
                                    />
                                    <span :class="$style.stackChipLabel" aria-hidden="true">{{ item.label }}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div v-if="isInlineEditing" :class="$style.inlineStackEditor">
                        <div v-for="key in techStackKeys" :key="key" :class="$style.inlineStackBlock">
                            <SelectField
                                :label="key"
                                :options="getInlineStackOptions(key)"
                                placeholder="Select technology"
                                @select="addInlineStack(key, $event)"
                            />
                            <div :class="$style.inlineSelectedStack">
                                <button v-for="item in project.techStack[key]" :key="item" type="button" @click="removeInlineStack(key, item)">
                                    {{ item }} <span aria-hidden="true">×</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section v-if="isInlineEditing" :class="[$style.section, $style.inlineLinksSection]" aria-label="Project links">
                <h2 :class="$style.sectionTitle">Links</h2>
                <div :class="$style.inlineLinkGrid">
                    <label v-for="type in ['github', 'youtube', 'figma', 'live', 'website']" :key="type" :class="$style.inlineLinkCard">
                        <span>{{ type }}</span>
                        <input
                            :value="project.links.find(link => link.type === type)?.url || ''"
                            :class="$style.inlineField"
                            type="url"
                            @change="updateInlineLink(type as ProjectLinkType, ($event.target as HTMLInputElement).value)"
                        >
                    </label>
                    <div :class="$style.inlineLinkCard">
                        <span>Certificate</span>
                        <input id="inline-certificate" type="file" accept="application/pdf" hidden @change="updateCertificate">
                        <button type="button" :class="$style.inlineUploadButton" @click="chooseCertificate">
                            <img :src="icons.certificate" alt="" aria-hidden="true">
                            {{ certificateFile?.name || (project.links.some(link => link.type === 'certificate') ? 'Replace PDF' : 'Upload PDF') }}
                        </button>
                        <button v-if="certificateFile || project.links.some(link => link.type === 'certificate')" type="button" :class="$style.inlineRemoveLink" @click="removeCertificate">Remove certificate</button>
                    </div>
                </div>
            </section>

            <section
                v-if="content.features.length || content.challenges.length || content.whatILearned.length"
                :class="[$style.section, $style.insightsSection]"
                aria-label="Features, challenges, and lessons"
            >
                <div v-if="content.features.length" :class="$style.insightGroup">
                    <h2 :class="$style.insightTitle">Features</h2>
                    <ul v-if="isInlineEditing" :class="$style.inlineList">
                        <li v-for="(_, index) in content.features" :key="index">
                            <input v-model="content.features[index]" :class="$style.inlineField" :aria-label="`Feature ${index + 1}`">
                            <button type="button" aria-label="Remove feature" @click="removeTextItem(content.features, index)">×</button>
                        </li>
                    </ul>
                    <button v-if="isInlineEditing && content.features.length < 8" type="button" :class="$style.inlineAddButton" @click="addTextItem(content.features)">+ Feature</button>
                    <ul v-if="!isInlineEditing" :class="$style.insightList">
                        <li v-for="(feature, index) in content.features.slice(0, 8)" :key="index">
                            {{ feature }}
                        </li>
                    </ul>
                </div>
                <div v-if="content.challenges.length" :class="$style.insightGroup">
                    <h2 :class="$style.insightTitle">Challenges</h2>
                    <ul v-if="isInlineEditing" :class="$style.inlineList">
                        <li v-for="(challenge, index) in content.challenges" :key="index">
                            <input v-model="challenge.title" :class="$style.inlineField" placeholder="Title">
                            <input v-model="challenge.content" :class="$style.inlineField" placeholder="Detail">
                            <button type="button" aria-label="Remove challenge" @click="removeStructuredItem(content.challenges, index)">×</button>
                        </li>
                    </ul>
                    <button v-if="isInlineEditing && content.challenges.length < 8" type="button" :class="$style.inlineAddButton" @click="addStructuredItem(content.challenges)">+ Challenge</button>
                    <ul v-if="!isInlineEditing" :class="$style.insightList">
                        <li
                            v-for="challenge in content.challenges.slice(0, 8)"
                            :key="`${challenge.title}-${challenge.content}`"
                        >
                            <strong v-if="challenge.title">{{ challenge.title }}: </strong>{{ challenge.content }}
                        </li>
                    </ul>
                </div>
                <div v-if="content.whatILearned.length" :class="$style.insightGroup">
                    <h2 :class="$style.insightTitle">What I Learned</h2>
                    <ul v-if="isInlineEditing" :class="$style.inlineList">
                        <li v-for="(lesson, index) in content.whatILearned" :key="index">
                            <input v-model="lesson.title" :class="$style.inlineField" placeholder="Title">
                            <input v-model="lesson.content" :class="$style.inlineField" placeholder="Detail">
                            <button type="button" aria-label="Remove lesson" @click="removeStructuredItem(content.whatILearned, index)">×</button>
                        </li>
                    </ul>
                    <button v-if="isInlineEditing && content.whatILearned.length < 8" type="button" :class="$style.inlineAddButton" @click="addStructuredItem(content.whatILearned)">+ Lesson</button>
                    <ul v-if="!isInlineEditing" :class="$style.insightList">
                        <li
                            v-for="lesson in content.whatILearned.slice(0, 8)"
                            :key="`${lesson.title}-${lesson.content}`"
                        >
                            <strong v-if="lesson.title">{{ lesson.title }}: </strong>{{ lesson.content }}
                        </li>
                    </ul>
                </div>
            </section>

            <ConfirmModal
                v-if="isSaveModalOpen"
                title="Confirm project changes"
                :reason="isInlineCreate ? 'Create this project with the content currently shown?' : 'Save all inline edits to this project?'"
                :confirm-label="isInlineCreate ? 'Create project' : 'Save changes'"
                :disabled="isSaving"
                @cancel="isSaveModalOpen = false"
                @confirm="saveInlineProject"
            />
        </article>

        <section
            v-else-if="projectStore.isLoading"
            :class="$style.page"
            aria-label="Loading project details"
            aria-busy="true"
        >
            <div :class="$style.section">
                <div :class="[$style.skeletonBlock, $style.skeletonTitle]" />
                <div :class="[$style.skeletonBlock, $style.skeletonHero]" />
            </div>
            <div :class="$style.section">
                <div :class="[$style.skeletonBlock, $style.skeletonTitle]" />
                <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
                <div :class="[$style.skeletonBlock, $style.skeletonLine]" />
                <div :class="[$style.skeletonBlock, $style.skeletonLineShort]" />
            </div>
        </section>

        <section v-else :class="[$style.page, $style.notFound]">
            <h1 :class="$style.sectionTitle">Project not found</h1>
            <SecondaryButton to="/projects">Back to projects</SecondaryButton>
        </section>

        <AppFooter />
    </main>
</template>

<style module>
.projectDetail {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    /* Transparent so the fixed BackgroundEffect shows through. */
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    transition: color 300ms ease;
}

.page {
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
    align-self: stretch;
    padding: 12px 16px;
    gap: 8px;
}

.sectionTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h2-section-title);
    font-weight: 600;
}

.inlineBar {
    position: sticky;
    top: 64px;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    gap: var(--spacing-space-4);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    box-shadow: 0 8px 24px rgb(0 0 0 / 16%);
}

.inlineBarActions { display: flex; gap: var(--spacing-space-2); }
.inlineField {
    box-sizing: border-box;
    width: 100%;
    padding: var(--spacing-space-2) var(--spacing-space-3);
    border: 1px dashed var(--color-input-border);
    border-radius: var(--radius-lg);
    background: var(--color-input-bg);
    color: var(--color-text-primary);
    font: inherit;
}
.inlineField:hover, .inlineField:focus { border-style: solid; border-color: var(--color-input-border-focus); outline: none; }
.inlineTitleField { font-size: var(--type-size-h1-page-title); font-weight: 800; }
.inlineTextarea { min-height: 128px; resize: vertical; line-height: 1.6; }
.inlineGallery { display: grid; grid-template-columns: repeat(4, 1fr); width: min(993px, 100%); gap: var(--spacing-space-2); }
.inlineImageSlot { position: relative; min-height: 112px; }
.inlineImageSlot:first-child { grid-column: 1 / -1; min-height: 420px; }
.inlineImageButton {
    display: grid; place-items: center; width: 100%; height: 100%; min-height: inherit; padding: 0; overflow: hidden;
    border: 1px dashed var(--color-main-border); border-radius: var(--radius-xl);
    background: var(--color-main-surface); color: var(--color-text-muted); cursor: pointer;
}
.inlineImageButton img { width: 100%; height: 100%; object-fit: cover; }
.inlineDragHandle, .inlineImageDelete { position: absolute; z-index: 2; top: var(--spacing-space-2); display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid var(--color-button-border); border-radius: 50%; background: var(--color-button-secondary-btn-bg); color: var(--color-button-secondary-btn-text); box-shadow: 0 4px 12px rgb(0 0 0 / 22%); }
.inlineDragHandle { left: var(--spacing-space-2); cursor: grab; }
.inlineImageDelete { right: var(--spacing-space-2); box-sizing: border-box; padding: 0; cursor: pointer; font-family: Arial, sans-serif; font-size: 22px; line-height: 1; }
.inlineArchitectureEditor { position: relative; width: min(768px, 100%); min-height: 419px; }
.inlineArchitecture { width: min(768px, 100%); min-height: 419px; }
.inlineArchitecture:first-child { grid-column: auto; }
.inlineAddButton {
    align-self: flex-start; padding: var(--spacing-space-2) var(--spacing-space-3);
    border: 1px solid var(--color-button-border); border-radius: 9999px;
    background: var(--color-button-secondary-btn-bg); color: var(--color-button-secondary-btn-text); cursor: pointer;
}
.inlineDates { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing-space-2); }
.inlineDates label { display: flex; flex-direction: column; gap: var(--spacing-space-1); color: var(--color-text-primary); font-size: var(--type-size-input-label); }
.inlineRoleDelete { display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--color-status-error); cursor: pointer; font-size: 20px; line-height: 1; }
.inlineRoleSelect { width: 160px; }
.inlineStackEditor, .inlineLinkGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: var(--spacing-space-4); width: 100%; }
.inlineStackEditor { align-self: stretch; }
.inlineStackBlock, .inlineLinkCard { display: flex; flex-direction: column; box-sizing: border-box; min-height: 132px; padding: var(--spacing-space-4); gap: var(--spacing-space-3); border: 1px solid var(--color-main-border); border-radius: var(--radius-xl); background: var(--color-main-background); text-transform: capitalize; }
.inlineSelectedStack { display: flex; flex-wrap: wrap; gap: var(--spacing-space-2); }
.inlineSelectedStack button { padding: var(--spacing-space-1) var(--spacing-space-2); border: 1px solid var(--color-button-border); border-radius: 9999px; background: var(--color-main-background); color: var(--color-text-primary); cursor: pointer; }
.inlineUploadButton { display: flex; align-items: center; justify-content: center; min-height: 48px; padding: var(--spacing-space-2); gap: var(--spacing-space-2); border: 1px dashed var(--color-input-border); border-radius: var(--radius-lg); background: var(--color-input-bg); color: var(--color-text-primary); cursor: pointer; }
.inlineUploadButton img { width: 24px; height: 24px; }
.inlineRemoveLink { align-self: flex-start; border: 0; background: transparent; color: var(--color-status-error); cursor: pointer; }
.inlineLinksSection { padding-block: var(--spacing-space-16); }
.inlineList { display: flex; flex-direction: column; align-self: stretch; margin: 0; padding: 0; gap: var(--spacing-space-2); list-style: none; }
.inlineList li { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto; gap: var(--spacing-space-2); }
.inlineList li:has(> input:first-child:last-of-type) { grid-template-columns: minmax(0, 1fr) auto; }
.inlineList button { border: 0; background: transparent; color: var(--color-text-primary); cursor: pointer; font-size: 24px; }

.scrollTop {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 60;
    opacity: 0;
    pointer-events: none;
    transform: translateY(16px);
    transition: opacity 300ms ease-in-out, transform 300ms ease-in-out;
}

.scrollTopVisible {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
}

.previewHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    align-self: stretch;
    gap: 20px;
}

.previewLanguageButtons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 180px;
    gap: var(--spacing-space-2);
}

.previewLanguageButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    padding: var(--spacing-space-1);
    border: 1px solid transparent;
    border-radius: var(--radius-base);
    background: transparent;
    cursor: pointer;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease;
}

.previewLanguageButton img {
    width: 24px;
    height: 24px;
}

.previewLanguageButton:hover {
    border-color: var(--color-button-border);
    box-shadow: 0 4px 4px rgb(0 0 0 / 10%);
}

.previewLanguageButton:active {
    transform: scale(0.94);
}

.previewLanguageButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.previewSection {
    align-items: center;
    box-sizing: border-box;
    min-height: 843px;
    padding: 12px 16px;
    gap: var(--spacing-space-8);
}

.previewTitle {
    margin: 0;
    color: var(--color-text-primary);
    font-family: var(--font-rammetto-one);
    font-size: var(--type-size-h1-page-title);
    font-weight: 400;
    text-align: center;
}

.backButton {
    width: 180px;
}

@media (max-width: 767px) {
    .inlineBar { top: 56px; align-items: stretch; flex-direction: column; margin-inline: var(--spacing-space-4); }
    .inlineBarActions { justify-content: flex-end; }
    .inlineGallery { grid-template-columns: repeat(2, 1fr); }
    .inlineImageSlot:first-child { min-height: 220px; }
    .inlineStackEditor, .inlineLinkGrid { grid-template-columns: 1fr; }
    .inlineDates { grid-template-columns: 1fr; }
    .glanceEditorCard:first-child { width: 100%; max-width: 100%; }
    .inlineList li { grid-template-columns: 1fr auto; }
    .inlineList li input:nth-child(2) { grid-column: 1 / -1; }
    .previewLanguageButtons {
        width: auto;
    }

    .previewSection {
        min-height: auto;
        padding: var(--spacing-space-3) var(--spacing-space-4) var(--spacing-space-8);
        gap: var(--spacing-space-4);
    }
}

/* Project header */

.detailOverviewSection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    box-sizing: border-box;
    padding: var(--spacing-space-32) var(--spacing-space-16);
    gap: var(--spacing-space-8);
}

.projectHeader {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 2px;
}

.projectHeading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 500px;
    gap: 8px;
}

.projectName {
    margin: 0;
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.projectCategory {
    margin: 0;
    font-size: var(--type-size-subtitle);
    font-weight: 300;
}

.projectActions {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    max-width: 650px;
    gap: 8px;
}

/* At a glance */

.glanceGroup,
.overviewGroup {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    gap: var(--spacing-space-8);
}

.glanceTitle {
    color: var(--color-text-primary);
    font-size: var(--type-size-caption);
    font-weight: 800;
}

.glanceRow {
    display: flex;
    align-items: stretch;
    align-self: stretch;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px 20px;
}

.glanceCard {
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    padding: 12px;
    gap: 12px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    transition: background-color 300ms ease, border-color 300ms ease;
}

.glanceCard:first-child {
    width: 288px;
    max-width: 288px;
}

.glanceEditorCard:first-child {
    width: 420px;
    max-width: 420px;
}

.glanceStatusRow {
    display: flex;
    align-items: center;
    gap: 12px;
}

.glanceEditorCard .glanceStatusRow > :last-child {
    flex: 1;
}

.glanceDates {
    display: flex;
    align-items: center;
    gap: 12px;
}

.glanceIcon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    object-fit: contain;
}

.glanceText {
    font-size: var(--type-size-body-small);
    font-weight: 300;
}

.maskIcon {
    display: inline-block;
    flex-shrink: 0;
    background-color: var(--color-text-primary);
    mask: var(--detail-icon-src) center / contain no-repeat;
    -webkit-mask: var(--detail-icon-src) center / contain no-repeat;
    transition: background-color 300ms ease;
}

.metricCard {
    align-items: center;
    width: 256px;
    max-width: 256px;
    min-height: 90px;
}

.metricValue {
    font-size: var(--type-size-h3-card-title);
    font-weight: 300;
}

.metricLabel {
    font-size: var(--type-size-body-small);
    font-weight: 300;
}

.roleRow {
    display: flex;
    align-items: stretch;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 8px;
}

.roleChip {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 12px;
    gap: 8px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    transition: background-color 300ms ease, border-color 300ms ease;
}

.roleHeadLabel {
    font-size: var(--type-size-body-small);
    font-weight: 600;
}

/* Overview + notes */

.overviewText {
    margin: 0;
    font-size: var(--type-size-body-main);
    font-weight: 300;
    white-space: pre-line;
    color: var(--color-text-primary);
}

.noteSection {
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100vw;
    margin-left: calc(50% - 50vw);
    padding: var(--spacing-space-32) var(--spacing-space-16);
    padding-inline: max(
        var(--spacing-space-16),
        calc((100vw - var(--container-7xl)) / 2 + var(--spacing-space-16))
    );
    gap: var(--spacing-space-8);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.noteTitle {
    align-self: stretch;
    margin: 0;
    font-size: var(--type-size-h2-section-title);
    font-weight: 800;
    color: var(--color-text-secondary);
}

.noteText {
    align-self: stretch;
    margin: 0;
    font-size: var(--type-size-body-main);
    font-weight: 300;
    white-space: pre-line;
}

/* Architecture */

.architectureSection {
    justify-content: center;
    box-sizing: border-box;
    min-height: 730px;
    padding: var(--spacing-space-4) var(--spacing-space-16);
    gap: var(--spacing-space-8);
}

.architectureTitle {
    margin: 0;
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.architectureImage {
    display: block;
    width: min(100%, 768px);
    height: 419px;
    flex-shrink: 0;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    box-sizing: border-box;
    background-color: var(--color-main-surface);
    object-fit: cover;
}

.architectureContent {
    display: flex;
    align-items: center;
    align-self: stretch;
    gap: var(--spacing-space-4);
}

.architectureStack {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    gap: var(--spacing-space-2);
}

/* Stack */

.stackGroup {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    gap: 8px;
}

.stackGroupHeading {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-space-2);
}

.stackGroupIcon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    object-fit: contain;
}

.stackGroupLabel {
    color: var(--color-text-primary);
    font-size: var(--type-size-body-main);
    font-weight: 300;
}

.stackChips {
    display: flex;
    align-items: center;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 4px;
}

.stackChip {
    position: relative;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    padding: 4px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    cursor: default;
    transition: border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
}

.stackChip:hover,
.stackChip:focus-visible {
    z-index: 3;
    border-color: var(--color-text-primary);
    box-shadow: 0 3px 8px rgb(0 0 0 / 10%);
    transform: translateY(-2px);
}

.stackChip:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.stackChipIcon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}

.stackChipLabel {
    position: absolute;
    bottom: calc(100% + var(--spacing-space-2));
    left: 50%;
    z-index: 4;
    box-sizing: border-box;
    width: max-content;
    max-width: 180px;
    border: 1px solid var(--color-button-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-space-1) var(--spacing-space-2);
    background-color: var(--color-button-text-secondary);
    box-shadow: 0 6px 12px rgb(0 0 0 / 18%);
    color: var(--color-button-secondary);
    font-size: var(--type-size-caption);
    font-weight: 600;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, 4px);
    transition: opacity 160ms ease, transform 160ms ease;
}

.stackChipLabel::after {
    position: absolute;
    top: calc(100% - 4px);
    left: 50%;
    width: 8px;
    height: 8px;
    border-right: 1px solid var(--color-button-border);
    border-bottom: 1px solid var(--color-button-border);
    background-color: var(--color-button-text-secondary);
    content: "";
    transform: translateX(-50%) rotate(45deg);
}

.stackChip:hover .stackChipLabel,
.stackChip:focus-visible .stackChipLabel {
    opacity: 1;
    transform: translate(-50%, 0);
}

/* Features, challenges, and lessons */

.insightsSection {
    align-items: flex-start;
    justify-content: center;
    box-sizing: border-box;
    min-height: 1080px;
    padding: var(--spacing-space-4) var(--spacing-space-16);
    gap: var(--spacing-space-8);
}

.insightGroup {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    align-self: stretch;
    gap: var(--spacing-space-8);
}

.insightTitle {
    align-self: stretch;
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.insightList {
    display: grid;
    align-self: stretch;
    margin: 0;
    padding-left: 27px;
    gap: var(--spacing-space-3);
    color: var(--color-text-primary);
    font-size: var(--type-size-body-main);
    font-weight: 300;
    line-height: 1.6;
    list-style-position: outside;
    list-style-type: disc;
}

.insightList li {
    display: list-item;
    padding-left: var(--spacing-space-1);
}

.insightList li::marker {
    color: var(--color-main-primary);
    font-size: 1.15em;
}

.insightList strong {
    font-weight: 600;
}

/* Skeleton + not found */

.skeletonBlock {
    border-radius: var(--radius-xl);
    background:
        linear-gradient(
            262.31deg,
            var(--color-button-primary) 0%,
            var(--color-main-surface) 100%
        );
    background-size: 180% 100%;
    animation: detailSkeletonShimmer 1.4s ease-in-out infinite alternate;
}

.skeletonTitle {
    width: 180px;
    height: 34px;
}

.skeletonHero {
    align-self: stretch;
    height: 320px;
}

.skeletonLine {
    align-self: stretch;
    height: 20px;
    border-radius: var(--radius-base);
}

.skeletonLineShort {
    width: 60%;
    height: 20px;
    border-radius: var(--radius-base);
}

.notFound {
    align-items: center;
    justify-content: center;
    padding: 48px 16px;
    gap: 16px;
    text-align: center;
}

@keyframes detailSkeletonShimmer {
    from {
        background-position: 0% 50%;
    }

    to {
        background-position: 100% 50%;
    }
}

@media (max-width: 767px) {
    .detailOverviewSection {
        padding: var(--spacing-space-8);
    }

    .noteSection {
        padding: var(--spacing-space-16) var(--spacing-space-8);
    }

    .architectureSection {
        min-height: auto;
        padding: var(--spacing-space-8);
    }

    .architectureContent {
        flex-direction: column;
        align-items: stretch;
    }

    .architectureImage {
        width: 100%;
        height: auto;
        aspect-ratio: 768 / 419;
    }

    .insightsSection {
        min-height: auto;
        padding: var(--spacing-space-16) var(--spacing-space-8);
    }

    .metricCard {
        width: 115px;
    }
}
</style>
