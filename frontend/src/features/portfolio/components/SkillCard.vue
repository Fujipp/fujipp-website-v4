<script setup lang="ts">
import { computed } from "vue";
import type { Skills } from "@/config";

interface Props {
    items: readonly Skills[];
}

const props = defineProps<Props>();

const heading = computed(() => props.items[0]);
const skillItems = computed(() => props.items.slice(1));

const mobileSecondaryIconLabels = new Set([
    "SQL",
    "XML",
    "JSON",
    "SHELL / BASH",
    "SOCKET.IO",
    "LINUX SERVER",
    "OPEN ROUTER",
    "GITHUB",
    "CAPCUT",
]);

function usesSecondaryIcon(label: string): boolean {
    return mobileSecondaryIconLabels.has(label);
}

function rackUnitLabel(index: number): string {
    return `U${(index + 1).toString().padStart(2, "0")}`;
}
</script>

<template>
    <article
        :class="$style.stack"
        class="rounded-lg bg-main-surface text-text-secondary type-subtitle-sb"
        @dragstart.prevent
    >
        <header v-if="heading" :class="$style.heading">
            <div :class="$style.headingIdentity">
                <img
                    v-if="heading.icon"
                    :class="[$style.icon, $style.headingIcon]"
                    :src="heading.icon"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                >
                <div :class="$style.headingText">
                    <span :class="$style.rackLabel" class="type-overline-sb">SKILL RACK</span>
                    <h3 class="type-body-small-sb">{{ heading.label }}</h3>
                </div>
            </div>
            <div :class="$style.statusCluster" aria-hidden="true">
                <span :class="[$style.statusLight, $style.statusLightActive]" />
                <span :class="$style.statusLight" />
                <span :class="$style.statusLight" />
            </div>
        </header>
        <ul :class="$style.list">
            <li
                v-if="heading?.icon"
                :class="[$style.skill, $style.mobileCategoryIcon]"
                aria-hidden="true"
            >
                <img
                    :class="$style.icon"
                    :src="heading.icon"
                    alt=""
                    draggable="false"
                >
            </li>
            <li
                v-for="(skill, index) in skillItems"
                :key="skill.label"
                :class="$style.skill"
                class="type-caption-sb rounded-md bg-neutral-800"
            >
                <span :class="$style.unitLabel" aria-hidden="true">{{ rackUnitLabel(index) }}</span>
                <img
                    v-if="skill.icon"
                    :class="[
                        $style.icon,
                        { [$style.secondaryIcon]: usesSecondaryIcon(skill.label) },
                    ]"
                    :src="skill.icon"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                >
                <span :class="$style.skillLabel">{{ skill.label }}</span>
            </li>
        </ul>
    </article>
</template>

<style module>
.stack {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    min-height: 328px;
    padding: var(--spacing-space-3);
    gap: var(--spacing-space-3);
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    box-shadow:
        inset 0 1px 0 color-mix(in srgb, var(--color-text-secondary) 12%, transparent),
        inset 12px 0 0 var(--color-neutral-900),
        inset -12px 0 0 var(--color-neutral-900);
    user-select: none;
}

.stack::before,
.stack::after {
    position: absolute;
    top: var(--spacing-space-3);
    bottom: var(--spacing-space-3);
    width: 4px;
    border-radius: var(--radius-full);
    background:
        repeating-linear-gradient(
            to bottom,
            var(--color-main-divider) 0,
            var(--color-main-divider) 3px,
            transparent 3px,
            transparent 12px
        );
    content: "";
    opacity: 0.72;
}

.stack::before {
    left: var(--spacing-space-2);
}

.stack::after {
    right: var(--spacing-space-2);
}

.heading {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 64px;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    gap: var(--spacing-space-3);
    border: 1px solid var(--color-main-divider);
    background:
        linear-gradient(180deg, color-mix(in srgb, var(--color-neutral-700) 54%, transparent), transparent),
        var(--color-neutral-900);
    border-radius: var(--radius-md);
}

.headingIdentity {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: var(--spacing-space-3);
}

.headingText {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: var(--spacing-space-1);
}

.heading h3 {
    margin: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.rackLabel {
    color: var(--color-main-primary);
}

.statusCluster {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--spacing-space-2);
}

.statusLight {
    width: var(--spacing-space-2);
    height: var(--spacing-space-2);
    border-radius: var(--radius-full);
    background: var(--color-main-divider);
}

.statusLightActive {
    background: var(--color-status-success);
    box-shadow: 0 0 14px color-mix(in srgb, var(--color-status-success) 70%, transparent);
}

.list {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 0;
    padding: 0;
    gap: var(--spacing-space-2);
    list-style: none;
}

.skill {
    position: relative;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 42px;
    padding: var(--spacing-space-2) var(--spacing-space-3);
    gap: var(--spacing-space-2);
    border: 1px solid color-mix(in srgb, var(--color-main-divider) 80%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-text-secondary) 8%, transparent);
}

.skill::after {
    position: absolute;
    right: var(--spacing-space-3);
    width: 28px;
    height: var(--spacing-space-2);
    border-radius: var(--radius-full);
    background:
        linear-gradient(90deg, var(--color-main-primary) 0 24%, transparent 24% 38%, var(--color-main-divider) 38% 62%, transparent 62% 76%, var(--color-main-primary) 76% 100%);
    content: "";
    opacity: 0.56;
}

.unitLabel {
    flex: 0 0 34px;
    color: var(--color-main-primary);
    font-size: 0.75rem;
    line-height: 1;
    letter-spacing: 0;
    font-variant-numeric: tabular-nums;
}

.icon {
    flex-shrink: 0;
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    -webkit-user-drag: none;
}

.secondaryIcon {
    filter: brightness(0) saturate(100%) invert(89.4%);
}

.skillLabel {
    min-width: 0;
    padding-right: var(--spacing-space-10);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mobileCategoryIcon {
    display: none;
}

@media (max-width: 767px) {
    .stack {
        align-items: center;
        max-width: 100%;
        min-width: 0;
        min-height: 0;
        height: auto;
        padding: var(--spacing-space-3);
        gap: var(--spacing-space-3);
        overflow: hidden;
        color: var(--color-text-secondary);
        box-shadow:
            inset 0 1px 0 color-mix(in srgb, var(--color-text-secondary) 12%, transparent),
            inset 8px 0 0 var(--color-neutral-900),
            inset -8px 0 0 var(--color-neutral-900);
    }

    .heading {
        min-width: 0;
        min-height: 54px;
        padding: var(--spacing-space-2) var(--spacing-space-4);
        gap: var(--spacing-space-2);
    }

    .heading h3 {
        font-size: 1rem;
    }

    .headingIcon {
        display: none;
    }

    .list {
        flex-direction: row;
        justify-content: flex-start;
        box-sizing: border-box;
        min-width: 0;
        width: 100%;
        max-width: 100%;
        height: auto;
        padding: 0;
        gap: var(--spacing-space-2);
        overflow: auto hidden;
        border: 1px solid var(--color-main-border);
        border-radius: var(--radius-lg);
        background-color: var(--color-neutral-900);
        scrollbar-width: none;
    }

    .list::-webkit-scrollbar {
        display: none;
    }

    .skill {
        flex-shrink: 0;
        width: auto;
        min-width: 44px;
        min-height: 44px;
        padding: var(--spacing-space-2);
        background-color: var(--color-neutral-800);
    }

    .skill::after,
    .unitLabel {
        display: none;
    }

    .mobileCategoryIcon {
        display: flex;
    }

    .skillLabel {
        display: none;
    }

}
</style>
