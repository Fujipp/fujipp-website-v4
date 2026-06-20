<script setup lang="ts">
import { computed } from "vue";
import type { SupportedLocale } from "@/i18n";

interface Props {
    modelValue?: SupportedLocale;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: "en",
});

const emit = defineEmits<{
    "update:modelValue": [locale: SupportedLocale];
}>();

const currentLocale = computed(() => props.modelValue);
const targetLocale = computed<SupportedLocale>(() => currentLocale.value === "en" ? "th" : "en");
const switchLabel = computed(() => (
    targetLocale.value === "th" ? "Switch language to Thai" : "เปลี่ยนภาษาเป็นอังกฤษ"
));

function toggleLanguage(): void {
    emit("update:modelValue", targetLocale.value);
}
</script>

<template>
    <button
        type="button"
        :aria-label="switchLabel"
        :class="$style.switchButton"
        class="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
        @click="toggleLanguage"
    >
        <span :class="[$style.localeText, currentLocale === 'en' ? $style.activeLocale : $style.inactiveLocale]">
            EN
        </span>
        <span :class="$style.divider" aria-hidden="true" />
        <span :class="[$style.localeText, currentLocale === 'th' ? $style.activeLocale : $style.inactiveLocale]">
            TH
        </span>
    </button>
</template>

<style module>
.switchButton {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    flex-shrink: 0;
    width: 88px;
    min-height: 42px;
    padding: 10px 14px;
    gap: 10px;
    overflow: hidden;
    isolation: isolate;
    border: 1px solid color-mix(in srgb, var(--color-neutral-50) 16%, transparent);
    border-radius: 999px;
    background:
        linear-gradient(
            150deg,
            color-mix(in srgb, var(--color-neutral-50) 14%, transparent) 0%,
            color-mix(in srgb, var(--color-neutral-50) 4%, transparent) 42%,
            color-mix(in srgb, var(--color-neutral-900) 28%, transparent) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 45%, transparent),
        inset 0 -8px 16px color-mix(in srgb, var(--color-neutral-900) 30%, transparent),
        0 6px 18px color-mix(in srgb, var(--color-neutral-900) 35%, transparent);
    backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.1);
    color: var(--color-neutral-50);
    cursor: pointer;
    font-family: var(--font-family-sans);
    font-size: 1rem;
    line-height: normal;
    text-align: left;
    transition:
        background 220ms ease,
        border-color 220ms ease,
        box-shadow 220ms ease,
        transform 220ms ease;
}

/* Specular sheen across the top — the signature iOS glass highlight */
.switchButton::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background:
        radial-gradient(
            120% 80% at 50% -20%,
            color-mix(in srgb, var(--color-neutral-50) 38%, transparent) 0%,
            transparent 60%
        );
    opacity: 0.7;
    pointer-events: none;
    z-index: -1;
}

.switchButton:hover {
    border-color: color-mix(in srgb, var(--color-neutral-50) 26%, transparent);
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-neutral-50) 55%, transparent),
        inset 0 -8px 16px color-mix(in srgb, var(--color-neutral-900) 30%, transparent),
        0 8px 22px color-mix(in srgb, var(--color-neutral-900) 40%, transparent);
}

.switchButton:active {
    transform: scale(0.97);
}

.localeText {
    position: relative;
    transition:
        color 200ms ease,
        font-weight 200ms ease,
        text-shadow 200ms ease;
}

.activeLocale {
    font-weight: 600;
    color: var(--color-neutral-50);
    text-shadow: 0 0 12px color-mix(in srgb, var(--color-neutral-50) 35%, transparent);
}

.inactiveLocale {
    font-weight: 300;
    color: color-mix(in srgb, var(--color-neutral-50) 45%, transparent);
}

.divider {
    position: relative;
    width: 1px;
    height: 18px;
    border-right: 1px solid color-mix(in srgb, var(--color-neutral-50) 30%, transparent);
    box-sizing: border-box;
}
</style>
