<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { PrimaryButton } from "@/shared/ui/buttons";

const MAINTENANCE_END_AT = new Date("2026-07-16T17:36:36+07:00").getTime();
const { t } = useI18n();
const ghostApologies = computed(() => [
    t("shop.maintenance.messageOne"),
    t("shop.maintenance.messageTwo"),
    t("shop.maintenance.messageThree"),
]);

const ghostRef = ref<SVGSVGElement | null>(null);
const ghostEyes = ref({ x: 0, y: 0 });
const isApologyVisible = ref(false);
const apologyIndex = ref(-1);
const remainingMilliseconds = ref(Math.max(0, MAINTENANCE_END_AT - Date.now()));
let apologyTimer: number | undefined;
let countdownTimer: number | undefined;

const countdown = computed(() => {
    const totalSeconds = Math.floor(remainingMilliseconds.value / 1000);

    return {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
    };
});

const countdownLabel = computed(() => (
    remainingMilliseconds.value > 0
        ? t("shop.maintenance.countdown", countdown.value)
        : t("shop.maintenance.returning")
));
const countdownItems = computed(() => [
    { label: t("shop.maintenance.days"), value: countdown.value.days },
    { label: t("shop.maintenance.hours"), value: countdown.value.hours },
    { label: t("shop.maintenance.minutes"), value: countdown.value.minutes },
    { label: t("shop.maintenance.seconds"), value: countdown.value.seconds },
]);
const currentApology = computed(() => ghostApologies.value[apologyIndex.value] ?? ghostApologies.value[0]);

function formatCountdownValue(value: number): string {
    return String(value).padStart(2, "0");
}

function updateCountdown(): void {
    remainingMilliseconds.value = Math.max(0, MAINTENANCE_END_AT - Date.now());

    if (remainingMilliseconds.value === 0) {
        window.clearInterval(countdownTimer);
    }
}

function aimGhostEyes(event: PointerEvent): void {
    if (!ghostRef.value) return;

    const rect = ghostRef.value.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height * 0.45);
    const distance = Math.hypot(dx, dy) || 1;
    const reach = 26 * Math.min(distance, 180) / 180;

    ghostEyes.value = {
        x: (dx / distance) * reach,
        y: (dy / distance) * reach,
    };
}

function showApology(): void {
    const availableIndexes = ghostApologies.value
        .map((_, index) => index)
        .filter((index) => index !== apologyIndex.value);

    apologyIndex.value = availableIndexes[Math.floor(Math.random() * availableIndexes.length)] ?? 0;
    isApologyVisible.value = true;
    window.clearTimeout(apologyTimer);
    apologyTimer = window.setTimeout(() => {
        isApologyVisible.value = false;
    }, 2400);
}

onMounted(() => {
    window.addEventListener("pointermove", aimGhostEyes, { passive: true });
    updateCountdown();

    if (remainingMilliseconds.value > 0) {
        countdownTimer = window.setInterval(updateCountdown, 1000);
    }
});

onUnmounted(() => {
    window.removeEventListener("pointermove", aimGhostEyes);
    window.clearTimeout(apologyTimer);
    window.clearInterval(countdownTimer);
});
</script>

<template>
    <main :class="$style.maintenancePage">
        <section :class="$style.maintenanceCard" aria-labelledby="shop-maintenance-title">
            <div :class="$style.ghostArea">
                <Transition name="apology" mode="out-in">
                    <span
                        v-if="isApologyVisible"
                        :key="apologyIndex"
                        :class="$style.speechBubble"
                        role="status"
                    >
                        {{ currentApology }}
                    </span>
                </Transition>
                <button
                    type="button"
                    :class="$style.ghostButton"
                    :aria-label="t('shop.maintenance.ghostLabel')"
                    @click="showApology"
                >
                    <svg ref="ghostRef" :class="$style.ghostSvg" viewBox="0 0 360 460" aria-hidden="true">
                        <path
                            fill="#96a5c8"
                            d="M180 0A180 180 0 0 0 0 180L0 415A45 45 0 0 0 90 415A45 45 0 0 0 180 415A45 45 0 0 0 270 415A45 45 0 0 0 360 415L360 180A180 180 0 0 0 180 0Z"
                        />
                        <g
                            :class="$style.ghostEyes"
                            :style="{ transform: `translate(${ghostEyes.x}px, ${ghostEyes.y}px)` }"
                        >
                            <g :class="$style.ghostBlink">
                                <circle cx="118" cy="210" r="58" fill="#000" />
                                <circle cx="242" cy="210" r="58" fill="#000" />
                                <circle cx="98" cy="186" r="22" fill="#fff" />
                                <circle cx="222" cy="186" r="22" fill="#fff" />
                                <circle cx="140" cy="240" r="10" fill="#fff" />
                                <circle cx="264" cy="240" r="10" fill="#fff" />
                            </g>
                        </g>
                    </svg>
                </button>
            </div>

            <p :class="$style.eyebrow">{{ t("shop.maintenance.eyebrow") }}</p>
            <h1 id="shop-maintenance-title" :class="$style.title">{{ t("shop.maintenance.title") }}</h1>
            <p :class="$style.description">{{ t("shop.maintenance.expected") }}</p>

            <div
                v-if="remainingMilliseconds > 0"
                :class="$style.countdown"
                role="timer"
                :aria-label="countdownLabel"
            >
                <div v-for="item in countdownItems" :key="item.label" :class="$style.countdownItem">
                    <strong :class="$style.countdownValue">{{ formatCountdownValue(item.value) }}</strong>
                    <span :class="$style.countdownUnit">{{ item.label }}</span>
                </div>
            </div>
            <p v-else :class="$style.returningMessage" role="status">{{ t("shop.maintenance.returning") }}</p>

            <div :class="$style.divider" aria-hidden="true" />

            <p :class="$style.walletNote">{{ t("shop.maintenance.walletAvailable") }}</p>
            <PrimaryButton :class="$style.walletButton" width-mode="hug" :to="{ name: 'shop-wallet' }">
                {{ t("shop.maintenance.goToWallet") }}
            </PrimaryButton>
        </section>
    </main>
</template>

<style module>
.maintenancePage {
    display: grid;
    min-height: 100vh;
    place-items: center;
    box-sizing: border-box;
    padding: var(--spacing-space-24) var(--spacing-space-6) var(--spacing-space-16);
    background-color: var(--color-dialog-background);
    color: var(--color-dialog-text-primary);
}

.maintenanceCard {
    display: flex;
    width: min(100%, 720px);
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    padding: var(--spacing-space-16) var(--spacing-space-10);
    gap: var(--spacing-space-5);
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-dialog-background);
    text-align: center;
    box-shadow: 0 24px 64px color-mix(in srgb, var(--color-dialog-text-primary) 10%, transparent);
}

.ghostArea {
    position: relative;
    display: flex;
    min-height: 136px;
    align-items: flex-end;
    justify-content: center;
}

.ghostButton {
    width: 96px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    animation: maintenance-ghost-float 4.8s ease-in-out infinite;
}

.ghostButton:hover {
    filter: brightness(1.08);
}

.ghostButton:focus-visible {
    border-radius: var(--radius-xl);
    outline: 2px solid var(--color-dialog-text-primary);
    outline-offset: var(--spacing-space-2);
}

.ghostButton:active {
    transform: scale(0.94);
}

.ghostSvg {
    display: block;
    width: 100%;
    height: auto;
    filter: drop-shadow(0 6px 8px color-mix(in srgb, var(--color-dialog-text-primary) 18%, transparent));
}

.ghostEyes {
    transition: transform 90ms linear;
}

.ghostBlink {
    transform-box: fill-box;
    transform-origin: center;
    animation: maintenance-ghost-blink 5s ease-in-out infinite;
}

.speechBubble {
    position: absolute;
    z-index: 2;
    bottom: 120px;
    left: 50%;
    width: max-content;
    max-width: min(280px, 70vw);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-dialog-background);
    color: var(--color-dialog-text-primary);
    font-size: var(--type-size-body-small);
    font-weight: 600;
    transform: translateX(-50%);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--color-dialog-text-primary) 12%, transparent);
}

.speechBubble::before,
.speechBubble::after {
    position: absolute;
    top: 100%;
    left: 50%;
    width: 0;
    height: 0;
    border-style: solid;
    content: "";
    transform: translateX(-50%);
}

.speechBubble::before {
    border-width: 11px 9px 0;
    border-color: var(--color-dialog-divider) transparent transparent;
}

.speechBubble::after {
    margin-top: -2px;
    border-width: 9px 7px 0;
    border-color: var(--color-dialog-background) transparent transparent;
}

.eyebrow {
    margin: 0;
    color: var(--color-dialog-text-secondary);
    font-size: var(--type-size-overline);
    font-weight: 600;
    letter-spacing: 0.08em;
}

.title {
    margin: 0;
    color: var(--color-dialog-text-primary);
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.description,
.walletNote {
    margin: 0;
    color: var(--color-dialog-text-secondary);
    font-size: var(--type-size-body-main);
    line-height: 1.7;
}

.countdown {
    display: grid;
    width: min(100%, 560px);
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-3);
}

.countdownItem {
    display: flex;
    min-width: 0;
    flex-direction: column;
    padding: var(--spacing-space-4) var(--spacing-space-2);
    gap: var(--spacing-space-1);
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-dialog-background);
}

.countdownValue {
    color: var(--color-dialog-text-primary);
    font-size: var(--type-size-h2-section-title);
    font-variant-numeric: tabular-nums;
    line-height: 1;
}

.countdownUnit {
    overflow: hidden;
    color: var(--color-dialog-text-secondary);
    font-size: var(--type-size-support);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.returningMessage {
    margin: 0;
    color: var(--color-dialog-text-primary);
    font-size: var(--type-size-h2-section-title);
    font-weight: 600;
}

.divider {
    width: 100%;
    height: 1px;
    margin: var(--spacing-space-3) 0;
    background-color: var(--color-dialog-divider);
}

.walletNote {
    font-size: var(--type-size-body-small);
}

.walletButton {
    min-width: 160px;
}

@keyframes maintenance-ghost-float {
    0%, 100% {
        transform: translateY(0) rotate(-3deg);
    }

    50% {
        transform: translateY(-10px) rotate(3deg);
    }
}

@keyframes maintenance-ghost-blink {
    0%, 90%, 98%, 100% {
        transform: scaleY(1);
    }

    94% {
        transform: scaleY(0.08);
    }
}

@keyframes manga-speech-pop {
    0% {
        opacity: 0;
        transform: translateX(-50%) translateY(var(--spacing-space-4)) scale(0.18) rotate(-6deg);
    }

    58% {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1.08) rotate(2deg);
    }

    78% {
        transform: translateX(-50%) scale(0.97) rotate(-1deg);
    }

    100% {
        opacity: 1;
        transform: translateX(-50%) scale(1) rotate(0);
    }
}

:global(.apology-enter-active),
:global(.apology-leave-active) {
    transform-origin: 50% 115%;
}

:global(.apology-enter-active) {
    animation: manga-speech-pop 420ms cubic-bezier(0.2, 0.9, 0.25, 1.25);
}

:global(.apology-leave-active) {
    transition: opacity 160ms ease, transform 160ms ease;
}

:global(.apology-enter-from),
:global(.apology-leave-to) {
    opacity: 0;
    transform: translateX(-50%) translateY(var(--spacing-space-2)) scale(0.88);
}

@media (max-width: 767px) {
    .maintenancePage {
        padding: var(--spacing-space-20) var(--spacing-space-4) var(--spacing-space-10);
    }

    .maintenanceCard {
        padding: var(--spacing-space-10) var(--spacing-space-5);
    }

    .countdown {
        gap: var(--spacing-space-2);
    }

    .countdownItem {
        padding: var(--spacing-space-3) var(--spacing-space-1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .ghostButton,
    .ghostBlink {
        animation: none;
    }

    .ghostEyes {
        transition: none;
    }

    :global(.apology-enter-active),
    :global(.apology-leave-active) {
        animation: none;
        transition: none;
    }
}
</style>
