<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { FilterButton, PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { CheckboxInput } from "@/shared/ui/inputs";
import { TablePagination } from "@/shared/ui/paginations";
import { SearchField } from "@/shared/ui/fields";
import { icons } from "@/config";
import type { ProjectTableRow } from "@/config";

interface Props {
    disabled?: boolean;
    modelValue: readonly ProjectTableRow["id"][];
    rows: readonly ProjectTableRow[];
    title?: string;
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    title: "Top 3 Projects",
});

const emit = defineEmits<{
    cancel: [];
    save: [projectIds: ProjectTableRow["id"][]];
}>();

const PAGE_SIZE = 5;
const searchQuery = ref("");
const currentPage = ref(1);
const isFilterOpen = ref(false);
const filterWrap = ref<HTMLElement | null>(null);
const selectedCategories = ref<string[]>([]);
const selectedStatuses = ref<ProjectTableRow["status"][]>([]);
const selectedIds = ref<ProjectTableRow["id"][]>([...props.modelValue].slice(0, 3));
const isVisible = ref(true);
const isDraggingSheet = ref(false);
const sheetDragY = ref(0);
let sheetPointerId: number | null = null;
let sheetDragStartY = 0;
let sheetDragStartedAt = 0;
let pendingClose: "cancel" | "save" | null = null;

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
const hasChanges = computed(() => selectedIds.value.map(String).join(",") !== props.modelValue.map(String).join(","));

function isSelected(row: ProjectTableRow): boolean {
    return selectedIds.value.some((id) => String(id) === String(row.id));
}

function selectedRank(row: ProjectTableRow): number | null {
    const index = selectedIds.value.findIndex((id) => String(id) === String(row.id));
    return index >= 0 ? index + 1 : null;
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
    if (isSelected(row)) {
        selectedIds.value = selectedIds.value.filter((id) => String(id) !== String(row.id));
        return;
    }

    if (selectedIds.value.length < 3) selectedIds.value = [...selectedIds.value, row.id];
}

function requestClose(action: "cancel" | "save" = "cancel"): void {
    if (!isVisible.value) return;

    pendingClose = action;
    isFilterOpen.value = false;
    isVisible.value = false;
}

function finishClose(): void {
    if (pendingClose === "save") {
        emit("save", selectedIds.value);
    } else {
        emit("cancel");
    }
}

function saveFeatured(): void {
    requestClose("save");
}

function startSheetDrag(event: PointerEvent): void {
    if (window.innerWidth > 767 || !event.isPrimary) return;

    sheetPointerId = event.pointerId;
    sheetDragStartY = event.clientY;
    sheetDragStartedAt = performance.now();
    sheetDragY.value = 0;
    isDraggingSheet.value = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function moveSheetDrag(event: PointerEvent): void {
    if (sheetPointerId !== event.pointerId) return;
    sheetDragY.value = Math.max(0, event.clientY - sheetDragStartY);
}

function endSheetDrag(event: PointerEvent): void {
    if (sheetPointerId !== event.pointerId) return;

    const elapsed = Math.max(performance.now() - sheetDragStartedAt, 1);
    const velocity = sheetDragY.value / elapsed;
    const shouldClose = sheetDragY.value >= Math.min(120, window.innerHeight * 0.12)
        || (sheetDragY.value > 24 && velocity > 0.65);

    sheetPointerId = null;
    isDraggingSheet.value = false;

    if (shouldClose) {
        requestClose();
    } else {
        sheetDragY.value = 0;
    }
}

function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape" && isFilterOpen.value) {
        isFilterOpen.value = false;
    } else if (event.key === "Escape") {
        requestClose();
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
        selectedIds.value = [...value].slice(0, 3);
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
        <Transition
            appear
            :enter-active-class="$style.modalTransition"
            :enter-from-class="$style.modalHidden"
            :leave-active-class="$style.modalTransition"
            :leave-to-class="$style.modalHidden"
            @after-leave="finishClose"
        >
        <div v-if="isVisible" :class="$style.backdrop" @click.self="requestClose()">
            <section
                :class="[$style.modal, isDraggingSheet ? $style.modalDragging : '']"
                :style="{ '--sheet-drag-y': `${sheetDragY}px` }"
                role="dialog"
                aria-modal="true"
                aria-labelledby="feature-modal-title"
            >
                <button
                    :class="$style.sheetHandle"
                    type="button"
                    aria-label="ลากลงเพื่อปิด"
                    @pointerdown="startSheetDrag"
                    @pointermove="moveSheetDrag"
                    @pointerup="endSheetDrag"
                    @pointercancel="endSheetDrag"
                >
                    <span :class="$style.sheetIndicator" aria-hidden="true" />
                </button>
                <header :class="$style.header">
                    <div>
                        <p :class="$style.eyebrow">PROJECTS · FEATURED</p>
                        <h2 id="feature-modal-title" :class="$style.title">{{ title }}</h2>
                        <p :class="$style.subtitle">เลือกลำดับโปรเจกต์ที่ต้องการแสดง จาก Top 1 ถึง Top 3</p>
                    </div>
                    <span :class="$style.selectionCount">{{ selectedIds.length }}/3 selected</span>
                </header>

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
                    <span :class="$style.noCol">Rank</span>
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
                        ]"
                        :aria-pressed="isSelected(row)"
                        :disabled="!isSelected(row) && selectedIds.length >= 3"
                        @click="selectProject(row)"
                    >
                        <span :class="[$style.noCell, selectedRank(row) ? $style.rankSelected : '']">
                            {{ selectedRank(row) ? `Top ${selectedRank(row)}` : ((currentPage - 1) * PAGE_SIZE) + index + 1 }}
                        </span>
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
                    <SecondaryButton width-mode="hug" @click="requestClose()">
                        Close
                    </SecondaryButton>
                    <PrimaryButton
                        width-mode="hug"
                        :trailing-icon="icons.save"
                        :disabled="disabled || !hasChanges"
                        @click="saveFeatured"
                    >
                        Save
                    </PrimaryButton>
                </div>
            </section>
        </div>
        </Transition>
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
    padding: var(--spacing-space-6) var(--spacing-space-4);
    background-color: rgb(0 0 0 / 25%);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

.modal {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    box-sizing: border-box;
    width: min(680px, 100%);
    height: min(760px, calc(100dvh - (var(--spacing-space-6) * 2)));
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-4);
    overflow-y: auto;
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-2xl);
    background-color: var(--color-dialog-background);
    color: var(--color-dialog-text-primary);
    box-shadow: 0 16px 48px rgb(0 0 0 / 22%);
    font-family: var(--font-sans);
    text-align: left;
}

.modalTransition {
    transition: opacity 220ms ease;
}

.modalTransition .modal {
    transition: opacity 220ms ease, transform 280ms ease;
}

.modalHidden {
    opacity: 0;
}

.modalHidden .modal {
    opacity: 0;
    transform: translateY(var(--spacing-space-4)) scale(0.98);
}

.sheetHandle {
    display: none;
}

.sheetIndicator {
    display: none;
}

.header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.eyebrow,
.subtitle {
    margin: 0;
    color: var(--color-dialog-text-secondary);
}

.eyebrow {
    margin-bottom: var(--spacing-space-1);
    font-size: var(--type-size-overline);
    font-weight: 800;
    letter-spacing: 0.08em;
}

.title {
    margin: 0;
    font-size: var(--type-size-h2-section-title);
    font-weight: 800;
}

.subtitle {
    margin-top: var(--spacing-space-1);
    font-size: var(--type-size-caption);
    line-height: 1.5;
}

.selectionCount {
    flex-shrink: 0;
    padding: var(--spacing-space-2) var(--spacing-space-3);
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-full);
    background-color: var(--color-dialog-background-selected);
    color: var(--color-dialog-text-primary);
    font-size: var(--type-size-overline);
    font-weight: 600;
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
    background-color: var(--color-dialog-background);
    color: var(--color-dialog-text-primary);
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
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
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
    border-radius: var(--radius-lg);
    background-color: transparent;
    color: var(--color-dialog-text-primary);
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
    border-color: var(--color-main-primary);
    background-color: var(--color-dialog-background-selected);
}

.projectRow:disabled {
    cursor: not-allowed;
    opacity: 0.34;
}

.noCell {
    font-weight: 600;
}

.rankSelected {
    color: var(--color-main-primary);
    font-weight: 800;
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

@media (max-width: 767px) {
    .backdrop {
        align-items: flex-end;
        padding: 0;
        background-color: rgb(0 0 0 / 50%);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .modal {
        transform: translateY(var(--sheet-drag-y, 0));
        width: 100%;
        height: min(90dvh, 760px);
        padding: var(--spacing-space-2) var(--spacing-space-3) var(--spacing-space-4);
        gap: var(--spacing-space-3);
        border-right: 0;
        border-bottom: 0;
        border-left: 0;
        border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
        box-shadow: 0 -12px 36px rgb(0 0 0 / 18%);
    }

    .modalDragging {
        transition: none !important;
    }

    .modalHidden .modal {
        opacity: 1;
        transform: translateY(100%);
    }

    .sheetHandle {
        display: flex;
        align-items: center;
        justify-content: center;
        align-self: stretch;
        min-height: var(--spacing-space-4);
        padding: 0;
        border: 0;
        background: transparent;
        cursor: grab;
        touch-action: none;
    }

    .sheetHandle:active {
        cursor: grabbing;
    }

    .sheetHandle:focus-visible {
        outline: 2px solid var(--color-main-primary);
        outline-offset: 2px;
    }

    .sheetIndicator {
        display: block;
        width: 28px;
        height: 4px;
        border-radius: var(--radius-full);
        background-color: var(--color-dialog-text-secondary);
    }

    .header {
        align-items: flex-start;
    }

    .subtitle {
        max-width: 260px;
    }

    .controls {
        align-items: stretch;
        flex-direction: column-reverse;
    }

    .filterWrap {
        align-self: flex-start;
    }

    .filterMenu {
        width: min(260px, calc(100vw - var(--spacing-space-6)));
    }

    .tableHeader,
    .projectRow {
        grid-template-columns: 64px minmax(0, 1fr);
        padding: 0 var(--spacing-space-2);
        font-size: var(--type-size-caption);
    }

    .projectRow {
        height: 68px;
        padding-block: var(--spacing-space-2);
    }

    .categoryCell,
    .tableHeader > span:last-child {
        display: none;
    }

    .actions {
        justify-content: flex-end;
    }
}

@media (prefers-reduced-motion: reduce) {
    .modalTransition,
    .modalTransition .modal {
        transition-duration: 1ms;
    }
}
</style>
