<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { saveLocale, type SupportedLocale } from "@/i18n";

const { locale } = useI18n();

const currentLocale = computed(() => locale.value as SupportedLocale);
const targetLocale = computed<SupportedLocale>(() => currentLocale.value === "en" ? "th" : "en");
const switchLabel = computed(() => (
    targetLocale.value === "th" ? "Switch language to Thai" : "เปลี่ยนภาษาเป็นอังกฤษ"
));

function toggleLanguage(): void {
    locale.value = targetLocale.value;
    saveLocale(targetLocale.value);
}
</script>

<template>
    <button
        type="button"
        :aria-label="switchLabel"
        :class="$style.switchButton"
        class="type-button-r bg-button-secondary-btn-bg text-button-secondary-btn-text transition-colors hover:bg-button-secondary-btn-hover active:bg-button-secondary-btn-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary"
        @click="toggleLanguage"
    >
        <span :class="currentLocale === 'en' ? 'font-semibold' : 'font-light'">EN</span>
        <span class="h-5 border-l border-white" aria-hidden="true" />
        <span :class="currentLocale === 'th' ? 'font-semibold' : 'font-light'">TH</span>
    </button>
</template>

<style module>
.switchButton {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    flex-shrink: 0;
    width: 84px;
    height: 33px;
    padding: 10px;
    gap: 12px;
    overflow: hidden;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
}
</style>
