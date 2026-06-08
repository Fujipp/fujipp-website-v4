<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { FilterButton, TableNextBackButton } from "@/shared/ui/buttons";

export type FeatureCategory = "Permanent Feature" | "Rental Feature";

export interface FeatureTableRow {
    category: FeatureCategory;
    expire: string;
    feature: string;
    id: string | number;
}

interface Props {
    emptyMessage?: string;
    itemsPerPage?: number;
    rows: readonly FeatureTableRow[];
}

const props = withDefaults(defineProps<Props>(), {
    emptyMessage: "No features found.",
    itemsPerPage: 5,
});

const emit = defineEmits<{
    filter: [];
    first: [];
    last: [];
    next: [];
    previous: [];
}>();

const currentPage = ref(1);
const filterWrap = ref<HTMLElement | null>(null);
const isFilterOpen = ref(false);
const searchQuery = ref("");
const selectedCategories = ref<FeatureCategory[]>([]);

const categoryOptions = computed(() => [...new Set(props.rows.map((row) => row.category))]);
const activeFilterCount = computed(() => selectedCategories.value.length);

const filteredRows = computed(() => {
    const normalizedSearch = searchQuery.value.trim().toLowerCase();
    const categoryRows = selectedCategories.value.length === 0
        ? props.rows
        : props.rows.filter((row) => selectedCategories.value.includes(row.category));

    if (!normalizedSearch) return categoryRows;

    return categoryRows.filter((row) => (
        row.feature.toLowerCase().includes(normalizedSearch)
        || row.category.toLowerCase().includes(normalizedSearch)
        || row.expire.toLowerCase().includes(normalizedSearch)
    ));
});

const pageSize = computed(() => Math.max(1, props.itemsPerPage));
const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)));
const paginatedRows = computed(() => {
    const safePage = Math.min(currentPage.value, pageCount.value);
    const start = (safePage - 1) * pageSize.value;

    return filteredRows.value.slice(start, start + pageSize.value);
});
const fillerRowCount = computed(() => (
    filteredRows.value.length > 0
        ? Math.max(0, pageSize.value - paginatedRows.value.length)
        : 0
));

const visiblePageNumbers = computed(() => {
    const pages = new Set<number>([currentPage.value]);

    if (currentPage.value > 1) pages.add(currentPage.value - 1);
    if (currentPage.value < pageCount.value) pages.add(currentPage.value + 1);

    return [...pages].sort((left, right) => left - right);
});

function goToPage(page: number): void {
    currentPage.value = Math.min(Math.max(page, 1), pageCount.value);
}

function toggleCategory(category: FeatureCategory): void {
    selectedCategories.value = selectedCategories.value.includes(category)
        ? selectedCategories.value.filter((value) => value !== category)
        : [...selectedCategories.value, category];
    goToPage(1);
}

function clearFilters(): void {
    selectedCategories.value = [];
    goToPage(1);
}

function closeFilterOnOutsideClick(event: MouseEvent): void {
    if (!isFilterOpen.value || !filterWrap.value) return;

    if (!filterWrap.value.contains(event.target as Node)) {
        isFilterOpen.value = false;
    }
}

function closeFilterOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") {
        isFilterOpen.value = false;
    }
}

watch(selectedCategories, () => {
    goToPage(1);
});

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
    <section :class="$style.featureTable" aria-label="Features table">
        <nav :class="$style.tableNav" aria-label="Feature table controls">
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

            <label :class="$style.searchField">
                <img
                    src="/images/icons/common/search.svg"
                    alt=""
                    aria-hidden="true"
                    :class="$style.searchIcon"
                    draggable="false"
                >
                <input
                    v-model="searchQuery"
                    :class="$style.searchInput"
                    type="search"
                    placeholder="Search"
                    autocomplete="off"
                >
            </label>
        </nav>

        <div :class="$style.tablePanel">
            <div :class="[$style.tableHeader, 'type-body-main-sb']" role="row">
                <span>No</span>
                <span>Feature</span>
                <span :class="$style.desktopCell">Category</span>
                <span>Expire</span>
            </div>
            <div :class="$style.divider" />

            <div
                v-for="(row, index) in paginatedRows"
                :key="row.id"
                :class="[$style.tableRow, 'type-body-main-r']"
                role="row"
            >
                <span :class="$style.noCell">{{ ((currentPage - 1) * pageSize) + index + 1 }}</span>
                <span :class="$style.featureCell">{{ row.feature }}</span>
                <span :class="[$style.categoryCell, $style.desktopCell]">{{ row.category }}</span>
                <span :class="$style.expireCell">{{ row.expire }}</span>
            </div>
            <div
                v-for="index in fillerRowCount"
                :key="`feature-filler-${index}`"
                :class="[$style.tableRow, $style.fillerRow]"
                aria-hidden="true"
            />

            <p v-if="filteredRows.length === 0" :class="$style.emptyState" class="type-body-main-r">
                {{ emptyMessage }}
            </p>
        </div>

        <footer
            :class="$style.tableFoot"
            aria-label="Feature table pagination"
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
.featureTable {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 17px;
}

.tableNav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-4);
    padding-block: 10px;
    overflow: hidden;
}

.filterWrap {
    position: relative;
}

.filterMenu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 10;
    display: flex;
    width: 260px;
    flex-direction: column;
    box-sizing: border-box;
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
    width: 16px;
    height: 16px;
    flex-shrink: 0;
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

.searchField {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: min(100%, 311px);
    height: 42px;
    padding: 12px 16px;
    gap: 16px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-full);
    background-color: var(--color-input-bg);
}

.searchIcon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.72;
}

.searchInput {
    min-width: 0;
    flex: 1;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--color-text-input);
    font: inherit;
    font-size: 18px;
    font-weight: 300;
    line-height: 1;
}

.searchInput::placeholder {
    color: var(--color-input-placeholder);
}

.tablePanel {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 528px;
    box-sizing: border-box;
    padding: 10px;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.tableHeader,
.tableRow {
    display: grid;
    grid-template-columns: 72px minmax(180px, 1.4fr) minmax(160px, 1fr) minmax(160px, 1fr);
    align-items: center;
    box-sizing: border-box;
    min-height: 32px;
    gap: var(--spacing-space-4);
    text-align: left;
}

.tableRow {
    transition: background-color 160ms ease;
}

.tableRow:hover {
    background-color: var(--color-table-row-hover);
}

.fillerRow:hover {
    background-color: transparent;
}

.divider {
    height: 1px;
    background-color: var(--color-main-divider);
}

.noCell {
    color: var(--color-text-disabled);
}

.featureCell,
.categoryCell,
.expireCell {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.emptyState {
    margin: auto 0;
    padding: var(--spacing-space-8);
    text-align: center;
}

.tableFoot {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-space-3);
}

.pageButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    border: 1px solid var(--color-main-secondary);
    border-radius: var(--radius-full);
    background-color: var(--color-main-secondary);
    color: var(--color-button-secondary-btn-text);
    cursor: pointer;
}

.currentPage {
    border-color: var(--color-main-primary);
    background-color: var(--color-main-primary);
}

.pageButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

@media (max-width: 760px) {
    .tableNav {
        align-items: flex-start;
        flex-direction: row;
        flex-wrap: wrap;
    }

    .searchField {
        width: min(100%, 311px);
    }

    .tableHeader,
    .tableRow {
        grid-template-columns: 48px minmax(92px, 1fr) minmax(104px, 0.9fr);
        gap: 8px;
        font-size: 14px;
    }

    .desktopCell {
        display: none;
    }
}
</style>
