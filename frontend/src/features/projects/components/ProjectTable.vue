<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { ActionButton, FilterButton, TableNextBackButton } from "@/shared/ui/buttons";
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
    itemsPerPage: 10,
    loading: false,
    searchPlaceholder: "Search",
    showAdminActions: false,
});

const emit = defineEmits<{
    add: [];
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

function updateGlassPointer(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;

    if (!target) return;

    const rect = target.getBoundingClientRect();
    target.style.setProperty("--glass-pointer-x", `${event.clientX - rect.left}px`);
    target.style.setProperty("--glass-pointer-y", `${event.clientY - rect.top}px`);
}

function resetGlassPointer(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;

    if (!target) return;

    target.style.removeProperty("--glass-pointer-x");
    target.style.removeProperty("--glass-pointer-y");
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
                <ActionButton
                    v-if="showAdminActions"
                    variant="add"
                    aria-label="Add project"
                    @click="emit('add')"
                />
            </div>
            <SearchField v-model="searchQuery" :placeholder="searchPlaceholder" />
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
                    <StatusTag :status="row.status" />
                </span>
                <span :class="$style.mobileAction" aria-hidden="true">
                    <TableNextBackButton
                        direction="next"
                        label="View project"
                        step="single"
                    />
                </span>
            </button>

            <p
                v-if="loading && rows.length === 0"
                :class="$style.emptyState"
                class="type-body-main-r"
            >
                Loading projects...
            </p>
            <p
                v-else-if="errorMessage && rows.length === 0"
                :class="[$style.emptyState, $style.errorState]"
                class="type-body-main-r"
                role="alert"
            >
                {{ errorMessage }}
            </p>
            <p v-else-if="filteredRows.length === 0" :class="$style.emptyState" class="type-body-main-r">
                {{ emptyMessage }}
            </p>
        </div>

        <footer
            v-if="filteredRows.length > 0"
            :class="$style.tableFoot"
            aria-label="Project table pagination"
        >
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
                @pointermove="updateGlassPointer"
                @pointerleave="resetGlassPointer"
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
    color: var(--projects-card-text, var(--color-text-secondary));
    font-family: var(--font-sans);
    transition: color 300ms ease;
}

.tableNav {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 56px;
    padding: 10px;
    gap: 20px;
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
    border: 1px solid var(--projects-card-border, var(--color-main-border));
    border-radius: var(--radius-xl);
    background-color: var(--projects-card-bg, var(--color-main-surface));
    color: var(--projects-card-text, var(--color-text-secondary));
    box-shadow: 0 16px 40px color-mix(in srgb, var(--color-text-input) 30%, transparent);
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
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
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    height: 528px;
    padding: var(--spacing-space-4);
    gap: 10px;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background-color: var(--projects-card-bg, var(--color-main-surface));
    color: var(--projects-card-text, var(--color-text-secondary));
    border: 1px solid var(--projects-card-border, transparent);
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.tableHeader,
.tableRow {
    display: grid;
    grid-template-columns:
        minmax(48px, 0.34fr)
        minmax(190px, 1.25fr)
        minmax(280px, 1.7fr)
        minmax(180px, 1.05fr)
        minmax(170px, 0.95fr)
        minmax(150px, 0.85fr);
    align-items: start;
    width: 100%;
    gap: var(--spacing-space-4);
}

.tableHeader {
    min-height: 32px;
    font-size: 1.25rem;
}

.tableRow {
    height: 135px;
    padding: 0;
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
    background-color: var(--projects-row-hover, var(--color-table-row-hover));
}

.tableRow:active {
    background-color: var(--projects-row-active, var(--color-table-row-active));
}

.tableRow:focus-visible {
    background-color: var(--projects-row-focus, var(--color-table-row-focus));
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.divider {
    width: 100%;
    height: 1px;
    border-top: 1px solid var(--projects-card-border, var(--color-main-divider));
    transition: border-color 300ms ease;
}

.noCell {
    text-align: center;
}

.projectCell,
.categoryCell {
    font-size: 1.25rem;
    font-weight: 300;
}

.descriptionCell,
.stackCell {
    font-size: 1.125rem;
    font-weight: 300;
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
    color: var(--projects-card-text, var(--color-text-secondary));
}

.stackList li:nth-child(n + 4) {
    display: none;
}

.mobileAction {
    display: none;
}

.emptyState {
    position: absolute;
    top: 50%;
    left: 50%;
    margin: 0;
    color: var(--color-text-disabled);
    font-size: 1.25rem;
    font-weight: 300;
    transform: translate(-50%, -50%);
}

.errorState {
    color: var(--color-status-error);
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
    --glass-foreground: var(--color-neutral-700);
    --glass-border: color-mix(in srgb, var(--color-neutral-600) 24%, transparent);
    --glass-border-hover: color-mix(in srgb, var(--color-neutral-700) 34%, transparent);
    --glass-highlight: color-mix(in srgb, var(--color-neutral-50) 82%, transparent);
    --glass-highlight-soft: color-mix(in srgb, var(--color-neutral-50) 48%, transparent);
    --glass-lowlight: color-mix(in srgb, var(--color-neutral-400) 40%, transparent);
    --glass-shadow: color-mix(in srgb, var(--color-neutral-900) 22%, transparent);
    --glass-shadow-hover: color-mix(in srgb, var(--color-neutral-900) 26%, transparent);
    --glass-pointer-color: color-mix(in srgb, var(--color-main-primary) 24%, var(--color-neutral-50) 54%);
    --glass-pointer-x: 50%;
    --glass-pointer-y: 50%;

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    padding: 10px;
    overflow: hidden;
    isolation: isolate;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-full);
    background:
        linear-gradient(
            150deg,
            var(--glass-highlight) 0%,
            var(--glass-highlight-soft) 42%,
            var(--glass-lowlight) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 72%, transparent),
        inset 0 -8px 16px var(--glass-lowlight),
        0 6px 18px var(--glass-shadow);
    backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    color: var(--glass-foreground);
    cursor: pointer;
    transition:
        border-color 220ms ease,
        box-shadow 220ms ease,
        transform 220ms ease;
}

:global(.dark) .pageButton,
:global([data-theme="dark"]) .pageButton {
    --glass-foreground: var(--color-neutral-50);
    --glass-border: color-mix(in srgb, var(--color-neutral-50) 16%, transparent);
    --glass-border-hover: color-mix(in srgb, var(--color-neutral-50) 26%, transparent);
    --glass-highlight: color-mix(in srgb, var(--color-neutral-50) 14%, transparent);
    --glass-highlight-soft: color-mix(in srgb, var(--color-neutral-50) 4%, transparent);
    --glass-lowlight: color-mix(in srgb, var(--color-neutral-900) 28%, transparent);
    --glass-shadow: color-mix(in srgb, var(--color-neutral-900) 35%, transparent);
    --glass-shadow-hover: color-mix(in srgb, var(--color-neutral-900) 40%, transparent);
    --glass-pointer-color: color-mix(in srgb, var(--color-neutral-50) 36%, var(--color-main-primary) 24%);
}

.pageButton::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background:
        radial-gradient(
            120% 80% at 50% -20%,
            color-mix(in srgb, var(--color-neutral-50) 62%, transparent) 0%,
            transparent 60%
        );
    opacity: 0.7;
    pointer-events: none;
}

.pageButton::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background:
        radial-gradient(
            circle 34px at var(--glass-pointer-x) var(--glass-pointer-y),
            var(--glass-pointer-color) 0%,
            transparent 70%
        );
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
}

.pageButton:hover::after,
.pageButton:focus-visible::after {
    opacity: 0.82;
}

.pageButton:hover {
    border-color: var(--glass-border-hover);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 78%, transparent),
        inset 0 -8px 16px var(--glass-lowlight),
        0 8px 22px var(--glass-shadow-hover);
}

.pageButton:active {
    transform: scale(0.97);
}

.pageButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.currentPage {
    width: 45px;
    color: var(--color-button-primary-btn-text-active);
    border-color: color-mix(in srgb, var(--color-main-primary) 60%, transparent);
    background:
        linear-gradient(
            150deg,
            color-mix(in srgb, var(--color-main-primary) 88%, var(--color-neutral-50) 12%) 0%,
            color-mix(in srgb, var(--color-main-primary) 68%, var(--color-neutral-900) 32%) 100%
        );
}

@media (min-width: 768px) and (max-width: 1023px) {
    .tableHeader,
    .tableRow {
        grid-template-columns:
            minmax(44px, 0.32fr)
            minmax(150px, 1.2fr)
            minmax(170px, 1.2fr)
            minmax(130px, 0.9fr)
            minmax(120px, 0.8fr)
            minmax(132px, 0.8fr);
        gap: var(--spacing-space-3);
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
        height: 528px;
        gap: 10px;
        font-size: 0.875rem;
    }

    .tableHeader,
    .tableRow {
        grid-template-columns: 32px minmax(0, 1fr) 95px 36px;
        height: 42px;
        gap: 20px;
    }

    .tableHeader {
        min-height: 30px;
        font-size: 1rem;
    }

    .tableRow {
        min-height: 42px;
    }

    .desktopCell {
        display: none;
    }

    .projectCell,
    .categoryCell {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        font-size: 1rem;
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
