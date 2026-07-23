<script setup lang="ts">
import { useLocaleText } from "@/i18n";

const text = useLocaleText();
interface Props {
    avatarUrl?: string;
    balance: string;
    loading?: boolean;
    username: string;
}

withDefaults(defineProps<Props>(), {
    avatarUrl: "/images/users/fujipp/profile-fujipp.png",
    loading: false,
});
</script>

<template>
    <article :class="$style.card" aria-live="polite">
        <!-- Soft diagonal sheen so the card reads as a glossy credit card. -->
        <span :class="$style.sheen" aria-hidden="true" />

        <header :class="$style.top">
            <div :class="$style.brand">
                <img
                    :class="$style.brandAvatar"
                    :src="avatarUrl"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                >
                <span :class="$style.brandName">Fujipp Wallet</span>
            </div>
            <span :class="$style.network">{{ text("CREDIT", "เครดิต") }}</span>
        </header>

        <span :class="$style.chip" aria-hidden="true" />

        <div :class="$style.balanceBlock">
            <span :class="$style.creditLabel">{{ text("Your credit", "เครดิตของคุณ") }}</span>
            <div :class="$style.balanceLine">
                <span :class="$style.balanceValue">{{ loading ? "•••" : balance }}</span>
                <span :class="$style.balanceUnit">{{ text("THB", "บาท") }}</span>
            </div>
        </div>

        <footer :class="$style.bottom">
            <div :class="$style.holder">
                <span :class="$style.holderLabel">{{ text("CARD HOLDER", "เจ้าของกระเป๋า") }}</span>
                <span :class="$style.holderName">{{ username }}</span>
            </div>
            <span :class="$style.mark" aria-hidden="true">
                <span :class="$style.markRing" />
                <span :class="[$style.markRing, $style.markRingOffset]" />
            </span>
        </footer>
    </article>
</template>

<style module>
.card {
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    max-width: 420px;
    aspect-ratio: 1.586 / 1;
    min-height: 240px;
    padding: var(--spacing-space-6);
    overflow: hidden;
    border-radius: var(--radius-2xl);
    /* Fixed dark gradient (token) — text stays light in BOTH themes. */
    background: var(--gradient-card-highlight);
    color: var(--color-text-secondary);
    box-shadow: 0 18px 44px color-mix(in srgb, var(--color-main-primary) 30%, transparent);
    transition: box-shadow 200ms ease, transform 200ms ease;
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 24px 56px color-mix(in srgb, var(--color-main-primary) 42%, transparent);
}

.sheen {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        125deg,
        color-mix(in srgb, #ffffff 16%, transparent) 0%,
        transparent 38%,
        transparent 100%
    );
    pointer-events: none;
}

.top {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
}

.brand {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
    min-width: 0;
}

.brandAvatar {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    object-fit: cover;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-text-secondary) 35%, transparent);
}

.brandName {
    overflow: hidden;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.2px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.network {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    color: color-mix(in srgb, var(--color-text-secondary) 78%, transparent);
}

/* Gold EMV-style chip. */
.chip {
    position: relative;
    width: 44px;
    height: 32px;
    margin-top: var(--spacing-space-5);
    border-radius: 7px;
    background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-status-warning) 88%, white) 0%,
        var(--color-status-warning) 55%,
        color-mix(in srgb, var(--color-status-warning) 70%, black) 100%
    );
    box-shadow: inset 0 0 0 1px color-mix(in srgb, black 18%, transparent);
}

.balanceBlock {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.creditLabel {
    font-size: 13px;
    letter-spacing: 0.2px;
    color: color-mix(in srgb, var(--color-text-secondary) 72%, transparent);
}

.balanceLine {
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.balanceValue {
    font-size: 38px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.5px;
    overflow-wrap: anywhere;
}

.balanceUnit {
    font-size: 16px;
    font-weight: 600;
    color: color-mix(in srgb, var(--color-text-secondary) 80%, transparent);
}

.bottom {
    margin-top: var(--spacing-space-5);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-space-3);
}

.holder {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.holderLabel {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.5px;
    color: color-mix(in srgb, var(--color-text-secondary) 60%, transparent);
}

.holderName {
    overflow: hidden;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Interlocking-rings payment mark. */
.mark {
    position: relative;
    flex-shrink: 0;
    width: 46px;
    height: 28px;
}

.markRing {
    position: absolute;
    top: 0;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-text-secondary) 55%, transparent);
}

.markRing.markRingOffset {
    left: 18px;
    background: color-mix(in srgb, var(--color-main-primary) 80%, white);
    mix-blend-mode: screen;
}

@media (max-width: 520px) {
    .card { max-width: 100%; }
    .balanceValue { font-size: 32px; }
}
</style>
