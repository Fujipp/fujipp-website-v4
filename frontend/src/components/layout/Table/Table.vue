<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { FilterButton, TableNextBackButton } from "@/components/ui/buttons";
import { TableStatus } from "@/components/ui/tags";
import { SearchText } from "@/components/ui/text";

export type ProjectStatus = "Active" | "Completed" | "In Progress" | "Archived";

export interface ProjectTableRow {
    category: string;
    description: string;
    id: string | number;
    projectName: string;
    stack: readonly string[];
    status: ProjectStatus;
}

interface Props {
    itemsPerPage?: number;
    rows: readonly ProjectTableRow[];
    searchPlaceholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
    itemsPerPage: 5,
    searchPlaceholder: "Search",
});

const emit = defineEmits<{
    filter: [];
    next: [];
    previous: [];
    first: [];
    last: [];
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

const visiblePageNumbers = computed(() => {
    const pages = new Set<number>([currentPage.value]);

    if (currentPage.value > 1) {
        pages.add(currentPage.value - 1);
    }

    if (currentPage.value < pageCount.value) {
        pages.add(currentPage.value + 1);
    }

    return [...pages].sort((left, right) => left - right);
});

function goToPage(page: number): void {
    currentPage.value = Math.min(Math.max(page, 1), pageCount.value);
}

function toggleCategory(category: string): void {
    selectedCategories.value = selectedCategories.value.includes(category)
        ? selectedCategories.value.filter((value) => value !== category)
        : [...selectedCategories.value, category];
    goToPage(1);
}

function toggleStatus(status: ProjectStatus): void {
    selectedStatuses.value = selectedStatuses.value.includes(status)
        ? selectedStatuses.value.filter((value) => value !== status)
        : [...selectedStatuses.value, status];
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
            <div ref="filterWrap" :class="$style.filterWrap">
                <FilterButton
                    :label="activeFilterCount ? `Filter (${activeFilterCount})` : 'Filter'"
                    :open="isFilterOpen"
                    @click="isFilterOpen = !isFilterOpen; emit('filter')"
                />
                <div v-if="isFilterOpen" :class="$style.filterMenu" class="type-overline-r">
                    <section :class="$style.filterGroup">
                        <header :class="$style.filterGroupTitle" class="type-overline-sb">Category</header>
                        <label
                            v-for="category in categoryOptions"
                            :key="category"
                            :class="$style.checkboxRow"
                        >
                            <input
                                :class="$style.checkboxInput"
                                type="checkbox"
                                :checked="selectedCategories.includes(category)"
                                @change="toggleCategory(category)"
                            >
                            <span :class="$style.checkboxBox" aria-hidden="true" />
                            <span>{{ category }}</span>
                        </label>
                    </section>
                    <section :class="$style.filterGroup">
                        <header :class="$style.filterGroupTitle" class="type-overline-sb">Status</header>
                        <label
                            v-for="status in statusOptions"
                            :key="status"
                            :class="$style.checkboxRow"
                        >
                            <input
                                :class="$style.checkboxInput"
                                type="checkbox"
                                :checked="selectedStatuses.includes(status)"
                                @change="toggleStatus(status)"
                            >
                            <span :class="$style.checkboxBox" aria-hidden="true" />
                            <span>{{ status }}</span>
                        </label>
                    </section>
                    <button
                        v-if="activeFilterCount"
                        :class="$style.clearButton"
                        class="type-overline-sb"
                        type="button"
                        @click="clearFilters"
                    >
                        Clear filters
                    </button>
                </div>
            </div>
            <SearchText v-model="searchQuery" :placeholder="searchPlaceholder" />
        </nav>

        <div :class="$style.tablePanel">
            <div :class="[$style.tableHeader, 'type-body-main-sb']" role="row">
                <span>No</span>
                <span>Project</span>
                <span :class="$style.desktopCell">Description</span>
                <span :class="$style.desktopCell">Stack</span>
                <span>Category</span>
                <span :class="$style.desktopCell">Status</span>
            </div>
            <div :class="$style.divider" />

            <button
                v-for="(row, index) in paginatedRows"
                :key="row.id"
                type="button"
                :class="[$style.tableRow, 'type-body-main-r']"
                @click="emit('rowClick', row)"
            >
                <span :class="$style.noCell">{{ ((currentPage - 1) * pageSize) + index + 1 }}</span>
                <span :class="$style.projectCell">{{ row.projectName }}</span>
                <span :class="[$style.descriptionCell, $style.desktopCell]">{{ row.description }}</span>
                <span :class="[$style.stackCell, $style.desktopCell]">
                    <ul :class="$style.stackList">
                        <li v-for="item in row.stack" :key="item">{{ item }}</li>
                    </ul>
                </span>
                <span :class="$style.categoryCell">{{ row.category }}</span>
                <span :class="[$style.statusCell, $style.desktopCell]">
                    <TableStatus :status="row.status" />
                </span>
                <span :class="$style.mobileAction" aria-hidden="true">
                    <TableNextBackButton
                        direction="next"
                        label="View project"
                        step="single"
                    />
                </span>
            </button>

            <p v-if="filteredRows.length === 0" :class="$style.emptyState" class="type-body-main-r">
                No projects found.
            </p>
        </div>

        <footer :class="$style.tableFoot" aria-label="Project table pagination">
            <TableNextBackButton
                direction="previous"
                label="First page"
                step="double"
                :disabled="currentPage === 1"
                @click="goToPage(1); emit('first')"
            />
            <TableNextBackButton
                direction="previous"
                label="Previous page"
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1); emit('previous')"
            />
            <button
                v-for="page in visiblePageNumbers"
                :key="page"
                type="button"
                :class="[
                    $style.pageButton,
                    page === currentPage ? $style.currentPage : '',
                    page === currentPage ? 'type-button-sb' : 'type-button-r',
                ]"
                :aria-current="page === currentPage ? 'page' : undefined"
                @click="goToPage(page)"
            >
                {{ page }}
            </button>
            <TableNextBackButton
                direction="next"
                label="Next page"
                :disabled="currentPage === pageCount"
                @click="goToPage(currentPage + 1); emit('next')"
            />
            <TableNextBackButton
                direction="next"
                label="Last page"
                step="double"
                :disabled="currentPage === pageCount"
                @click="goToPage(pageCount); emit('last')"
            />
        </footer>
    </section>
</template>

<style module>
.projectTable {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 10px;
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
}

.tableNav {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 71px;
    padding: 10px;
    gap: 20px;
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
    width: 260px;
    padding: 12px;
    gap: 12px;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    box-shadow: 0 16px 40px color-mix(in srgb, var(--color-text-input) 30%, transparent);
}

.filterGroup {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.filterGroupTitle {
    color: var(--color-main-primary);
}

.checkboxRow {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.checkboxInput {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.checkboxBox {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    box-sizing: border-box;
    border: 1.5px solid var(--color-main-border);
    border-radius: var(--radius-base);
    transition: background-color 160ms ease, border-color 160ms ease;
}

.checkboxInput:checked + .checkboxBox {
    border-color: var(--color-main-primary);
    background-color: var(--color-main-primary);
}

.checkboxInput:checked + .checkboxBox::after {
    content: "";
    width: 8px;
    height: 5px;
    border-left: 2px solid var(--color-button-primary-btn-text-active);
    border-bottom: 2px solid var(--color-button-primary-btn-text-active);
    transform: rotate(-45deg) translateY(-1px);
}

.checkboxInput:focus-visible + .checkboxBox {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.clearButton {
    align-self: flex-start;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-main-primary);
    cursor: pointer;
}

.tablePanel {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-height: 528px;
    padding: 10px;
    gap: 10px;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
}

.tableHeader,
.tableRow {
    display: grid;
    grid-template-columns: 40px minmax(190px, 1.25fr) minmax(250px, 1.5fr) minmax(140px, 0.75fr) minmax(140px, 0.75fr) 143px;
    align-items: start;
    width: 100%;
    gap: 20px;
}

.tableRow {
    height: 135px;
    padding: 8px;
    overflow: hidden;
    border: 0;
    border-radius: var(--radius-lg);
    background: transparent;
    color: inherit;
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
    width: 100%;
    height: 1px;
    border-top: 1px solid var(--color-main-divider);
}

.noCell {
    text-align: center;
}

.projectCell,
.descriptionCell,
.categoryCell {
    overflow: hidden;
    text-overflow: ellipsis;
}

.projectCell,
.categoryCell {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
}

.descriptionCell {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
}

.stackList {
    margin: 0;
    padding-left: 24px;
    max-height: calc(1.4em * 3);
    overflow: hidden;
    list-style-position: outside;
    list-style-type: disc;
}

.stackList li {
    display: list-item;
}

.stackList li::marker {
    color: var(--color-text-secondary);
}

.stackList li:nth-child(n + 4) {
    display: none;
}

.mobileAction {
    display: none;
}

.emptyState {
    margin: auto;
    color: var(--color-text-disabled);
}

.tableFoot {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: 64px;
    padding: 10px;
    gap: 10px;
    text-align: center;
}

.pageButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    padding: 10px;
    border-radius: var(--radius-full);
    background-color: var(--color-main-surface);
}

.currentPage {
    width: 45px;
    color: var(--color-button-primary-btn-text-active);
}

@media (min-width: 768px) and (max-width: 1023px) {
    .tableHeader,
    .tableRow {
        grid-template-columns: 40px minmax(140px, 0.9fr) minmax(170px, 1fr) minmax(140px, 0.8fr) minmax(95px, 0.65fr) 143px;
        gap: 18px;
    }

    .tableRow {
        height: 135px;
    }
}

@media (max-width: 767px) {
    .projectTable {
        gap: 9px;
    }

    .tableNav {
        min-height: 56px;
        padding: 10px 0;
    }

    .tablePanel {
        min-height: 310px;
        gap: 10px;
        font-size: 0.875rem;
    }

    .tableHeader,
    .tableRow {
        grid-template-columns: 21px minmax(0, 1fr) 95px 36px;
        height: 42px;
        gap: 20px;
    }

    .tableHeader {
        min-height: 30px;
        font-size: 1rem;
    }

    .desktopCell {
        display: none;
    }

    .projectCell,
    .categoryCell {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
    }

    .mobileAction {
        display: flex;
        align-items: center;
        justify-content: flex-end;
    }

    .tableFoot {
        min-height: 64px;
        padding: 10px 0;
    }
}
</style>
