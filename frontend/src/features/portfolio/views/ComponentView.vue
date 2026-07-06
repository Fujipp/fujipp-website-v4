<script setup lang="ts">
import { ref } from "vue";
import { ActionButton, ButtonSkeleton, FilterButton, LanguageToggleButton, PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { DateField, SearchField, SelectField, TextareaField, TextField } from "@/shared/ui/fields";
import { CheckboxInput, RadioInput, StarRating } from "@/shared/ui/inputs";
import { CategoryTag, StackTag, StatusTag } from "@/shared/ui/tags";
import { ConfirmModal } from "@/shared/ui/modals";
import { ToggleSwitch } from "@/shared/ui/toggles";
import { backend, database, frontend, icons } from "@/config";
import { useToastStore, type ToastStatus } from "@/stores";

const toastStore = useToastStore();
const toastStatuses: ToastStatus[] = ["info", "success", "warning", "error"];

type ModalVariant = "default" | "danger" | "close";

const previewModal = ref<ModalVariant | null>(null);
const modalVariants: ModalVariant[] = ["default", "danger", "close"];

function firePreviewToast(status: ToastStatus): void {
    toastStore.show(
        `${status.charAt(0).toUpperCase()}${status.slice(1)} toast`,
        "Description. Lorem ipsum dolor sit amet.",
        status,
    );
}

const previewLanguage = ref<"en" | "th">("en");
const previewToggle = ref(false);
const previewRadio = ref("a");
const previewChecked = ref(true);
const previewFilterOpen = ref(false);
const previewFilterOptions = ["Website", "Discord Bot", "Game", "Design"];
const previewFilterSelected = ref<string[]>([]);
const previewRating = ref(0);
const previewAmount = ref("");
const previewPassword = ref("secret123");
const previewPasswordVisible = ref(false);
const previewSelect = ref("");
const previewMessage = ref("");
const previewDate = ref("");
const previewDateTime = ref("");
const previewSearch = ref("");
const previewSelectOptions = [
    { label: "Website", value: "website" },
    { label: "Discord Bot", value: "discord-bot" },
    { label: "Game", value: "game" },
];

function togglePreviewFilterOption(option: string, checked: boolean): void {
    previewFilterSelected.value = checked
        ? [...previewFilterSelected.value, option]
        : previewFilterSelected.value.filter((item) => item !== option);
}
</script>

<template>
    <main :class="$style.home">
        <section :class="$style.previewShell" aria-labelledby="component-preview-title">
            <header :class="$style.previewHeader">
                <p :class="$style.kicker" class="type-handling-sb">UI REVISION</p>
                <h1 id="component-preview-title" :class="$style.title" class="type-h1-page-title-eb">
                    UI Components
                </h1>
                <p :class="$style.description" class="type-body-small-r">
                    Shared component previews for the new design foundation: buttons, toggles, inputs, fields, and actions.
                </p>
            </header>

            <div :class="$style.previewGrid">
                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Primary</h2>
                        <span class="type-support-sb">Liquid glass</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <PrimaryButton width-mode="fill">Fill width</PrimaryButton>
                        <PrimaryButton width-mode="hug" :leading-icon="icons.add">Hug content</PrimaryButton>
                        <PrimaryButton width-mode="fixed" fixed-width="220px" :trailing-icon="icons.search">
                            Fixed width
                        </PrimaryButton>
                        <PrimaryButton :leading-icon="icons.add" :trailing-icon="icons.add">
                            Button
                        </PrimaryButton>
                        <PrimaryButton :icon="icons.setting" aria-label="Settings" />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Secondary</h2>
                        <span class="type-support-sb">Solid surface</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <SecondaryButton width-mode="fill">Fill width</SecondaryButton>
                        <SecondaryButton width-mode="hug" :leading-icon="icons.add">Hug content</SecondaryButton>
                        <SecondaryButton width-mode="fixed" fixed-width="220px" :trailing-icon="icons.search">
                            Fixed width
                        </SecondaryButton>
                        <SecondaryButton :leading-icon="icons.add" :trailing-icon="icons.add">
                            Button
                        </SecondaryButton>
                        <SecondaryButton variant="icon" :icon="icons.setting" aria-label="Settings" />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Language</h2>
                        <span class="type-support-sb">Liquid glass</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <LanguageToggleButton v-model="previewLanguage" />
                        <LanguageToggleButton model-value="th" disabled />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Toggle</h2>
                        <span class="type-support-sb">On / Off</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <ToggleSwitch v-model="previewToggle" aria-label="Preview toggle" />
                        <ToggleSwitch model-value aria-label="Toggle on (disabled)" disabled />
                        <ToggleSwitch aria-label="Toggle off (disabled)" disabled />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Filter</h2>
                        <span class="type-support-sb">Default / Active</span>
                    </div>
                    <div :class="$style.controlRow">
                        <div :class="$style.filterDemo">
                            <FilterButton
                                :arrow-direction="previewFilterOpen ? 'up' : 'down'"
                                :count="previewFilterSelected.length"
                                @click="previewFilterOpen = !previewFilterOpen"
                            />
                            <div v-if="previewFilterOpen" :class="$style.filterMenu">
                                <label
                                    v-for="option in previewFilterOptions"
                                    :key="option"
                                    :class="$style.filterOption"
                                    class="type-body-small-r"
                                >
                                    <CheckboxInput
                                        :model-value="previewFilterSelected.includes(option)"
                                        size="s"
                                        @update:model-value="togglePreviewFilterOption(option, $event)"
                                    />
                                    {{ option }}
                                </label>
                                <button
                                    type="button"
                                    :class="$style.filterClear"
                                    class="type-body-small-r"
                                    :disabled="previewFilterSelected.length === 0"
                                    @click="previewFilterSelected = []"
                                >
                                    Clear filters
                                </button>
                            </div>
                        </div>
                        <FilterButton arrow-direction="right" disabled>Filter</FilterButton>
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Radio</h2>
                        <span class="type-support-sb">S / M / L</span>
                    </div>
                    <div :class="$style.controlRow">
                        <RadioInput v-model="previewRadio" value="a" name="preview-radio" size="s" aria-label="Radio small" />
                        <RadioInput v-model="previewRadio" value="b" name="preview-radio" size="m" aria-label="Radio medium" />
                        <RadioInput v-model="previewRadio" value="c" name="preview-radio" size="l" aria-label="Radio large" />
                        <RadioInput value="d" size="m" aria-label="Radio disabled" disabled />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Checkbox</h2>
                        <span class="type-support-sb">S / M / L</span>
                    </div>
                    <div :class="$style.controlRow">
                        <CheckboxInput v-model="previewChecked" size="s" aria-label="Checkbox small" />
                        <CheckboxInput v-model="previewChecked" size="m" aria-label="Checkbox medium" />
                        <CheckboxInput v-model="previewChecked" size="l" aria-label="Checkbox large" />
                        <CheckboxInput size="m" aria-label="Checkbox disabled" disabled />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Star Rating</h2>
                        <span class="type-support-sb">Give / Display</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <StarRating v-model="previewRating" />
                        <StarRating :model-value="4" readonly />
                        <StarRating :model-value="2" disabled />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Text Field</h2>
                        <span class="type-support-sb">7 states</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <TextField
                            v-model="previewAmount"
                            label="Amount"
                            placeholder="0.00"
                            unit="฿"
                            support-text="Support text"
                        />
                        <TextField
                            model-value="Text"
                            label="Title"
                            :icon="icons.question"
                            :error="previewAmount === '' ? 'Fill the amount above to clear this error' : ''"
                        />
                        <TextField
                            v-model="previewPassword"
                            label="Password"
                            placeholder="Enter your password"
                            :type="previewPasswordVisible ? 'text' : 'password'"
                            autocomplete="new-password"
                        >
                            <template #icon>
                                <button
                                    type="button"
                                    :class="$style.fieldIconButton"
                                    :aria-label="previewPasswordVisible ? 'Hide password' : 'Show password'"
                                    @click.prevent="previewPasswordVisible = !previewPasswordVisible"
                                >
                                    <img :src="previewPasswordVisible ? icons.eyeClose : icons.eye" alt="">
                                </button>
                            </template>
                        </TextField>
                        <TextField model-value="Inactive" label="Title" support-text="Support text" disabled />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Dropdown</h2>
                        <span class="type-support-sb">Slide arrow</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <SelectField
                            v-model="previewSelect"
                            label="Category"
                            placeholder="Select a category"
                            :options="previewSelectOptions"
                            support-text="Support text"
                        />
                        <SelectField
                            label="Disabled"
                            placeholder="Unavailable"
                            :options="previewSelectOptions"
                            disabled
                        />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Text Area</h2>
                        <span class="type-support-sb">Multiline</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <TextareaField
                            v-model="previewMessage"
                            label="Message"
                            placeholder="Tell me about your project…"
                            :rows="4"
                            support-text="Support text"
                        />
                        <TextareaField label="Disabled" model-value="Inactive" :rows="2" disabled />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Calendar</h2>
                        <span class="type-support-sb">Date / Date + time</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <DateField v-model="previewDate" label="Start Date" support-text="Support text" />
                        <DateField v-model="previewDateTime" label="Start Date &amp; Time" with-time />
                        <DateField label="Disabled" disabled />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Search Bar</h2>
                        <span class="type-support-sb">Pill</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <SearchField v-model="previewSearch" aria-label="Search preview" />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Actions</h2>
                        <span class="type-support-sb">11 actions</span>
                    </div>
                    <div :class="$style.controlRow">
                        <ActionButton action="skip-back" />
                        <ActionButton action="back" />
                        <ActionButton action="next" />
                        <ActionButton action="skip-next" />
                    </div>
                    <div :class="$style.controlRow">
                        <ActionButton action="play" />
                        <ActionButton action="pause" />
                        <ActionButton action="restart" />
                        <ActionButton action="add" />
                        <ActionButton action="delete" />
                        <ActionButton action="edit" />
                        <ActionButton action="setting" disabled />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Status</h2>
                        <span class="type-support-sb">4 states</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <StatusTag status="Active" />
                        <StatusTag status="Completed" />
                        <StatusTag status="In Progress" />
                        <StatusTag status="Archived" />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Stack</h2>
                        <span class="type-support-sb">Default / Filled / Skeleton</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <StackTag />
                        <StackTag :stacks="{ frontend: frontend[1], backend: backend[2], database: database[3] }" />
                        <StackTag loading />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Category</h2>
                        <span class="type-support-sb">Mapped / Skeleton</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <CategoryTag label="Internship" />
                        <CategoryTag label="Client" />
                        <CategoryTag loading />
                    </div>
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Modal</h2>
                        <span class="type-support-sb">Confirm / Danger / Close</span>
                    </div>
                    <div :class="$style.controlRow">
                        <SecondaryButton
                            v-for="variant in modalVariants"
                            :key="variant"
                            width-mode="hug"
                            @click="previewModal = variant"
                        >
                            {{ variant }}
                        </SecondaryButton>
                    </div>
                    <ConfirmModal
                        v-if="previewModal"
                        :variant="previewModal"
                        :title="previewModal === 'danger' ? 'Delete' : previewModal === 'close' ? 'Notice' : 'Confirm'"
                        reason="Reason. Lorem ipsum dolor sit amet, consectetur adipiscing elit."
                        @cancel="previewModal = null"
                        @confirm="previewModal = null"
                    />
                </article>

                <article :class="$style.previewPanel">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Toast</h2>
                        <span class="type-support-sb">4 styles · auto 5s</span>
                    </div>
                    <div :class="$style.controlRow">
                        <SecondaryButton
                            v-for="status in toastStatuses"
                            :key="status"
                            width-mode="hug"
                            @click="firePreviewToast(status)"
                        >
                            {{ status }}
                        </SecondaryButton>
                    </div>
                </article>

                <article :class="[$style.previewPanel, $style.skeletonPanel]">
                    <div :class="$style.panelHeader">
                        <h2 class="type-h3-card-title-eb">Skeleton</h2>
                        <span class="type-support-sb">Loading</span>
                    </div>
                    <div :class="$style.buttonStack">
                        <ButtonSkeleton />
                        <ButtonSkeleton aria-label="Loading primary action" />
                        <ButtonSkeleton aria-label="Loading secondary action" />
                    </div>
                </article>
            </div>
        </section>
    </main>
</template>

<style module>
.home {
    min-height: 100dvh;
    background:
        linear-gradient(
            180deg,
            color-mix(in srgb, var(--color-main-surface) 8%, var(--color-main-background)) 0%,
            var(--color-main-background) 48%,
            color-mix(in srgb, var(--color-main-primary) 18%, var(--color-main-background)) 100%
        );
    color: var(--color-text-primary);
}

.previewShell {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, 1120px);
    min-height: 100dvh;
    gap: var(--spacing-space-8);
    margin: 0 auto;
    padding: var(--spacing-space-12) var(--spacing-space-5);
}

.previewHeader {
    display: flex;
    flex-direction: column;
    max-width: 620px;
    gap: var(--spacing-space-3);
}

.kicker {
    color: var(--color-text-secondary);
}

.title {
    color: var(--color-text-primary);
}

.description {
    max-width: 520px;
    color: var(--color-text-secondary);
}

.previewGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.previewPanel {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    gap: var(--spacing-space-5);
    min-width: 0;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-2xl);
    background: color-mix(in srgb, var(--color-main-background) 82%, var(--color-button-primary));
    padding: var(--spacing-space-5);
}

.panelHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-space-3);
    color: var(--color-text-primary);
}

.panelHeader span {
    color: var(--color-text-secondary);
    white-space: nowrap;
}

.buttonStack {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
}

.buttonStack > :last-child {
    align-self: flex-start;
}

.controlRow {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-4);
}

.filterDemo {
    position: relative;
}

.filterMenu {
    position: absolute;
    top: calc(100% + var(--spacing-space-2));
    left: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    min-width: 180px;
    gap: var(--spacing-space-3);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    box-shadow: 0 8px 12px rgb(0 0 0 / 14%);
    padding: var(--spacing-space-3);
}

.filterOption {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-2);
    color: var(--color-text-primary);
    cursor: pointer;
}

.fieldIconButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin: 0;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
}

.fieldIconButton img {
    width: 16px;
    height: 16px;
    object-fit: contain;
}

.fieldIconButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
    border-radius: var(--radius-base);
}

.filterClear {
    margin-top: var(--spacing-space-1);
    border: none;
    border-top: 1px solid var(--color-main-divider);
    background: none;
    padding: var(--spacing-space-2) 0 0;
    color: var(--color-status-error);
    font-family: var(--font-sans);
    text-align: left;
    cursor: pointer;
    transition: opacity 180ms ease;
}

.filterClear:hover:not(:disabled) {
    opacity: 0.75;
}

.filterClear:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.filterClear:disabled {
    cursor: not-allowed;
    color: var(--color-text-disabled);
}

.skeletonPanel {
    justify-content: space-between;
}

@media (max-width: 960px) {
    .previewGrid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 767px) {
    .previewShell {
        gap: var(--spacing-space-6);
        padding: var(--spacing-space-8) var(--spacing-space-4);
    }

    .previewPanel {
        padding: var(--spacing-space-4);
    }

    .panelHeader {
        flex-direction: column;
    }
}
</style>
