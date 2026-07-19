<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { ActionButton, FilterButton } from "@/shared/ui/buttons";
import { CheckboxInput } from "@/shared/ui/inputs";
import { TablePagination } from "@/shared/ui/paginations";
import { StatusTag } from "@/shared/ui/tags";
import { SearchField } from "@/shared/ui/fields";
import type { ProjectStatus, ProjectTableRow } from "@/config";

interface Props {
    emptyMessage?: string;
    errorMessage?: string | null;
    itemsPerPage?: number;
    loading?: boolean;
    rows: readonly ProjectTableRow[];
    searchPlaceholder?: string;
    showAdminActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    emptyMessage: "No projects found.",
    errorMessage: null,
    itemsPerPage: 5,
    loading: false,
    searchPlaceholder: "Search",
    showAdminActions: false,
});

const emit = defineEmits<{
    add: [];
    filter: [];
    rowClick: [row: ProjectTableRow];
}>();

const searchQuery = ref("");
const isFilterOpen = ref(false);
const filterWrap = ref<HTMLElement | null>(null);
const selectedCategories = ref<string[]>([]);
const selectedStatuses = ref<ProjectStatus[]>([]);
const currentPage = ref(1);

const categoryOptions = computed(() => [...new Set(props.rows.map((row) => row.category))]);
const statusOptions = computed(() => [...new Set(props.rows.map((row) => row.status))]);

const activeFilterCount = computed(() => selectedCategories.value.length + selectedStatuses.value.length);
const pageSize = computed(() => Math.max(1, props.itemsPerPage));

const filteredRows = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const hasCategoryFilter = selectedCategories.value.length > 0;
    const hasStatusFilter = selectedStatuses.value.length > 0;

    return props.rows.filter((row) => {
        const matchesSearch = !query || [
            row.projectName,
            row.description,
            ...row.stack,
        ].some((value) => value.toLowerCase().includes(query));

        const matchesCategory = !hasCategoryFilter || selectedCategories.value.includes(row.category);
        const matchesStatus = !hasStatusFilter || selectedStatuses.value.includes(row.status);

        return matchesSearch && matchesCategory && matchesStatus;
    });
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)));
const paginatedRows = computed(() => {
    const safePage = Math.min(currentPage.value, pageCount.value);
    const start = (safePage - 1) * pageSize.value;

    return filteredRows.value.slice(start, start + pageSize.value);
});

function goToPage(page: number): void {
    currentPage.value = Math.min(Math.max(page, 1), pageCount.value);
}

function toggleCategory(category: string, checked: boolean): void {
    selectedCategories.value = checked
        ? [...selectedCategories.value, category]
        : selectedCategories.value.filter((value) => value !== category);
    goToPage(1);
}

function toggleStatus(status: ProjectStatus, checked: boolean): void {
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

function closeFilterOnOutsideClick(event: MouseEvent): void {
    if (!isFilterOpen.value || !filterWrap.value) {
        return;
    }

    if (!filterWrap.value.contains(event.target as Node)) {
        isFilterOpen.value = false;
    }
}

function closeFilterOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") {
        isFilterOpen.value = false;
    }
}

watch(searchQuery, () => {
    goToPage(1);
});

watch(pageCount, (count) => {
    if (currentPage.value > count) {
        currentPage.value = count;
    }
});

onMounted(() => {
    document.addEventListener("click", closeFilterOnOutsideClick);
    document.addEventListener("keydown", closeFilterOnEscape);
});

onUnmounted(() => {
    document.removeEventListener("click", closeFilterOnOutsideClick);
    document.removeEventListener("keydown", closeFilterOnEscape);
});
</script>

<template>
    <section :class="$style.projectTable" aria-label="Projects table">
        <nav :class="$style.tableNav" aria-label="Project table controls">
            <div :class="$style.filterActions">
                <div ref="filterWrap" :class="$style.filterWrap">
                    <FilterButton
                        :arrow-direction="isFilterOpen ? 'up' : 'down'"
                        :count="activeFilterCount"
                        @click="isFilterOpen = !isFilterOpen; emit('filter')"
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
                <ActionButton
                    v-if="showAdminActions"
                    action="add"
                    aria-label="Add project"
                    @click="emit('add')"
                />
            </div>
            <SearchField v-model="searchQuery" :placeholder="searchPlaceholder" />
        </nav>

        <div :class="$style.tablePanel">
            <div :class="$style.tableHeader" role="row">
                <span :class="$style.noCol">No</span>
                <span>Project</span>
                <span :class="$style.desktopCell">Description</span>
                <span :class="$style.desktopCell">Stack</span>
                <span :class="$style.desktopCell">Category</span>
                <span :class="$style.statusCol">Status</span>
            </div>
            <div :class="$style.divider" />

            <button
                v-for="(row, index) in paginatedRows"
                :key="row.id"
                type="button"
                :class="$style.tableRow"
                @click="emit('rowClick', row)"
            >
                <span :class="[$style.noCol, $style.noCell]">{{ ((currentPage - 1) * pageSize) + index + 1 }}</span>
                <span :class="$style.textCell">{{ row.projectName }}</span>
                <span :class="[$style.textCell, $style.desktopCell]">{{ row.description }}</span>
                <span :class="[$style.stackCell, $style.desktopCell]">
                    <ul :class="$style.stackList">
                        <li v-for="item in row.stack" :key="item">{{ item }}</li>
                    </ul>
                </span>
                <span :class="[$style.textCell, $style.desktopCell]">{{ row.category }}</span>
                <span :class="$style.statusCell">
                    <StatusTag table :status="row.status" />
                </span>
            </button>

            <p
                v-if="loading && rows.length === 0"
                :class="$style.emptyState"
            >
                Loading projects...
            </p>
            <p
                v-else-if="errorMessage && rows.length === 0"
                :class="[$style.emptyState, $style.errorState]"
                role="alert"
            >
                {{ errorMessage }}
            </p>
            <p v-else-if="filteredRows.length === 0" :class="$style.emptyState">
                {{ emptyMessage }}
            </p>
        </div>

        <TablePagination
            :model-value="currentPage"
            :page-count="pageCount"
            @update:model-value="goToPage"
        />
    </section>
</template>

<style module>
.projectTable {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: 8px;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    transition: color 300ms ease;
}

.tableNav {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    align-self: stretch;
    flex-wrap: wrap;
    box-sizing: border-box;
    padding: 10px 0;
    gap: 10px 20px;
}

.filterWrap {
    position: relative;
    z-index: 2;
}

.filterActions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.filterMenu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 260px;
    padding: 12px;
    gap: 12px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
    box-shadow: 0 8px 12px rgb(0 0 0 / 14%);
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
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

.clearButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.clearButton:disabled {
    color: var(--color-text-disabled);
    cursor: not-allowed;
}

.tablePanel {
    position: relative;
    display: flex;
    flex-direction: column;
    align-self: stretch;
    box-sizing: border-box;
    height: 544px;
    max-height: 544px;
    padding: 12px 16px;
    gap: 8px;
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    transition: background-color 300ms ease, border-color 300ms ease;
}

.tableHeader,
.tableRow {
    display: grid;
    grid-template-columns:
        minmax(24px, 48px)
        minmax(0, 200px)
        minmax(0, 1fr)
        minmax(0, 180px)
        minmax(0, 210px)
        148px;
    align-items: start;
    width: 100%;
    gap: 8px;
}

.tableHeader {
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-main);
    font-weight: 600;
    text-align: left;
}

.noCol {
    text-align: left;
}

.statusCol {
    text-align: center;
}

.tableRow {
    height: 88px;
    max-height: 88px;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: var(--radius-lg);
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: var(--type-size-body-main);
    text-align: left;
    cursor: pointer;
    transition: background-color 160ms ease;
}

.tableRow:hover {
    background-color: var(--color-table-row-hover);
}

.tableRow:active {
    background-color: var(--color-table-row-active);
}

.tableRow:focus-visible {
    background-color: var(--color-table-row-focus);
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.divider {
    align-self: stretch;
    height: 1px;
    border-top: 1px solid var(--color-main-divider);
    transition: border-color 300ms ease;
}

.noCell {
    font-weight: 600;
}

.textCell {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    font-weight: 300;
    text-overflow: ellipsis;
}

.stackCell {
    overflow: hidden;
    font-size: var(--type-size-body-small);
    font-weight: 300;
}

.stackList {
    margin: 0;
    padding-left: 24px;
    max-height: calc(1.4em * 3);
    overflow: hidden;
    list-style-position: outside;
    list-style-type: disc;
}

.stackList li:nth-child(n + 4) {
    display: none;
}

.statusCell {
    display: flex;
    justify-content: center;
    min-width: 0;
}

.emptyState {
    position: absolute;
    top: 50%;
    left: 50%;
    width: max-content;
    max-width: 90%;
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-body-main);
    font-weight: 300;
    text-align: center;
    transform: translate(-50%, -50%);
}

.errorState {
    color: var(--color-status-error);
}

@media (max-width: 767px) {
    .tablePanel {
        height: 555px;
        max-height: 555px;
    }

    .tableHeader,
    .tableRow {
        grid-template-columns: minmax(24px, 48px) minmax(0, 1fr) 134px;
        gap: 8px;
    }

    .tableHeader {
        font-size: var(--type-size-caption);
    }

    .tableRow {
        font-size: var(--type-size-caption);
    }

    .desktopCell {
        display: none;
    }

    .textCell {
        -webkit-line-clamp: 2;
    }
}
</style>
