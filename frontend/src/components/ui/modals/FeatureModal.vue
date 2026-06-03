<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { FilterButton, NextBackButton } from "@/components/ui/buttons";
import { TableStatus } from "@/components/ui/tags";
import { SearchText } from "@/components/ui/text";
import type { ProjectTableRow } from "@/components/layout";

interface Props {
    disabled?: boolean;
    errorMessage?: string | null;
    modelValue: readonly ProjectTableRow["id"][];
    rows: readonly ProjectTableRow[];
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    errorMessage: null,
});

const emit = defineEmits<{
    cancel: [];
    save: [projectIds: ProjectTableRow["id"][]];
    "update:modelValue": [projectIds: ProjectTableRow["id"][]];
}>();

const MAX_FEATURED = 3;
const PAGE_SIZE = 3;
const searchQuery = ref("");
const activeSlot = ref(0);
const currentPage = ref(1);
const isFilterOpen = ref(false);
const filterWrap = ref<HTMLElement | null>(null);
const selectedCategories = ref<string[]>([]);
const selectedStatuses = ref<ProjectTableRow["status"][]>([]);
const selectedIds = ref<ProjectTableRow["id"][]>(normalizeSelectedIds(props.modelValue));

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

function normalizeSelectedIds(ids: readonly ProjectTableRow["id"][]): ProjectTableRow["id"][] {
    const availableIds = new Set(props.rows.map((row) => String(row.id)));
    const normalized: ProjectTableRow["id"][] = [];

    for (const id of ids) {
        if (normalized.length >= MAX_FEATURED) break;

        if (availableIds.has(String(id)) && !normalized.some((item) => String(item) === String(id))) {
            normalized.push(id);
        }
    }

    return normalized;
}

function isSelected(row: ProjectTableRow): boolean {
    return selectedIds.value.some((id) => String(id) === String(row.id));
}

function getSelectedSlot(row: ProjectTableRow): number {
    return selectedIds.value.findIndex((id) => String(id) === String(row.id));
}

function setActiveSlot(slot: number): void {
    activeSlot.value = slot;
}

function goToPage(page: number): void {
    currentPage.value = Math.min(Math.max(page, 1), pageCount.value);
}

function toggleCategory(category: string): void {
    selectedCategories.value = selectedCategories.value.includes(category)
        ? selectedCategories.value.filter((value) => value !== category)
        : [...selectedCategories.value, category];
    goToPage(1);
}

function toggleStatus(status: ProjectTableRow["status"]): void {
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

function assignProject(row: ProjectTableRow): void {
    const existingSlot = getSelectedSlot(row);

    if (existingSlot >= 0) {
        selectedIds.value.splice(existingSlot, 1);
        activeSlot.value = Math.min(existingSlot, MAX_FEATURED - 1);
        syncSelection();
        return;
    }

    if (activeSlot.value < selectedIds.value.length) {
        selectedIds.value[activeSlot.value] = row.id;
    } else {
        selectedIds.value.push(row.id);
    }

    selectedIds.value = selectedIds.value.slice(0, MAX_FEATURED);

    activeSlot.value = Math.min(selectedIds.value.length, MAX_FEATURED - 1);
    syncSelection();
}

function syncSelection(): void {
    emit("update:modelValue", [...selectedIds.value]);
}

function saveFeatured(): void {
    emit("save", [...selectedIds.value]);
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
        selectedIds.value = normalizeSelectedIds(value);
    },
);

watch(
    () => props.rows,
    () => {
        selectedIds.value = normalizeSelectedIds(selectedIds.value);
        syncSelection();
        goToPage(1);
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
});

onUnmounted(() => {
    window.removeEventListener("keydown", closeOnEscape);
    document.removeEventListener("click", closeFilterOnOutsideClick);
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
                <header :class="$style.header">
                    <div :class="$style.titleRow">
                        <h2 id="feature-modal-title" :class="$style.title">EDIT FEATURED</h2>
                        <div :class="$style.slotList" aria-label="Featured order slots">
                            <button
                                v-for="slot in MAX_FEATURED"
                                :key="slot"
                                type="button"
                                :class="[
                                    $style.slotButton,
                                    activeSlot === slot - 1 ? $style.activeSlot : '',
                                    selectedIds[slot - 1] ? $style.filledSlot : '',
                                ]"
                                :aria-pressed="activeSlot === slot - 1"
                                @click="setActiveSlot(slot - 1)"
                            >
                                <span :class="$style.radio" aria-hidden="true">
                                    <span v-if="activeSlot === slot - 1" :class="$style.radioDot" />
                                </span>
                                {{ slot }}
                            </button>
                        </div>
                    </div>
                    <hr :class="$style.divider">
                    <div :class="$style.controls">
                        <div ref="filterWrap" :class="$style.filterWrap">
                            <FilterButton
                                :label="activeFilterCount ? `Filter (${activeFilterCount})` : 'Filter'"
                                :open="isFilterOpen"
                                @click="isFilterOpen = !isFilterOpen"
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
                        <SearchText v-model="searchQuery" placeholder="Search" />
                    </div>
                </header>

                <div :class="$style.tablePanel">
                    <div :class="[$style.tableHeader, 'type-body-main-sb']" role="row">
                        <span>No</span>
                        <span>Project</span>
                        <span>Category</span>
                        <span>Status</span>
                    </div>
                    <hr :class="$style.divider">
                    <button
                        v-for="(row, index) in paginatedRows"
                        :key="row.id"
                        type="button"
                        :class="[$style.tableRow, isSelected(row) ? $style.tableRowSelected : '', 'type-body-main-r']"
                        @click="assignProject(row)"
                    >
                        <span :class="$style.noCell">
                            {{ isSelected(row) ? getSelectedSlot(row) + 1 : ((currentPage - 1) * PAGE_SIZE) + index + 1 }}
                        </span>
                        <span :class="$style.projectCell">{{ row.projectName }}</span>
                        <span :class="$style.categoryCell">{{ row.category }}</span>
                        <span :class="$style.statusCell">
                            <TableStatus :status="row.status" />
                        </span>
                    </button>
                    <p v-if="filteredRows.length === 0" :class="$style.emptyState" class="type-body-main-r">
                        No projects found.
                    </p>
                </div>

                <div :class="$style.pagination" aria-label="Featured project pagination">
                    <NextBackButton
                        :previous-disabled="currentPage === 1"
                        :next-disabled="currentPage === pageCount"
                        @previous="goToPage(currentPage - 1)"
                        @next="goToPage(currentPage + 1)"
                    />
                    <span :class="$style.pageText" class="type-button-r">{{ currentPage }}</span>
                </div>

                <p v-if="errorMessage" :class="$style.error" class="type-body-main-r" role="alert">
                    {{ errorMessage }}
                </p>

                <footer :class="$style.actions">
                    <button type="button" :class="[$style.button, $style.cancelButton]" @click="emit('cancel')">
                        Cancel
                    </button>
                    <button
                        type="button"
                        :class="[$style.button, $style.saveButton]"
                        :disabled="disabled"
                        @click="saveFeatured"
                    >
                        Save
                    </button>
                </footer>
            </section>
        </div>
    </Teleport>
</template>

<style module>
.backdrop {
    position: fixed;
    z-index: 60;
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
    box-sizing: border-box;
    width: min(1000px, 100%);
    max-height: calc(100dvh - (var(--spacing-space-4) * 2));
    padding: 10px;
    gap: 10px;
    overflow: hidden;
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
}

.header {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.titleRow,
.controls,
.slotList,
.actions {
    display: flex;
    align-items: center;
}

.titleRow {
    justify-content: space-between;
    gap: 20px;
}

.title {
    margin: 0;
    font-size: 2rem;
    font-weight: 600;
    line-height: normal;
}

.slotList {
    gap: 10px;
}

.slotButton {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-button-primary-btn-text-active);
    font: inherit;
    font-size: 1.375rem;
    font-weight: 300;
    cursor: pointer;
}

.radio {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    box-sizing: border-box;
    border: 1.5px solid var(--color-main-divider);
    border-radius: var(--radius-full);
    transition: width 160ms ease, height 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.activeSlot .radio {
    width: 26px;
    height: 26px;
    border-color: var(--color-main-primary);
    background-color: var(--color-main-primary);
}

.filledSlot:not(.activeSlot) .radio {
    border-color: var(--color-main-primary);
}

.radioDot {
    width: 10px;
    height: 10px;
    border-radius: var(--radius-full);
    background-color: var(--color-button-primary-btn-text-active);
}

.divider {
    width: 100%;
    height: 1px;
    margin: 0;
    border: 0;
    border-top: 1px solid var(--color-main-divider);
}

.controls {
    justify-content: space-between;
    min-height: 56px;
    padding: 0 10px;
    gap: 20px;
}

.tablePanel {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 10px;
    gap: 10px;
    overflow-y: auto;
    border-radius: var(--radius-xl);
    background-color: var(--color-main-bg);
}

.tableHeader,
.tableRow {
    display: grid;
    grid-template-columns: 40px minmax(220px, 1fr) minmax(150px, 0.55fr) 128px;
    align-items: start;
    width: 100%;
    gap: 20px;
}

.tableRow {
    min-height: 74px;
    padding: 8px;
    border: 1px solid transparent;
    border-radius: var(--radius-lg);
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease;
}

.tableRow:hover {
    background-color: var(--color-table-row-hover);
}

.tableRowSelected {
    border-color: var(--color-main-primary);
    background-color: var(--color-table-row-active);
}

.tableRow:focus-visible,
.slotButton:focus-visible,
.button:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.noCell {
    text-align: center;
}

.projectCell,
.categoryCell {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
}

.emptyState {
    margin: auto;
    color: var(--color-text-disabled);
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

.error {
    margin: 0;
    color: var(--color-status-error);
}

.actions {
    justify-content: center;
    gap: 10px;
}

.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    gap: 24px;
}

.pageText {
    color: var(--color-text-secondary);
}

.button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 160px;
    height: 48px;
    padding: 12px 16px;
    border: 1px solid transparent;
    border-radius: var(--radius-xl);
    color: var(--color-button-primary-btn-text-active);
    font-family: var(--font-sans);
    font-size: 1rem;
    font-weight: 300;
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease, opacity 160ms ease;
}

.button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.cancelButton {
    border-color: var(--color-button-secondary-btn-bg);
    background-color: var(--color-button-secondary-btn-bg);
}

.cancelButton:hover {
    border-color: var(--color-button-secondary-btn-hover);
    background-color: var(--color-button-secondary-btn-hover);
}

.saveButton {
    border-color: var(--color-button-primary-btn-bg);
    background-color: var(--color-button-primary-btn-bg);
}

.saveButton:hover:not(:disabled) {
    border-color: var(--color-button-primary-btn-hover);
    background-color: var(--color-button-primary-btn-hover);
}

@media (max-width: 767px) {
    .titleRow,
    .controls,
    .actions {
        align-items: stretch;
        flex-direction: column;
    }

    .tableHeader,
    .tableRow {
        grid-template-columns: 28px minmax(0, 1fr) 95px 90px;
        gap: 12px;
    }

    .button {
        width: 100%;
    }
}
</style>
