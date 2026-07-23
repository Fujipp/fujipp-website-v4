<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { SecondaryButton } from "@/shared/ui/buttons";
import { icons } from "@/config";
import { useLocaleText } from "@/i18n";

const text = useLocaleText();

export type FeatureCardVariant = "sell" | "owned";

interface Props {
    variant?: FeatureCardVariant;
    icon?: string;
    // Pre-formatted price string, shown on the "sell" variant only (e.g. "฿ 999").
    price?: string;
    title?: string;
    description?: string;
    // Owned count label, shown on the "owned" variant (e.g. "1 items").
    itemsLabel?: string;
    buyLabel?: string;
    useLabel?: string;
    readMoreLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    variant: "sell",
    icon: icons.shopRoblox,
    price: "",
    title: "",
    description: "",
    itemsLabel: "",
    buyLabel: "Buy",
    useLabel: "Use",
});

const emit = defineEmits<{ buy: []; use: []; "read-more": [] }>();

// The description is clamped to a fixed number of lines so every card is the same
// height; when the text is longer than the clamp we surface a "read more" affordance.
const descRef = ref<HTMLElement | null>(null);
const isOverflowing = ref(false);
let resizeObserver: ResizeObserver | undefined;

function measureOverflow(): void {
    const el = descRef.value;
    if (!el) return;
    isOverflowing.value = el.scrollHeight - el.clientHeight > 1;
}

onMounted(() => {
    measureOverflow();
    resizeObserver = new ResizeObserver(measureOverflow);
    if (descRef.value) resizeObserver.observe(descRef.value);
});

watch(() => props.description, () => nextTick(measureOverflow));

onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<template>
    <article :class="$style.card" :aria-label="title">
        <img :class="$style.icon" :src="icon" alt="" aria-hidden="true" draggable="false">

        <div :class="$style.content">
            <p v-if="variant === 'sell' && price" :class="$style.price">{{ price }}</p>
            <h3 :class="$style.title">{{ title }}</h3>
            <p ref="descRef" :class="$style.description">{{ description }}</p>
            <div :class="$style.readMoreRow">
                <button
                    v-if="isOverflowing"
                    type="button"
                    :class="$style.readMore"
                    @click="emit('read-more')"
                >
                    {{ readMoreLabel || text("Read more", "อ่านเพิ่มเติม") }}
                </button>
            </div>
        </div>

        <SecondaryButton
            v-if="variant === 'sell'"
            width-mode="fill"
            :trailing-icon="icons.buy"
            @click="emit('buy')"
        >
            {{ buyLabel === "Buy" ? text("Buy", "ซื้อ") : buyLabel }}
        </SecondaryButton>

        <div v-else :class="$style.ownedRow">
            <span :class="$style.itemsLabel">{{ itemsLabel }}</span>
            <SecondaryButton width-mode="hug" @click="emit('use')">{{ useLabel === "Use" ? text("Use", "ใช้งาน") : useLabel }}</SecondaryButton>
        </div>
    </article>
</template>

<style module>
.card {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    min-height: var(--spacing-space-80);
    justify-content: space-between;
    padding: var(--spacing-space-3);
    gap: var(--spacing-space-3);
    overflow: hidden;
    border: 1px solid var(--shop-card-border, var(--color-main-divider));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-background));
    color: var(--shop-card-muted, var(--color-text-secondary));
    text-align: left;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.icon {
    width: var(--spacing-space-24);
    height: var(--spacing-space-24);
    flex-shrink: 0;
    object-fit: contain;
}

/* Fixed-height content block → all cards line up regardless of text length. */
.content {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-space-2);
}

.price {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h3-card-title);
    font-weight: 600;
    line-height: 1.1;
}

.title {
    align-self: stretch;
    margin: 0;
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: var(--type-size-body-main);
    font-weight: 600;
    line-height: normal;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.description {
    display: -webkit-box;
    align-self: stretch;
    min-height: calc(1.5em * 3);
    margin: 0;
    overflow: hidden;
    font-size: var(--type-size-body-small);
    font-weight: 400;
    line-height: 1.5;
    text-overflow: ellipsis;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
}

/* Reserve the row on every card so the footer stays aligned whether or not the
   "read more" link is present. */
.readMoreRow {
    align-self: stretch;
    min-height: var(--spacing-space-5);
}

.readMore {
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--type-size-button);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
}

.readMore:hover {
    opacity: 0.8;
}

.readMore:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.ownedRow {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    gap: var(--spacing-space-4);
    color: var(--color-text-primary);
}

.itemsLabel {
    font-size: var(--type-size-h3-card-title);
    font-weight: 600;
}

</style>
