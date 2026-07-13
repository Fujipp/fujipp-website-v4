<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useCssModule } from "vue";
import { useI18n } from "vue-i18n";
import { AppFooter } from "@/shared/layout";
import { PrimaryButton } from "@/shared/ui/buttons";
import { backend, database, devops, frontend, getIconColorMode, icons, language } from "@/config";

const { t } = useI18n();

/* v-reveal: fade-and-rise elements into view as they scroll in. One shared
   observer; each element optionally staggers via --reveal-delay. The hidden
   state only exists under prefers-reduced-motion: no-preference, so content
   is never lost without the effect. */
const style = useCssModule();
let revealObserver: IntersectionObserver | undefined;

const vReveal = {
    mounted(el: HTMLElement) {
        el.classList.add(style.reveal);
        revealObserver ??= new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    entry.target.classList.add(style.revealed);
                    revealObserver?.unobserve(entry.target);
                }
            }
        }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
        revealObserver.observe(el);
    },
};

onUnmounted(() => {
    revealObserver?.disconnect();
    revealObserver = undefined;
});

const birthTimestamp = new Date("2003-11-26T00:00:00+07:00").getTime();
const livedElapsedMs = ref(Math.max(Date.now() - birthTimestamp, 0));
let livedTimer: number | undefined;

/* "22 Years 220 Days 12:37:02.123" — years/days from the last birthday anniversary. */
const livedClock = computed(() => {
    const now = new Date(birthTimestamp + Math.max(livedElapsedMs.value, 0));
    const birth = new Date(birthTimestamp);

    let years = now.getFullYear() - birth.getFullYear();
    let anniversary = new Date(birth);
    anniversary.setFullYear(birth.getFullYear() + years);

    if (anniversary.getTime() > now.getTime()) {
        years -= 1;
        anniversary = new Date(birth);
        anniversary.setFullYear(birth.getFullYear() + years);
    }

    const sinceAnniversaryMs = now.getTime() - anniversary.getTime();
    const days = Math.floor(sinceAnniversaryMs / 86_400_000);
    const hours = Math.floor((sinceAnniversaryMs % 86_400_000) / 3_600_000);
    const minutes = Math.floor((sinceAnniversaryMs % 3_600_000) / 60_000);
    const seconds = Math.floor((sinceAnniversaryMs % 60_000) / 1000);
    const milliseconds = Math.floor(sinceAnniversaryMs % 1000);

    return {
        years,
        days,
        time: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        ms: milliseconds.toString().padStart(3, "0"),
    };
});

onMounted(() => {
    livedTimer = window.setInterval(() => {
        livedElapsedMs.value = Math.max(Date.now() - birthTimestamp, 0);
    }, 50);
});

onUnmounted(() => {
    if (livedTimer !== undefined) {
        window.clearInterval(livedTimer);
    }
});

const contactLinks = [
    { label: "Send email", href: "mailto:anawat.grudtoop@gmail.com", icon: icons.gmail },
    { label: "Instagram profile", href: "https://www.instagram.com/f.janw/", icon: icons.instagram },
    { label: "Discord profile", href: "https://discord.com/users/1108816021915176962", icon: icons.discord },
    { label: "GitHub profile", href: "https://github.com/Fujipp", icon: icons.github },
];

const skillGroups = [
    { key: "language", items: language },
    { key: "frontend", items: frontend },
    { key: "backend", items: backend },
    { key: "database", items: database },
    { key: "infra", items: devops },
];

/* Banner ghosts (redrawn as inline SVG from the mascot PNGs) whose eyes
   follow the pointer anywhere on the page. Offsets are in viewBox units,
   clamped so the pupils stay inside the body. */
const ghostARef = ref<SVGSVGElement | null>(null);
const ghostBRef = ref<SVGSVGElement | null>(null);
const ghostAEyes = ref({ x: 0, y: 0 });
const ghostBEyes = ref({ x: 0, y: 0 });

function aimEyes(
    el: SVGSVGElement | null,
    state: { value: { x: number; y: number } },
    event: PointerEvent,
): void {
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height * 0.45);
    const distance = Math.hypot(dx, dy) || 1;
    // Eyes saturate to full deflection once the pointer is ~180px away.
    const reach = 26 * Math.min(distance, 180) / 180;

    state.value = { x: (dx / distance) * reach, y: (dy / distance) * reach };
}

function onBannerPointerMove(event: PointerEvent): void {
    aimEyes(ghostARef.value, ghostAEyes, event);
    aimEyes(ghostBRef.value, ghostBEyes, event);
}

onMounted(() => {
    window.addEventListener("pointermove", onBannerPointerMove, { passive: true });
});

onUnmounted(() => {
    window.removeEventListener("pointermove", onBannerPointerMove);
});

const bannerSparkles = [
    { top: "22%", left: "8%", "--sparkle-delay": "0s", "--sparkle-scale": "1" },
    { top: "58%", left: "16%", "--sparkle-delay": "-1.1s", "--sparkle-scale": "0.6" },
    { top: "14%", left: "27%", "--sparkle-delay": "-2.3s", "--sparkle-scale": "0.8" },
    { top: "70%", left: "34%", "--sparkle-delay": "-0.6s", "--sparkle-scale": "1.1" },
    { top: "30%", left: "45%", "--sparkle-delay": "-1.8s", "--sparkle-scale": "0.7" },
    { top: "62%", left: "55%", "--sparkle-delay": "-2.9s", "--sparkle-scale": "0.9" },
    { top: "18%", left: "64%", "--sparkle-delay": "-0.9s", "--sparkle-scale": "1.2" },
    { top: "48%", left: "72%", "--sparkle-delay": "-2.1s", "--sparkle-scale": "0.6" },
    { top: "26%", left: "84%", "--sparkle-delay": "-1.4s", "--sparkle-scale": "1" },
    { top: "66%", left: "91%", "--sparkle-delay": "-2.6s", "--sparkle-scale": "0.8" },
];

const designCards = [
    { src: "/images/design/logo-gear.png", label: "FJ gear logo" },
    { src: "/images/design/logo-draft-fj-curved.png", label: "FJ curved logo draft" },
    { src: "/images/design/logo-draft-fj-rounded.png", label: "FJ rounded logo draft" },
    { src: "/images/design/logo-draft-fuji-mountain.png", label: "Mount Fuji logo draft" },
];
</script>

<template>
    <main :class="$style.aboutPage">
            <div :class="$style.container">
            <div :class="$style.banner" aria-hidden="true">
                <!-- Mascot ghosts redrawn as SVG (body colors sampled from the
                     ghost PNGs) so the eyes can track the pointer and blink. -->
                <span :class="[$style.ghostSpot, $style.ghostSpotA]">
                    <svg ref="ghostARef" :class="$style.ghostSvg" viewBox="0 0 360 460">
                        <path
                            fill="#3a4157"
                            d="M180 0A180 180 0 0 0 0 180L0 415A45 45 0 0 0 90 415A45 45 0 0 0 180 415A45 45 0 0 0 270 415A45 45 0 0 0 360 415L360 180A180 180 0 0 0 180 0Z"
                        />
                        <g
                            :class="$style.ghostEyes"
                            :style="{ transform: `translate(${ghostAEyes.x}px, ${ghostAEyes.y}px)` }"
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
                </span>
                <span :class="[$style.ghostSpot, $style.ghostSpotB]">
                    <svg ref="ghostBRef" :class="$style.ghostSvg" viewBox="0 0 360 460">
                        <path
                            fill="#96a5c8"
                            d="M180 0A180 180 0 0 0 0 180L0 415A45 45 0 0 0 90 415A45 45 0 0 0 180 415A45 45 0 0 0 270 415A45 45 0 0 0 360 415L360 180A180 180 0 0 0 180 0Z"
                        />
                        <g
                            :class="$style.ghostEyes"
                            :style="{ transform: `translate(${ghostBEyes.x}px, ${ghostBEyes.y}px)` }"
                        >
                            <g :class="[$style.ghostBlink, $style.ghostBlinkB]">
                                <circle cx="118" cy="210" r="58" fill="#000" />
                                <circle cx="242" cy="210" r="58" fill="#000" />
                                <circle cx="98" cy="186" r="22" fill="#fff" />
                                <circle cx="222" cy="186" r="22" fill="#fff" />
                                <circle cx="140" cy="240" r="10" fill="#fff" />
                                <circle cx="264" cy="240" r="10" fill="#fff" />
                            </g>
                        </g>
                    </svg>
                </span>
                <span
                    v-for="(sparkle, index) in bannerSparkles"
                    :key="index"
                    :class="$style.bannerSparkle"
                    :style="sparkle"
                />
                <span :class="$style.bannerShine" />
            </div>

            <section v-reveal :class="$style.profile" aria-label="Profile">
                <div :class="$style.identity">
                    <img
                        :class="$style.avatar"
                        src="/images/users/fujipp/profile-fujipp.png"
                        :alt="t('about.profile.name')"
                        draggable="false"
                    >
                    <div :class="$style.identityText">
                        <h1 :class="$style.name">
                            <span :class="$style.nameMain">{{ t("about.profile.name") }} </span>
                            <span :class="$style.nameNick">{{ t("about.profile.nick") }}</span>
                        </h1>
                        <p :class="$style.fact">{{ t("about.profile.location") }}</p>
                        <p :class="[$style.fact, $style.livedFact]">
                            {{ t("about.profile.lived") }}:
                            {{ livedClock.years }} {{ t("about.profile.years") }}
                            {{ livedClock.days }} {{ t("about.profile.days") }}
                            {{ livedClock.time }}<span :class="$style.livedMs">.{{ livedClock.ms }}</span>
                        </p>
                    </div>
                </div>
                <div :class="$style.contacts">
                    <PrimaryButton
                        v-for="link in contactLinks"
                        :key="link.href"
                        :icon="link.icon"
                        :href="link.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        :aria-label="link.label"
                    />
                </div>
            </section>

            <div :class="$style.storyRows">
                <section v-reveal :class="$style.storySection" aria-labelledby="about-me-title">
                    <h2 id="about-me-title" :class="$style.sectionTitle">{{ t("about.sections.about") }}</h2>
                    <p :class="$style.sectionBody">{{ t("about.intro") }}</p>
                </section>

                <section v-reveal :class="$style.storySection" aria-labelledby="about-educations-title">
                    <h2 id="about-educations-title" :class="$style.sectionTitle">{{ t("about.sections.educations") }}</h2>
                    <p :class="$style.sectionBody">{{ t("about.education.university") }}</p>
                </section>
            </div>

            <div :class="$style.showcaseRow">
                <section v-reveal :class="$style.skills" aria-labelledby="about-skills-title">
                    <h2 id="about-skills-title" :class="$style.sectionTitle">{{ t("about.sections.skills") }}</h2>
                    <div
                        v-for="(group, groupIndex) in skillGroups"
                        v-reveal
                        :key="group.key"
                        :class="$style.skillGroup"
                        :style="{ '--reveal-delay': `${groupIndex * 90}ms` }"
                    >
                        <div :class="$style.groupHeader">
                            <span
                                v-if="group.items[0]?.icon"
                                :class="$style.groupIcon"
                                :style="{
                                    mask: `url(${group.items[0].icon}) center / contain no-repeat`,
                                    '-webkit-mask': `url(${group.items[0].icon}) center / contain no-repeat`,
                                }"
                                aria-hidden="true"
                            />
                            <h3 :class="$style.groupTitle">{{ t(`about.skillGroups.${group.key}`) }}</h3>
                        </div>
                        <div :class="$style.chips">
                            <span
                                v-for="skill in group.items.slice(1)"
                                :key="skill.label"
                                :class="$style.chip"
                                role="img"
                                :aria-label="skill.label"
                                tabindex="0"
                            >
                                <img
                                    v-if="skill.icon && getIconColorMode(skill.icon) === 'original'"
                                    :class="$style.chipIcon"
                                    :src="skill.icon"
                                    alt=""
                                    draggable="false"
                                >
                                <span
                                    v-else-if="skill.icon"
                                    :class="[$style.chipIcon, $style.chipMaskIcon]"
                                    :style="{
                                        mask: `url(${skill.icon}) center / contain no-repeat`,
                                        '-webkit-mask': `url(${skill.icon}) center / contain no-repeat`,
                                    }"
                                    aria-hidden="true"
                                />
                                <span :class="$style.chipLabel" aria-hidden="true">{{ skill.label }}</span>
                            </span>
                        </div>
                    </div>
                </section>

                <section v-reveal :class="$style.design" aria-labelledby="about-design-title">
                    <h2 id="about-design-title" :class="$style.sectionTitle">{{ t("about.sections.design") }}</h2>
                    <div :class="$style.designCards">
                        <img
                            v-for="(card, cardIndex) in designCards"
                            v-reveal
                            :key="card.src"
                            :class="$style.designCard"
                            :src="card.src"
                            :alt="card.label"
                            :style="{ '--reveal-delay': `${cardIndex * 110}ms` }"
                            draggable="false"
                        >
                    </div>
                </section>
            </div>
        </div>
        <AppFooter />
    </main>
</template>

<style module>
.aboutPage {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-height: 100dvh;
    padding-top: 73px; /* fixed navbar height */
    /* Transparent so the fixed BackgroundEffect shows through. */
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    text-align: left;
}

.container {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, 1280px);
    margin: 0 auto;
    flex: 1;
}

/* Flat surface-toned banner, matching the dark sections on the Home page. */
.banner {
    position: relative;
    width: 100%;
    height: 256px;
    overflow: hidden;
    isolation: isolate;
    background-color: var(--color-main-surface);
}

.ghostSpot {
    position: absolute;
    z-index: 2;
    animation: banner-ghost-bob 5.5s ease-in-out infinite;
    pointer-events: none;
}

.ghostSpotA {
    --ghost-tilt: -6deg;

    top: 16%;
    left: 10%;
    width: 118px;
}

.ghostSpotB {
    --ghost-tilt: 8deg;

    top: 34%;
    right: 12%;
    width: 86px;
    animation-duration: 7s;
    animation-delay: -2.4s;
}

.ghostSvg {
    display: block;
    width: 100%;
    height: auto;
    filter: drop-shadow(0 6px 8px rgb(0 0 0 / 18%));
}

.ghostEyes {
    transition: transform 90ms linear;
}

.ghostBlink {
    transform-box: fill-box;
    transform-origin: center;
    animation: ghost-blink 5s ease-in-out infinite;
}

.ghostBlinkB {
    animation-delay: -2.7s;
}

@keyframes banner-ghost-bob {
    0%,
    100% {
        transform: translateY(0) rotate(var(--ghost-tilt));
    }

    50% {
        transform: translateY(-10px) rotate(calc(var(--ghost-tilt) + 4deg));
    }
}

@keyframes ghost-blink {
    0%,
    90%,
    98%,
    100% {
        transform: scaleY(1);
    }

    94% {
        transform: scaleY(0.08);
    }
}

.bannerSparkle {
    position: absolute;
    z-index: 3;
    width: 8px;
    height: 8px;
    /* Surface background pairs with the secondary text tone in both themes. */
    background: var(--color-text-secondary);
    clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
    opacity: 0;
    animation: banner-twinkle 3.4s ease-in-out infinite;
    animation-delay: var(--sparkle-delay, 0s);
    pointer-events: none;
}

@keyframes banner-twinkle {
    0%,
    100% {
        opacity: 0;
        transform: scale(calc(var(--sparkle-scale, 1) * 0.3)) rotate(0deg);
    }

    50% {
        opacity: 0.75;
        transform: scale(var(--sparkle-scale, 1)) rotate(90deg);
    }
}

/* Light sweep gliding across the dark surface every few seconds. */
.bannerShine {
    position: absolute;
    inset: -30% -35%;
    z-index: 4;
    background: linear-gradient(105deg, transparent 43%, rgb(255 255 255 / 14%) 50%, transparent 57%);
    mix-blend-mode: screen;
    animation: banner-shine 7s ease-in-out infinite;
    pointer-events: none;
}

@keyframes banner-shine {
    0%,
    55% {
        transform: translateX(-115%) skewX(-8deg);
    }

    90%,
    100% {
        transform: translateX(115%) skewX(-8deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .ghostEyes {
        transition: none;
    }

    .ghostSpot,
    .ghostBlink,
    .bannerSparkle,
    .bannerShine {
        animation: none;
    }

    .bannerSparkle {
        opacity: 0.4;
        transform: scale(var(--sparkle-scale, 1));
    }
}

.profile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-3) var(--spacing-space-16);
}

.identity {
    display: flex;
    align-items: center;
    flex: 1;
    gap: 8px;
}

.avatar {
    width: 128px;
    height: 128px;
    flex-shrink: 0;
    border-radius: var(--radius-xl);
    object-fit: cover;
    box-shadow: 0 0 0 0 transparent;
    transition: transform 300ms ease, box-shadow 300ms ease;
    user-select: none;
    -webkit-user-drag: none;
}

.avatar:hover {
    transform: scale(1.04) rotate(-2deg);
    box-shadow:
        0 0 0 3px color-mix(in srgb, var(--color-text-primary) 22%, transparent),
        0 10px 22px rgb(0 0 0 / 16%);
}

.identityText {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 8px;
}

.name {
    margin: 0;
    font-size: 32px;
    line-height: normal;
}

.nameMain {
    font-weight: 800;
}

.nameNick {
    font-weight: 600;
}

.fact {
    margin: 0;
    font-size: 18px;
    font-weight: 300;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-secondary)
}

.livedMs {
    color: var(--color-text-secondary);
}

.contacts {
    display: flex;
    align-items: center;
    gap: 8px;
}

.storyRows {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--spacing-space-8);
    padding: var(--spacing-space-16);
}

.storySection {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.sectionTitle {
    margin: 0;
    font-size: var(--type-size-h2-section-title);
    font-weight: 600;
}

/* Accent bar that draws itself in when the section scrolls into view. */
.sectionTitle::after {
    display: block;
    width: 48px;
    height: 3px;
    margin-top: var(--spacing-space-1);
    border-radius: var(--radius-full);
    background: linear-gradient(90deg, var(--color-text-primary), transparent);
    content: "";
    transform-origin: left center;
}

.sectionBody {
    margin: 0;
    font-size: var(--type-size-body-main);
    font-weight: 400;
}

.showcaseRow {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-space-16);
    padding: var(--spacing-space-16);
    background-color: var(--color-main-background);
}

.skills {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: var(--spacing-space-4);
}

.skillGroup {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.groupHeader {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-2);
}

.groupTitle {
    margin: 0;
    font-size: var(--type-size-body-main);
    font-weight: 400;
}

.chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-space-1);
}

.groupIcon,
.chipMaskIcon {
    display: inline-block;
    background-color: var(--color-text-primary);
    transition: background-color 300ms ease;
}

.groupIcon,
.chipIcon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}

.chip {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    padding: var(--spacing-space-1);
    cursor: default;
    transition: border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
}

.chip:hover,
.chip:focus-visible {
    border-color: var(--color-text-primary);
    box-shadow: 0 3px 8px rgb(0 0 0 / 10%);
    transform: translateY(-2px);
}

.chip:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

/* Skill name slides out of the chip on hover/focus. */
.chipLabel {
    max-width: 0;
    overflow: hidden;
    font-size: var(--type-size-caption);
    font-weight: 400;
    white-space: nowrap;
    opacity: 0;
    transition: max-width 260ms ease, opacity 200ms ease, margin-left 260ms ease;
}

.chip:hover .chipLabel,
.chip:focus-visible .chipLabel {
    max-width: 140px;
    margin-left: var(--spacing-space-1);
    opacity: 1;
}

.design {
    display: flex;
    flex-direction: column;
    width: min(544px, 100%);
    gap: var(--spacing-space-2);
}

.designCards {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--spacing-space-2);
}

.designCard {
    width: 128px;
    height: 140px;
    border-radius: var(--radius-xl);
    object-fit: cover;
    box-shadow: 0 2px 6px rgb(0 0 0 / 8%);
    transition: transform 250ms ease, box-shadow 250ms ease;
    user-select: none;
    -webkit-user-drag: none;
}

.designCard:hover {
    transform: translateY(-6px) rotate(-1.5deg) scale(1.04);
    box-shadow: 0 12px 24px rgb(0 0 0 / 16%);
}

.designCard:nth-child(even):hover {
    transform: translateY(-6px) rotate(1.5deg) scale(1.04);
}

/* Scroll-reveal: hidden state only exists when motion is allowed, so content
   is always visible for reduced-motion users and non-observing browsers. */
@media (prefers-reduced-motion: no-preference) {
    .reveal {
        opacity: 0;
        transform: translateY(18px);
        transition:
            opacity 600ms ease var(--reveal-delay, 0s),
            transform 600ms ease var(--reveal-delay, 0s);
    }

    .reveal.revealed {
        opacity: 1;
        transform: none;
    }

    .reveal .sectionTitle::after {
        transform: scaleX(0);
        transition: transform 700ms ease calc(var(--reveal-delay, 0s) + 250ms);
    }

    .reveal.revealed .sectionTitle::after {
        transform: scaleX(1);
    }
}

@media (max-width: 767px) {
    .banner {
        height: 127px;
    }

    .ghostSpotA {
        width: 62px;
    }

    .ghostSpotB {
        width: 46px;
    }

    .profile {
        align-items: flex-start;
        justify-content: center;
        flex-wrap: wrap;
        padding: var(--spacing-space-3) var(--spacing-space-8);
        text-align: center;
    }

    .identity {
        flex-direction: column;
        align-items: center;
        flex: initial;
        width: 100%;
    }

    .name {
        font-size: 26px;
    }

    .fact {
        font-size: 16px;
    }

    .livedFact {
        font-size: 14px;
    }

    .contacts {
        justify-content: center;
        width: 100%;
    }

    .storyRows {
        gap: var(--spacing-space-4);
        padding: var(--spacing-space-8);
    }

    .showcaseRow {
        flex-direction: column;
        gap: var(--spacing-space-4);
        padding: var(--spacing-space-8);
    }

    .design {
        width: 100%;
    }

    .designCards {
        justify-content: center;
    }

    .designCard {
        width: 74px;
        height: 81px;
    }
}
</style>
