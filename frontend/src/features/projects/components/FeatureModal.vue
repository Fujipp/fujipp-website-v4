<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { FilterButton, SecondaryButton } from "@/shared/ui/buttons";
import { CheckboxInput } from "@/shared/ui/inputs";
import { TablePagination } from "@/shared/ui/paginations";
import { SearchField } from "@/shared/ui/fields";
import { icons } from "@/config";
import type { ProjectTableRow } from "@/config";

interface Props {
    disabled?: boolean;
    /** Projects already featured in other slots — shown dimmed and not selectable. */
    excludeIds?: readonly ProjectTableRow["id"][];
    modelValue: ProjectTableRow["id"] | null;
    rows: readonly ProjectTableRow[];
    title?: string;
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    excludeIds: () => [],
    title: "Featured Project",
});

const emit = defineEmits<{
    cancel: [];
    save: [projectId: ProjectTableRow["id"] | null];
}>();

const PAGE_SIZE = 5;
const searchQuery = ref("");
const currentPage = ref(1);
const isFilterOpen = ref(false);
const filterWrap = ref<HTMLElement | null>(null);
const selectedCategories = ref<string[]>([]);
const selectedStatuses = ref<ProjectTableRow["status"][]>([]);
const selectedId = ref<ProjectTableRow["id"] | null>(props.modelValue);

const categoryOptions = computed(() => [...new Set(props.rows.map((row) => row.category))]);
const statusOptions = computed(() => [...new Set(props.rows.map((row) => row.status))]);
const activeFilterCount = computed(() => selectedCategories.value.length + selectedStatuses.value.length);

const filteredRows = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const hasCategoryFilter = selectedCategories.value.length > 0;
    const hasStatusFilter = selectedStatuses.value.length > 0;

    return props.rows.filter((row) => [
        row.projectName,
        row.category,
        row.status,
    ].some((value) => value.toLowerCase().includes(query))
        && (!hasCategoryFilter || selectedCategories.value.includes(row.category))
        && (!hasStatusFilter || selectedStatuses.value.includes(row.status)));
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)));
const paginatedRows = computed(() => {
    const safePage = Math.min(currentPage.value, pageCount.value);
    const start = (safePage - 1) * PAGE_SIZE;

    return filteredRows.value.slice(start, start + PAGE_SIZE);
});

/* Save only makes sense when the slot's selection actually changed. */
const hasChanges = computed(() => String(selectedId.value ?? "") !== String(props.modelValue ?? ""));

function isSelected(row: ProjectTableRow): boolean {
    return selectedId.value !== null && String(selectedId.value) === String(row.id);
}

function isExcluded(row: ProjectTableRow): boolean {
    return props.excludeIds.some((id) => String(id) === String(row.id));
}

function goToPage(page: number): void {
    currentPage.value = Math.min(Math.max(page, 1), pageCount.value);
}

function toggleCategory(category: string, checked: boolean): void {
    selectedCategories.value = checked
        ? [...selectedCategories.value, category]
        : selectedCategories.value.filter((value) => value !== category);
    goToPage(1);
}

function toggleStatus(status: ProjectTableRow["status"], checked: boolean): void {
    selectedStatuses.value = checked
        ? [...selectedStatuses.value, status]
        : selectedStatuses.value.filter((value) => value !== status);
    goToPage(1);
}

function clearFilters(): void {
    selectedCategories.value = [];
    selectedStatuses.value = [];
    goToPage(1);
}

function selectProject(row: ProjectTableRow): void {
    if (isExcluded(row)) {
        return;
    }

    selectedId.value = isSelected(row) ? null : row.id;
}

function saveFeatured(): void {
    emit("save", selectedId.value);
}

function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape" && isFilterOpen.value) {
        isFilterOpen.value = false;
    } else if (event.key === "Escape") {
        emit("cancel");
    }
}

function closeFilterOnOutsideClick(event: MouseEvent): void {
    if (!isFilterOpen.value || !filterWrap.value) {
        return;
    }

    if (!filterWrap.value.contains(event.target as Node)) {
        isFilterOpen.value = false;
    }
}

watch(
    () => props.modelValue,
    (value) => {
        selectedId.value = value;
    },
);

watch(searchQuery, () => {
    goToPage(1);
});

watch(pageCount, (count) => {
    if (currentPage.value > count) {
        currentPage.value = count;
    }
});

onMounted(() => {
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("click", closeFilterOnOutsideClick);
    document.body.style.overflow = "hidden";
});

onUnmounted(() => {
    window.removeEventListener("keydown", closeOnEscape);
    document.removeEventListener("click", closeFilterOnOutsideClick);
    document.body.style.overflow = "";
});
</script>

<template>
    <Teleport to="body">
        <div :class="$style.backdrop" @click.self="emit('cancel')">
            <section
                :class="$style.modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="feature-modal-title"
            >
                <h2 id="feature-modal-title" :class="$style.title">{{ title }}</h2>

                <div :class="$style.controls">
                    <div ref="filterWrap" :class="$style.filterWrap">
                        <FilterButton
                            :arrow-direction="isFilterOpen ? 'up' : 'down'"
                            :count="activeFilterCount"
                            @click="isFilterOpen = !isFilterOpen"
                        />
                        <div v-if="isFilterOpen" :class="$style.filterMenu" class="type-overline-r">
                            <section :class="$style.filterGroup">
                                <header :class="$style.filterGroupTitle" class="type-overline-sb">Category</header>
                                <label
                                    v-for="category in categoryOptions"
                                    :key="category"
                                    :class="$style.filterOption"
                                >
                                    <CheckboxInput
                                        :model-value="selectedCategories.includes(category)"
                                        size="s"
                                        @update:model-value="toggleCategory(category, $event)"
                                    />
                                    <span>{{ category }}</span>
                                </label>
                            </section>
                            <section :class="$style.filterGroup">
                                <header :class="$style.filterGroupTitle" class="type-overline-sb">Status</header>
                                <label
                                    v-for="status in statusOptions"
                                    :key="status"
                                    :class="$style.filterOption"
                                >
                                    <CheckboxInput
                                        :model-value="selectedStatuses.includes(status)"
                                        size="s"
                                        @update:model-value="toggleStatus(status, $event)"
                                    />
                                    <span>{{ status }}</span>
                                </label>
                            </section>
                            <button
                                :class="$style.clearButton"
                                class="type-overline-sb"
                                type="button"
                                :disabled="activeFilterCount === 0"
                                @click="clearFilters"
                            >
                                Clear filters
                            </button>
                        </div>
                    </div>
                    <SearchField v-model="searchQuery" :class="$style.search" placeholder="Search" />
                </div>

                <div :class="$style.tableHeader" role="row">
                    <span :class="$style.noCol">No</span>
                    <span>Project</span>
                    <span>Category</span>
                </div>
                <hr :class="$style.divider">

                <div :class="$style.rowList">
                    <button
                        v-for="(row, index) in paginatedRows"
                        :key="row.id"
                        type="button"
                        :class="[
                            $style.projectRow,
                            isSelected(row) ? $style.projectRowSelected : '',
                            isExcluded(row) ? $style.projectRowExcluded : '',
                        ]"
                        :aria-pressed="isSelected(row)"
                        :disabled="isExcluded(row)"
                        @click="selectProject(row)"
                    >
                        <span :class="$style.noCell">{{ ((currentPage - 1) * PAGE_SIZE) + index + 1 }}</span>
                        <span :class="$style.nameCell">{{ row.projectName }}</span>
                        <span :class="$style.categoryCell">{{ row.category }}</span>
                    </button>
                    <p v-if="filteredRows.length === 0" :class="$style.emptyState">
                        No projects found.
                    </p>
                </div>

                <TablePagination
                    :model-value="currentPage"
                    :page-count="pageCount"
                    @update:model-value="goToPage"
                />

                <hr :class="$style.divider">
                <div :class="$style.actions">
                    <SecondaryButton width-mode="hug" @click="emit('cancel')">
                        Close
                    </SecondaryButton>
                    <SecondaryButton
                        width-mode="hug"
                        :trailing-icon="icons.save"
                        :disabled="disabled || !hasChanges"
                        @click="saveFeatured"
                    >
                        Save
                    </SecondaryButton>
                </div>
            </section>
        </div>
    </Teleport>
</template>

<style module>
.backdrop {
    position: fixed;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    inset: 0;
    padding: var(--spacing-space-4);
    background-color: rgb(0 0 0 / 60%);
    backdrop-filter: blur(4px);
}

.modal {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    width: min(560px, 100%);
    height: min(768px, calc(100dvh - (var(--spacing-space-4) * 2)));
    padding: 12px 16px;
    gap: 8px;
    overflow-y: auto;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    text-align: left;
}

.title {
    margin: 0;
    font-size: var(--type-size-h3-card-title);
    font-weight: 600;
    text-align: center;
}

.controls {
    display: flex;
    align-items: flex-start;
    align-self: stretch;
    gap: 8px;
}

.filterWrap {
    position: relative;
    z-index: 2;
}

.filterMenu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 240px;
    padding: 12px;
    gap: 12px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    box-shadow: 0 8px 12px rgb(0 0 0 / 14%);
}

.filterGroup {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.filterGroupTitle {
    color: var(--color-text-secondary);
}

.filterOption {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.clearButton {
    align-self: flex-start;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-status-error);
    cursor: pointer;
    transition: opacity 180ms ease;
}

.clearButton:hover:not(:disabled) {
    opacity: 0.75;
}

.clearButton:disabled {
    color: var(--color-text-disabled);
    cursor: not-allowed;
}

.search {
    flex: 1;
    min-width: 0;
}

.tableHeader {
    display: grid;
    grid-template-columns: minmax(24px, 48px) minmax(0, 1fr) minmax(0, 210px);
    align-items: center;
    align-self: stretch;
    box-sizing: border-box;
    padding: 0 16px;
    gap: 8px;
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-main);
    font-weight: 600;
}

.noCol {
    text-align: left;
}

.divider {
    align-self: stretch;
    height: 1px;
    margin: 0;
    border: 0;
    border-top: 1px solid var(--color-main-divider);
}

.rowList {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: flex-start;
    align-self: stretch;
    min-height: 0;
    gap: 8px;
    overflow: hidden;
}

.projectRow {
    display: grid;
    grid-template-columns: minmax(24px, 48px) minmax(0, 1fr) minmax(0, 210px);
    align-items: center;
    align-self: stretch;
    box-sizing: border-box;
    /* Fixed-height rows pinned to the top of the locked list area. */
    height: 81px;
    flex-shrink: 0;
    padding: 12px 16px;
    gap: 8px;
    border: 1px solid transparent;
    border-radius: var(--radius-xl);
    background-color: transparent;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--type-size-body-main);
    text-align: left;
    cursor: pointer;
    transition: background-color 180ms ease, border-color 180ms ease, opacity 180ms ease;
}

.projectRow:hover:not(:disabled) {
    background-color: var(--color-table-row-hover);
}

.projectRow:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.projectRowSelected,
.projectRowSelected:hover:not(:disabled) {
    border-color: var(--color-main-divider);
}

.projectRowExcluded {
    cursor: not-allowed;
    opacity: 0.4;
}

.noCell {
    font-weight: 600;
}

.nameCell,
.categoryCell {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-weight: 300;
    text-overflow: ellipsis;
}

.emptyState {
    align-self: stretch;
    margin: 0;
    padding: 24px 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-body-main);
    font-weight: 300;
    text-align: center;
}

.actions {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 8px;
}
</style>
