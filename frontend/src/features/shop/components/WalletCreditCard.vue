<script setup lang="ts">
import { computed } from "vue";

// Visual tiers unlocked by the wallet balance (in baht). 5k and 10k share the
// same red per the Figma; the threshold split is kept so they can diverge later.
export type WalletCreditTier = "default" | "t500" | "t1k" | "t5k" | "t10k";

interface Props {
    // Wallet balance in baht.
    balance?: number;
    holder?: string;
    currency?: string;
    // Optional bank/brand logo (top-right) and the card emblem/chip image.
    logo?: string;
    emblem?: string;
    holderLabel?: string;
    brand?: string;
    scheme?: string;
    schemeTier?: string;
}

const props = withDefaults(defineProps<Props>(), {
    balance: 0,
    holder: "Fujipp",
    currency: "฿",
    logo: "",
    emblem: "",
    holderLabel: "CARD HOLDER",
    brand: "PRIVATE BANKING",
    scheme: "VISA",
    schemeTier: "infinite",
});

const tier = computed<WalletCreditTier>(() => {
    const balance = props.balance;
    if (balance >= 10000) return "t10k";
    if (balance >= 5000) return "t5k";
    if (balance >= 1000) return "t1k";
    if (balance >= 500) return "t500";
    return "default";
});

const formattedBalance = computed(() => `${props.balance.toLocaleString("th-TH")}${props.currency}`);

function updateCardTilt(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    target.style.setProperty("--card-tilt-x", `${x * 4}deg`);
    target.style.setProperty("--card-tilt-y", `${y * -4}deg`);
}

function resetCardTilt(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    target.style.setProperty("--card-tilt-x", "0deg");
    target.style.setProperty("--card-tilt-y", "0deg");
}
</script>

<template>
    <article
        :class="[$style.card, $style[tier], tier !== 'default' ? $style.goldTier : '']"
        :aria-label="`${holder} balance ${formattedBalance}`"
        @pointermove="updateCardTilt"
        @pointerleave="resetCardTilt"
    >
        <div :class="$style.top">
            <div :class="$style.brandRow">
                <span :class="[$style.brand, $style.gold]">{{ brand }}</span>
                <img v-if="logo" :class="$style.logo" :src="logo" alt="" aria-hidden="true" draggable="false">
            </div>
            <img v-if="emblem" :class="$style.emblem" :src="emblem" alt="" aria-hidden="true" draggable="false">
            <span v-else :class="$style.chip" aria-hidden="true" />
        </div>

        <span :class="$style.balance">{{ formattedBalance }}</span>

        <div :class="$style.bottom">
            <div :class="[$style.holder, $style.gold]">
                <span :class="$style.holderLabel">{{ holderLabel }}</span>
                <span :class="$style.holderName">{{ holder }}</span>
            </div>
            <div :class="[$style.scheme, $style.gold]">
                <span :class="$style.schemeName">{{ scheme }}</span>
                <span :class="$style.schemeTier">{{ schemeTier }}</span>
            </div>
        </div>
    </article>
</template>

<style module>
.card {
    --card-tilt-x: 0deg;
    --card-tilt-y: 0deg;

    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    box-sizing: border-box;
    width: 100%;
    height: 224px;
    padding: 12px;
    gap: 10px;
    overflow: hidden;
    isolation: isolate;
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    color: #d2d2d2;
    font-family: var(--font-sans);
    text-align: left;
    transform:
        perspective(900px)
        rotateX(var(--card-tilt-y))
        rotateY(var(--card-tilt-x));
    transform-style: preserve-3d;
    transition: transform 180ms ease, box-shadow 180ms ease;
    will-change: transform;
}

.card:hover {
    box-shadow: 0 10px 20px rgb(0 0 0 / 18%);
}

/* Tier backgrounds — bespoke card art, no semantic token applies. */
.default {
    background-color: var(--color-neutral-50);
    color: var(--color-text-primary);
}

.t500 {
    background: linear-gradient(180deg, #000000, #636363);
}

.t1k {
    background: linear-gradient(180deg, #1d1439, #20236c);
}

.t5k,
.t10k {
    background: linear-gradient(180deg, #8d1000, #cf0003);
}

.top {
    z-index: 1;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    flex-shrink: 0;
}

.brandRow {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
}

.brand {
    font-size: 15px;
    font-weight: 300;
    letter-spacing: 0.04em;
}

.logo {
    width: 39px;
    height: 34px;
    object-fit: contain;
}

.emblem {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-base);
    object-fit: cover;
}

/* EMV-style chip stand-in when no emblem image is supplied. */
.chip {
    width: 56px;
    height: 42px;
    border-radius: 6px;
    background: linear-gradient(145deg, #f4e2a1 0%, #cfa947 45%, #a9832f 100%);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 18%);
}

.balance {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    font-size: 64px;
    font-weight: 800;
    line-height: 1;
    pointer-events: none;
}

.bottom {
    z-index: 1;
    align-self: stretch;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    flex-shrink: 0;
}

.holder {
    display: flex;
    flex-direction: column;
    font-size: 14px;
}

.holderLabel {
    font-weight: 300;
}

.holderName {
    font-size: 24px;
    font-weight: 600;
}

.scheme {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: 24px;
    font-weight: 700;
    text-align: right;
}

.schemeTier {
    font-size: 15px;
    font-weight: 400;
}

/* Gold foil text on the coloured tiers; plain ink on the white default. */
.goldTier .gold {
    background: linear-gradient(233.07deg, #ceb45c, #debf62 34.13%, #cfa947 60.1%, #d3aa47);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
}

@media (max-width: 520px) {
    .balance {
        font-size: 44px;
    }

    .holderName,
    .scheme {
        font-size: 20px;
    }
}
</style>
