<script setup lang="ts">
import { SecondaryButton } from "@/shared/ui/buttons";
import { icons } from "@/config";
import { useLocaleText } from "@/i18n";

const text = useLocaleText();

export type RuntimeSlotCardVariant = "sell" | "owned";

interface Props {
    variant?: RuntimeSlotCardVariant;
    icon?: string;
    // Pre-formatted price string, shown on the "sell" variant only (e.g. "฿ 69").
    price?: string;
    vps?: string | number;
    slot?: string | number;
    // Region / status meta, e.g. "th" and "ACTIVE".
    region?: string;
    state?: string;
    // Pre-formatted runtime string, e.g. "1 Month" or "30 Days 24:00:00".
    runtime?: string;
    buyLabel?: string;
    useLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    variant: "sell",
    icon: icons.shopServer,
    price: "",
    vps: 1,
    slot: 1,
    region: "th",
    state: "ACTIVE",
    runtime: "1 Month",
    buyLabel: "Buy",
    useLabel: "Use",
});

const emit = defineEmits<{ buy: []; use: []; "add-time": [] }>();
</script>

<template>
    <article :class="$style.card" :aria-label="`${vps} VPS ${slot} slot runtime`">
        <span
            :class="$style.icon"
            :style="{ '--runtime-slot-icon': `url(${icon})` }"
            aria-hidden="true"
        />

        <div :class="$style.body">
            <p v-if="variant === 'sell' && price" :class="$style.price">{{ price }}</p>

            <p :class="$style.slotLine">
                <span :class="$style.labelLight">VPS : </span>
                <span :class="$style.valueBold">{{ vps }}</span>
                <span :class="$style.labelLight"> SLOT : </span>
                <span :class="$style.valueSemi">{{ slot }}</span>
            </p>

            <p :class="$style.metaLine">{{ region }} · {{ state }}</p>

            <p :class="$style.runtimeLine">
                <span :class="$style.labelLight">Runtime : </span>
                <span :class="$style.valueSemi">{{ runtime }}</span>
            </p>
        </div>

        <div :class="$style.actions">
            <SecondaryButton
                v-if="variant === 'sell'"
                width-mode="fill"
                :trailing-icon="icons.buy"
                @click="emit('buy')"
            >
                {{ buyLabel === "Buy" ? text("Buy", "ซื้อ") : buyLabel }}
            </SecondaryButton>

            <template v-else>
                <SecondaryButton width-mode="fill" @click="emit('use')">{{ useLabel === "Use" ? text("Use", "ใช้งาน") : useLabel }}</SecondaryButton>
                <SecondaryButton
                    variant="icon"
                    :leading-icon="icons.shopReTime"
                    :aria-label="text('Add Runtime time', 'เพิ่มเวลา Runtime')"
                    @click="emit('add-time')"
                />
            </template>
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
    min-height: var(--spacing-space-80);
    height: 100%;
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
    --runtime-slot-icon: none;
    width: var(--spacing-space-24);
    height: var(--spacing-space-24);
    flex-shrink: 0;
    background-color: var(--color-text-primary);
    mask: var(--runtime-slot-icon) center / contain no-repeat;
    -webkit-mask: var(--runtime-slot-icon) center / contain no-repeat;
}

.body {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-space-3);
}

.price {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-h3-card-title);
    font-weight: 600;
    line-height: 1.1;
}

.slotLine {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--type-size-body-main);
    line-height: normal;
}

.metaLine {
    margin: 0;
    font-size: var(--type-size-body-small);
    font-weight: 400;
    line-height: normal;
}

.runtimeLine {
    margin: 0;
    font-size: var(--type-size-body-small);
    line-height: normal;
}

.labelLight {
    font-weight: 300;
}

.valueBold {
    font-weight: 800;
}

.valueSemi {
    font-weight: 600;
}

.actions {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
}

</style>
