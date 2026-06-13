<script setup lang="ts">
import { thb } from "@/features/shop/config/catalog";
import type { PackageCardMode, PackageOption } from "./PackageCard.vue";

interface Props {
    title?: string;
    option?: PackageOption | null;
    mode?: PackageCardMode;
    disabled?: boolean;
    buttonLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    title: "",
    option: null,
    mode: "default",
    disabled: false,
    buttonLabel: "ซื้อ",
});

const emit = defineEmits<{ select: [option: PackageOption] }>();

function formatPrice(satang: number): string {
    return thb(satang).replace("฿", "฿ ");
}

function selectOption(): void {
    if (!props.option || props.disabled) return;
    emit("select", props.option);
}
</script>

<template>
    <article
        v-if="mode === 'skeleton'"
        :class="[$style.card, $style.skeletonCard]"
        aria-hidden="true"
    />

    <article
        v-else
        :class="$style.card"
        :aria-label="title"
    >
        <div :class="$style.body">
            <div :class="$style.titleWrap">
                <h3 :class="$style.title">{{ title }}</h3>
            </div>

            <div v-if="option" :class="$style.priceWrap">
                <p :class="$style.price">{{ formatPrice(option.priceSatang) }}</p>
            </div>
        </div>

        <div :class="$style.actionWrap">
            <button
                type="button"
                :class="$style.button"
                :disabled="disabled || !option"
                @click="selectOption"
            >
                {{ buttonLabel }}
            </button>
        </div>
    </article>
</template>

<style module>
.card {
    position: relative;
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, 300px);
    min-height: 172px;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-5);
    overflow: hidden;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: left;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.card:hover {
    border-color: var(--color-main-primary);
    box-shadow: 0 12px 32px color-mix(in srgb, var(--color-main-primary) 22%, transparent);
    transform: translateY(-2px);
}

.skeletonCard {
    min-height: 172px;
    border-color: transparent;
    background: linear-gradient(262.31deg, #ffffff 0%, var(--color-main-surface) 100%);
}

.skeletonCard:hover {
    border-color: transparent;
    box-shadow: none;
    transform: none;
}

.body {
    flex: 1;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-space-3);
}

.titleWrap,
.priceWrap {
    align-self: stretch;
    text-align: left;
}

.title {
    margin: 0;
    font-family: var(--font-sans);
    font-size: 22px;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: 0;
}

.price {
    margin: 0;
    font-family: var(--font-sans);
    font-size: 34px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.5px;
    color: var(--color-main-primary);
}

.actionWrap {
    align-self: stretch;
    display: flex;
}

.button {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    height: 46px;
    padding: 12px 16px;
    border: 0;
    border-radius: var(--radius-lg);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 600;
    line-height: normal;
    letter-spacing: 0;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
}

.button:hover:not(:disabled) {
    background-color: var(--color-button-primary-btn-hover);
}

.button:active:not(:disabled) {
    background-color: var(--color-button-primary-btn-active);
}

.button:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

@media (max-width: 520px) {
    .card {
        width: 100%;
    }

    .title {
        font-size: 20px;
    }

    .price {
        font-size: 30px;
    }
}
</style>
