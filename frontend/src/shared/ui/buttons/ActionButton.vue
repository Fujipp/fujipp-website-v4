<script setup lang="ts">
import { computed } from "vue";
import { icons } from "@/config";

type ActionKind =
    | "back"
    | "next"
    | "skip-back"
    | "skip-next"
    | "play"
    | "pause"
    | "restart"
    | "add"
    | "delete"
    | "edit"
    | "setting"
    | "scroll-top"
    | "scroll-bottom";

interface Props {
    action: ActionKind;
    disabled?: boolean;
    ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
});

defineEmits<{
    click: [event: MouseEvent];
}>();

const iconByAction: Partial<Record<ActionKind, string>> = {
    play: icons.play,
    pause: icons.pause,
    restart: icons.restart,
    add: icons.add,
    delete: icons.delete,
    edit: icons.edit,
    setting: icons.setting,
    "scroll-top": icons.arrowBack,
    "scroll-bottom": icons.arrowBack,
};

const defaultLabelByAction: Record<ActionKind, string> = {
    "back": "Back",
    "next": "Next",
    "skip-back": "Skip back",
    "skip-next": "Skip next",
    "play": "Play",
    "pause": "Pause",
    "restart": "Restart",
    "add": "Add",
    "delete": "Delete",
    "edit": "Edit",
    "setting": "Settings",
    "scroll-top": "Scroll to top",
    "scroll-bottom": "Scroll to bottom",
};

const isChevron = computed(() => ["back", "next", "skip-back", "skip-next"].includes(props.action));
const isDouble = computed(() => props.action === "skip-back" || props.action === "skip-next");
const pointsRight = computed(() => props.action === "next" || props.action === "skip-next");
const label = computed(() => props.ariaLabel ?? defaultLabelByAction[props.action]);

const iconStyle = computed(() => {
    const src = isChevron.value ? icons.slide : iconByAction[props.action];

    /* slide.svg points left; flip it for the next directions.
       arrow-back.svg also points left; rotate it up for scroll-top. */
    const rotation = props.action === "scroll-top"
        ? "90deg"
        : props.action === "scroll-bottom"
            ? "-90deg"
        : pointsRight.value ? "180deg" : "0deg";

    return {
        "--action-icon-src": `url(${src})`,
        "--action-icon-rotation": rotation,
    };
});
</script>

<template>
    <button
        type="button"
        :class="$style.actionButton"
        :disabled="disabled"
        :aria-label="label"
        @click="$emit('click', $event)"
    >
        <span
            :class="[$style.icon, isChevron ? $style.chevron : '']"
            :style="iconStyle"
            aria-hidden="true"
        />
        <span
            v-if="isDouble"
            :class="[$style.icon, $style.chevron]"
            :style="iconStyle"
            aria-hidden="true"
        />
    </button>
</template>

<style module>
.actionButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border: 1px solid var(--color-button-border);
    border-radius: var(--radius-full);
    background: var(--color-button-text-secondary);
    padding: 0;
    cursor: pointer;
    transition:
        border-color 180ms ease,
        background 180ms ease,
        box-shadow 180ms ease,
        opacity 180ms ease,
        transform 180ms ease;
}

.actionButton:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-button-text-secondary) 88%, var(--color-button-secondary));
    border-color: color-mix(in srgb, var(--color-button-border) 70%, var(--color-button-secondary));
    box-shadow: 0 4px 6px rgb(0 0 0 / 12%);
    transform: translateY(-1px);
}

.actionButton:active:not(:disabled) {
    box-shadow: none;
    transform: translateY(1px) scale(0.97);
}

.actionButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.actionButton:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    background-color: var(--color-button-secondary);
    mask: var(--action-icon-src) center / contain no-repeat;
    -webkit-mask: var(--action-icon-src) center / contain no-repeat;
    transform: rotate(var(--action-icon-rotation));
}

/* A 6px window over the fixed 16px mask crops the chevron glyph tight,
   so the skip pair lands 6px apart like the Figma spec. */
.chevron {
    width: 6px;
    height: 16px;
    mask-size: 16px 16px;
    -webkit-mask-size: 16px 16px;
}
</style>
