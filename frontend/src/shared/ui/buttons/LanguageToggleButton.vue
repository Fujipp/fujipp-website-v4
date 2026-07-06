<script setup lang="ts">
type LanguageCode = "en" | "th";

interface Props {
    modelValue?: LanguageCode;
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: "en",
    disabled: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: LanguageCode];
}>();

function toggleLanguage(): void {
    emit("update:modelValue", props.modelValue === "en" ? "th" : "en");
}

function updateButtonTilt(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;

    if (!target) return;

    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    target.style.setProperty("--button-tilt-x", `${x * 3}deg`);
    target.style.setProperty("--button-tilt-y", `${y * -3}deg`);
}

function resetButtonTilt(event: PointerEvent | FocusEvent): void {
    const target = event.currentTarget as HTMLElement | null;

    if (!target) return;

    target.style.setProperty("--button-tilt-x", "0deg");
    target.style.setProperty("--button-tilt-y", "0deg");
}
</script>

<template>
    <button
        type="button"
        :class="$style.languageToggleButton"
        :disabled="disabled"
        :aria-label="modelValue === 'en' ? 'Switch language to Thai' : 'Switch language to English'"
        @click="toggleLanguage"
        @pointermove="updateButtonTilt"
        @pointerleave="resetButtonTilt"
        @blur="resetButtonTilt"
    >
        <span :class="[$style.option, modelValue === 'en' && $style.active]" aria-hidden="true">EN</span>
        <span :class="$style.divider" aria-hidden="true" />
        <span :class="[$style.option, modelValue === 'th' && $style.active]" aria-hidden="true">TH</span>
    </button>
</template>

<style module>
.languageToggleButton {
    --button-tilt-x: 0deg;
    --button-tilt-y: 0deg;

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    gap: 10px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-button-primary) 32%, transparent);
    border-radius: var(--radius-xl);
    background:
        linear-gradient(
            145deg,
            color-mix(in srgb, var(--color-button-primary) 34%, transparent) 0%,
            color-mix(in srgb, var(--color-button-primary) 16%, transparent) 48%,
            color-mix(in srgb, var(--color-button-primary) 24%, transparent) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-button-primary) 28%, transparent),
        0 4px 4px rgb(0 0 0 / 10%);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    padding: 12px 16px;
    color: var(--color-button-text);
    font-family: var(--font-sans);
    font-size: var(--type-size-button);
    line-height: normal;
    letter-spacing: 0;
    text-align: center;
    cursor: pointer;
    transition:
        border-color 180ms ease,
        background 180ms ease,
        box-shadow 180ms ease,
        opacity 180ms ease,
        transform 180ms ease;
}

.languageToggleButton:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-button-primary) 52%, transparent);
    background:
        linear-gradient(
            145deg,
            color-mix(in srgb, var(--color-button-primary) 40%, transparent) 0%,
            color-mix(in srgb, var(--color-button-primary) 20%, transparent) 48%,
            color-mix(in srgb, var(--color-button-primary) 28%, transparent) 100%
        );
    box-shadow:
        inset 0 1px 1px color-mix(in srgb, var(--color-button-primary) 34%, transparent),
        0 8px 12px rgb(0 0 0 / 14%);
    transform:
        perspective(700px)
        rotateX(var(--button-tilt-y))
        rotateY(var(--button-tilt-x))
        translateY(-1px);
}

.languageToggleButton:active:not(:disabled) {
    box-shadow: 0 3px 4px rgb(0 0 0 / 10%);
    transform:
        perspective(700px)
        rotateX(var(--button-tilt-y))
        rotateY(var(--button-tilt-x))
        translateY(1px)
        scale(0.99);
}

.languageToggleButton:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.languageToggleButton:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.option {
    font-weight: 300;
    transition: font-weight 180ms ease, opacity 180ms ease;
    opacity: 0.65;
}

.option.active {
    font-weight: 600;
    opacity: 1;
}

.divider {
    width: 1px;
    height: 20px;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--color-button-text) 60%, transparent);
}
</style>
