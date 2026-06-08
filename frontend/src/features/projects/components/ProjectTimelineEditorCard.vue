<script setup lang="ts">
import { ActionButton } from "@/shared/ui/buttons";
import { SelectField } from "@/shared/ui/fields";

interface TimelineMilestoneDraft {
    date: string;
    description: string;
    title: string;
}

interface Props {
    endMonth?: string;
    milestones?: readonly TimelineMilestoneDraft[];
    startMonth?: string;
    status?: string;
}

withDefaults(defineProps<Props>(), {
    endMonth: "",
    milestones: () => [{ date: "", description: "", title: "" }],
    startMonth: "",
    status: "Completed",
});

const statusOptions = ["Completed", "In Progress", "On Hold"].map((value) => ({ label: value, value }));

const emit = defineEmits<{
    addMilestone: [];
    deleteMilestone: [index: number];
    "update:endMonth": [value: string];
    "update:milestoneDate": [index: number, value: string];
    "update:milestoneDescription": [index: number, value: string];
    "update:milestoneTitle": [index: number, value: string];
    "update:startMonth": [value: string];
    "update:status": [value: string];
}>();
</script>

<template>
    <article :class="$style.timelineCard">
        <h3 :class="$style.heading">Project Timeline</h3>
        <div :class="$style.monthRow">
            <label :class="$style.fieldGroup">
                <span :class="$style.label">Start Month</span>
                <input
                    :class="[$style.input, $style.monthInput]"
                    :value="startMonth"
                    placeholder="--------- ----"
                    type="month"
                    @input="emit('update:startMonth', ($event.target as HTMLInputElement).value)"
                >
            </label>
            <label :class="$style.fieldGroup">
                <span :class="$style.label">End Month</span>
                <input
                    :class="[$style.input, $style.monthInput]"
                    :value="endMonth"
                    placeholder="--------- ----"
                    type="month"
                    @input="emit('update:endMonth', ($event.target as HTMLInputElement).value)"
                >
            </label>
        </div>
        <SelectField
            :model-value="status"
            label="Status"
            :options="statusOptions"
            tone="dark"
            @update:model-value="emit('update:status', $event)"
        />

        <section
            v-for="(milestone, index) in milestones"
            :key="index"
            :class="$style.milestoneCard"
        >
            <header :class="$style.milestoneHeader">
                <h4 :class="$style.milestoneTitle">Milestone {{ index + 1 }}</h4>
                <ActionButton
                    variant="delete"
                    :aria-label="`Delete milestone ${index + 1}`"
                    @click="emit('deleteMilestone', index)"
                />
            </header>
            <label :class="$style.fieldGroup">
                <span :class="$style.label">Start Month</span>
                <input
                    :class="[$style.input, $style.monthInput]"
                    :value="milestone.date"
                    placeholder="--------- ----"
                    type="month"
                    @input="emit('update:milestoneDate', index, ($event.target as HTMLInputElement).value)"
                >
            </label>
            <label :class="$style.fieldGroup">
                <span :class="$style.label">Title</span>
                <input
                    :class="$style.input"
                    :value="milestone.title"
                    placeholder="Placeholder"
                    @input="emit('update:milestoneTitle', index, ($event.target as HTMLInputElement).value)"
                >
            </label>
            <label :class="[$style.fieldGroup, $style.areaGroup]">
                <span :class="$style.label">Content</span>
                <textarea
                    :class="$style.textarea"
                    :value="milestone.description"
                    placeholder="Placeholder"
                    @input="emit('update:milestoneDescription', index, ($event.target as HTMLTextAreaElement).value)"
                />
            </label>
        </section>

        <div :class="$style.addRow">
            <ActionButton variant="add" aria-label="Add milestone" @click="emit('addMilestone')" />
        </div>
    </article>
</template>

<style module>
.timelineCard,
.milestoneCard {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    gap: 10px;
    border: 2px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-sans);
}

.timelineCard {
    padding: 10px;
    overflow: hidden;
}

.heading,
.milestoneTitle {
    margin: 0;
    font-weight: 600;
    line-height: normal;
}

.heading {
    font-size: 1.5rem;
}

.milestoneTitle {
    flex: 1;
    font-size: 1.25rem;
}

.monthRow,
.milestoneHeader {
    display: flex;
    gap: 10px;
}

.fieldGroup {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    gap: 8px;
}

.label {
    font-size: 0.875rem;
    font-weight: 300;
}

.input,
.textarea {
    box-sizing: border-box;
    width: 100%;
    border: 1px solid var(--color-input-placeholder);
    background-color: var(--color-input-bg);
    color: var(--color-text-input);
    font-family: var(--font-sans);
    font-size: 1.125rem;
    font-weight: 300;
}

.input {
    height: 48px;
    padding: 12px 16px;
    border-radius: var(--radius-xl);
}

.monthInput {
    padding-right: 48px;
    background-image: url("/images/icons/common/calendar.svg");
    background-repeat: no-repeat;
    background-position: right 16px center;
    background-size: var(--spacing-icon-md) var(--spacing-icon-md);
}

.monthInput::-webkit-calendar-picker-indicator {
    width: 24px;
    height: 24px;
    margin-right: -32px;
    cursor: pointer;
    opacity: 0;
}

.milestoneCard {
    padding: 10px;
    border-width: 1px;
}

.areaGroup {
    height: 199px;
}

.textarea {
    flex: 1;
    min-height: 0;
    padding: 12px 16px;
    border-radius: var(--radius-xl);
    resize: none;
}

.addRow {
    display: flex;
    justify-content: center;
}
</style>
