<script setup lang="ts">
import { thb, type PurchasePayload } from "@/features/shop/config/catalog";

export type PackageCardMode = "default" | "skeleton";

export interface PackageOption {
    id: string; // priceId or runtimePlanId
    label: string; // "เช่ารายเดือน" / "3 เดือน"
    priceSatang: number;
    promotionLabel?: string;
    requiresSubject: boolean;
    payload: PurchasePayload;
}

interface Props {
    title?: string;
    description?: string;
    option?: PackageOption | null;
    mode?: PackageCardMode;
    disabled?: boolean;
    buttonLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    title: "",
    description: "",
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

            <div :class="$style.descriptionWrap">
                <p :class="$style.description">{{ description }}</p>
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
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    width: min(100%, 285px);
    height: 337px;
    padding: var(--spacing-space-2);
    gap: 10px;
    overflow: hidden;
    border: 2px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: left;
}

.skeletonCard {
    height: 335px;
    border-color: transparent;
    background: linear-gradient(262.31deg, #ffffff 0%, var(--color-main-surface) 100%);
}

.body {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
}

.titleWrap,
.descriptionWrap {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.title {
    align-self: stretch;
    margin: 0;
    font-family: var(--font-sans);
    font-size: 24px;
    font-weight: 600;
    line-height: normal;
    letter-spacing: 0;
}

.priceWrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.price {
    align-self: stretch;
    margin: 0;
    font-family: var(--font-sans);
    font-size: 32px;
    font-weight: 800;
    line-height: normal;
    letter-spacing: 0;
}

.description {
    align-self: stretch;
    margin: 0;
    font-family: var(--font-sans);
    font-size: 20px;
    font-weight: 300;
    line-height: normal;
    letter-spacing: 0;
}

.actionWrap {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.button {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 160px;
    height: 48px;
    padding: 12px 16px;
    border: 0;
    border-radius: var(--radius-xl);
    background-color: var(--color-button-secondary-btn-bg);
    color: var(--color-button-secondary-btn-text);
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 600;
    line-height: normal;
    letter-spacing: 0;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
}

.button:hover:not(:disabled) {
    background-color: var(--color-button-secondary-btn-hover);
}

.button:active:not(:disabled) {
    background-color: var(--color-button-secondary-btn-active);
}

.button:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

@media (max-width: 520px) {
    .card {
        width: 100%;
        height: 337px;
    }

    .title {
        font-size: 22px;
    }

    .description {
        font-size: 18px;
    }
}
</style>
