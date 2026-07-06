<script setup lang="ts">
import { SecondaryButton } from "@/shared/ui/buttons";
import { icons } from "@/config";

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
        <img :class="$style.icon" :src="icon" alt="" aria-hidden="true" draggable="false">

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
                {{ buyLabel }}
            </SecondaryButton>

            <template v-else>
                <SecondaryButton width-mode="fill" @click="emit('use')">{{ useLabel }}</SecondaryButton>
                <SecondaryButton
                    variant="icon"
                    :leading-icon="icons.shopReTime"
                    aria-label="เพิ่มเวลา runtime"
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
    padding: 12px;
    gap: 12px;
    overflow: hidden;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-background);
    color: var(--color-text-secondary);
    text-align: left;
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.icon {
    width: 96px;
    height: 96px;
    object-fit: contain;
}

.body {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
}

.price {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 32px;
    font-weight: 600;
    line-height: 1.1;
}

.slotLine {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 24px;
    line-height: 1.2;
}

.metaLine {
    margin: 0;
    font-size: 16px;
    font-weight: 300;
    line-height: 1.2;
}

.runtimeLine {
    margin: 0;
    font-size: 18px;
    line-height: 1.2;
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
    gap: 20px;
}

@media (max-width: 520px) {
    .price {
        font-size: 28px;
    }

    .slotLine {
        font-size: 20px;
    }
}
</style>
