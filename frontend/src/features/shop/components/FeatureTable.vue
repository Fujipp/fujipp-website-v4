<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { FilterButton, TableNextBackButton } from "@/shared/ui/buttons";
import { SearchField } from "@/shared/ui/fields";

export type FeatureCategory = "Permanent Feature" | "Rental Feature";

export interface FeatureTableRow {
    category: FeatureCategory;
    usage: string;
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
        || row.usage.toLowerCase().includes(normalizedSearch)
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

// Glass page-button pointer glow — identical behaviour to the Projects table.
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

            <SearchField v-model="searchQuery" placeholder="Search" />
        </nav>

        <div :class="$style.tablePanel">
            <div :class="[$style.tableHeader, 'type-body-main-sb']" role="row">
                <span>No</span>
                <span>Feature</span>
                <span :class="$style.desktopCell">Category</span>
                <span>Usage</span>
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
                <span :class="$style.usageCell">{{ row.usage }}</span>
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
.featureTable {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 17px;
}

.tableNav {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-4);
    padding-block: 10px;
}

.filterWrap {
    position: relative;
    z-index: 2;
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
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
    /* box-shadow: 0 16px 40px color-mix(in srgb, var(--color-text-input) 30%, transparent); */
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

.tablePanel {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 528px;
    box-sizing: border-box;
    padding: 10px;
    overflow: hidden;
    border: 1px solid var(--shop-card-border, transparent);
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
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
    background-color: var(--shop-row-hover, var(--color-table-row-hover));
}

.fillerRow:hover {
    background-color: transparent;
}

.divider {
    height: 1px;
    background-color: var(--shop-card-border, var(--color-main-divider));
}

.noCell {
    color: var(--color-text-disabled);
}

.featureCell,
.categoryCell,
.usageCell {
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

/* Glass page buttons — identical to the Projects table pagination. */
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
