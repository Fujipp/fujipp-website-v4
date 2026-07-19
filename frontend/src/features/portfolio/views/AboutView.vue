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
const heroGridCanvas = ref<HTMLCanvasElement | null>(null);
let gridResizeObserver: ResizeObserver | undefined;
let gridThemeObserver: MutationObserver | undefined;
let gridAnimationFrame: number | undefined;
let gridPointer = { x: 0, y: 0 };
let gridPointerTarget = { x: 0, y: 0 };
let gridPointerActive = false;
let gridColumns = 0;
let gridRows = 0;

const GRID_SPACING = 32;
const DOT_RADIUS = 1;
const HOVER_RADIUS = 112;
const HOVER_SCALE = 32;
const MIN_GAP = 1;
const LERP_SPEED_UP = 0.12;
const LERP_SPEED_DOWN = 0.025;
const MOUSE_LERP = 0.35;
const SETTLE_EPS = 0.01;

type GridDrop = {
    homeX: number;
    homeY: number;
    scale: number;
    offsetX: number;
    offsetY: number;
};

let gridDrops: GridDrop[] = [];
let gridBounds = { width: 0, height: 0 };

function colorWithAlpha(color: string, alpha: number): string {
    const value = color.trim();
    if (!value.startsWith("#")) return value;
    const hex = value.slice(1);
    const normalized = hex.length === 3
        ? hex.split("").map((character) => `${character}${character}`).join("")
        : hex;
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgb(${red} ${green} ${blue} / ${alpha})`;
}

function syncHeroGrid(width: number, height: number): void {
    if (gridBounds.width === width && gridBounds.height === height && gridDrops.length > 0) return;

    gridDrops = [];
    gridBounds = { width, height };
    gridColumns = Math.ceil(width / GRID_SPACING) + 1;
    gridRows = Math.ceil(height / GRID_SPACING) + 1;

    for (let row = 0; row < gridRows; row += 1) {
        for (let column = 0; column < gridColumns; column += 1) {
            gridDrops.push({
                homeX: column * GRID_SPACING,
                homeY: row * GRID_SPACING,
                scale: 1,
                offsetX: 0,
                offsetY: 0,
            });
        }
    }
}

function drawHeroGrid(): boolean {
    const canvas = heroGridCanvas.value;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return false;

    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const expectedWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
    const expectedHeight = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
        canvas.width = expectedWidth;
        canvas.height = expectedHeight;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, bounds.width, bounds.height);
    syncHeroGrid(bounds.width, bounds.height);

    const tokens = getComputedStyle(document.documentElement);
    const primaryText = tokens.getPropertyValue("--palette-text-primary");
    const accent = tokens.getPropertyValue("--palette-main-brand-secondary");
    let dropsAreMoving = false;

    for (const drop of gridDrops) {
        const pointerDistance = Math.hypot(drop.homeX - gridPointer.x, drop.homeY - gridPointer.y);
        let targetScale = 1;
        if (gridPointerActive && pointerDistance < HOVER_RADIUS) {
            const proximity = 1 - (pointerDistance / HOVER_RADIUS);
            targetScale = 1 + ((HOVER_SCALE - 1) * proximity ** 3);
        }
        const scaleSpeed = targetScale > drop.scale ? LERP_SPEED_UP : LERP_SPEED_DOWN;
        drop.scale += (targetScale - drop.scale) * scaleSpeed;
        if (Math.abs(targetScale - drop.scale) > SETTLE_EPS) dropsAreMoving = true;
    }

    for (let index = 0; index < gridDrops.length; index += 1) {
        const drop = gridDrops[index];
        if (!drop) continue;
        let targetOffsetX = 0;
        let targetOffsetY = 0;
        const column = index % gridColumns;
        const row = Math.floor(index / gridColumns);
        const radius = DOT_RADIUS * drop.scale;

        for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
            for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
                if (rowOffset === 0 && columnOffset === 0) continue;
                const neighborRow = row + rowOffset;
                const neighborColumn = column + columnOffset;
                if (neighborRow < 0 || neighborRow >= gridRows
                    || neighborColumn < 0 || neighborColumn >= gridColumns) continue;
                const neighbor = gridDrops[neighborRow * gridColumns + neighborColumn];
                if (!neighbor) continue;
                const deltaX = drop.homeX - neighbor.homeX;
                const deltaY = drop.homeY - neighbor.homeY;
                const distance = Math.hypot(deltaX, deltaY);
                const minimumDistance = radius + (DOT_RADIUS * neighbor.scale) + MIN_GAP;
                if (distance >= minimumDistance || distance <= SETTLE_EPS) continue;
                const overlap = minimumDistance - distance;
                targetOffsetX += (deltaX / distance) * overlap * 0.5;
                targetOffsetY += (deltaY / distance) * overlap * 0.5;
            }
        }

        const offsetSpeed = targetOffsetX !== 0 || targetOffsetY !== 0 ? 0.15 : LERP_SPEED_DOWN;
        drop.offsetX += (targetOffsetX - drop.offsetX) * offsetSpeed;
        drop.offsetY += (targetOffsetY - drop.offsetY) * offsetSpeed;
        if (Math.abs(targetOffsetX - drop.offsetX) > SETTLE_EPS
            || Math.abs(targetOffsetY - drop.offsetY) > SETTLE_EPS) dropsAreMoving = true;

        context.beginPath();
        context.arc(
            drop.homeX + drop.offsetX,
            drop.homeY + drop.offsetY,
            radius,
            0,
            Math.PI * 2,
        );
        context.fillStyle = drop.scale > 1.01
            ? colorWithAlpha(accent, 0.92)
            : colorWithAlpha(primaryText, 0.14);
        context.fill();
    }

    return dropsAreMoving;
}

function animateHeroGrid(): void {
    gridPointer.x += (gridPointerTarget.x - gridPointer.x) * MOUSE_LERP;
    gridPointer.y += (gridPointerTarget.y - gridPointer.y) * MOUSE_LERP;
    const pointerIsMoving = Math.abs(gridPointerTarget.x - gridPointer.x) > 0.1
        || Math.abs(gridPointerTarget.y - gridPointer.y) > 0.1;
    const dropsAreMoving = drawHeroGrid();

    if (gridPointerActive || pointerIsMoving || dropsAreMoving) {
        gridAnimationFrame = window.requestAnimationFrame(animateHeroGrid);
    } else {
        drawHeroGrid();
        gridAnimationFrame = undefined;
    }
}

function requestHeroGridDraw(): void {
    if (gridAnimationFrame !== undefined) return;
    gridAnimationFrame = window.requestAnimationFrame(animateHeroGrid);
}

function handleHeroPointerMove(event: PointerEvent): void {
    if (event.pointerType === "touch") return;

    const hero = event.currentTarget as HTMLElement;
    const rect = hero.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    gridPointerTarget = {
        x: localX,
        y: localY,
    };
    gridPointerActive = true;
    requestHeroGridDraw();
}

function handleHeroPointerLeave(): void {
    gridPointerActive = false;
    requestHeroGridDraw();
}

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
    gridResizeObserver?.disconnect();
    gridThemeObserver?.disconnect();
    if (gridAnimationFrame !== undefined) window.cancelAnimationFrame(gridAnimationFrame);
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

    if (heroGridCanvas.value) {
        gridPointer = {
            x: heroGridCanvas.value.clientWidth / 2,
            y: heroGridCanvas.value.clientHeight / 2,
        };
        gridPointerTarget = { ...gridPointer };
        gridResizeObserver = new ResizeObserver(() => drawHeroGrid());
        gridResizeObserver.observe(heroGridCanvas.value);
        gridThemeObserver = new MutationObserver(() => drawHeroGrid());
        gridThemeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });
        drawHeroGrid();
    }
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

const workSteps = ["understand", "design", "build", "verify", "improve"] as const;

</script>

<template>
    <main :class="$style.aboutPage">
        <div :class="$style.container">
            <section
                v-reveal
                :class="$style.aboutHero"
                aria-labelledby="about-profile-name"
                @pointermove="handleHeroPointerMove"
                @pointerleave="handleHeroPointerLeave"
            >
                <canvas ref="heroGridCanvas" :class="$style.heroGridCanvas" aria-hidden="true" />
                <div
                    :class="$style.portraitStage"
                    :aria-label="t('about.profile.name')"
                    role="img"
                    tabindex="0"
                >
                    <span :class="$style.portraitOrbit" aria-hidden="true" />
                    <div :class="$style.portraitFrame">
                        <img
                            :class="$style.heroPortrait"
                            src="/images/users/fujipp/profile-fujipp.png"
                            alt=""
                            draggable="false"
                        >
                        <span :class="$style.portraitName" aria-hidden="true">
                            {{ t("about.profile.nick").replace(/[()]/g, "") }}
                        </span>
                    </div>
                </div>

                <div :class="$style.heroCopy">
                    <p :class="$style.heroEyebrow">{{ t("about.sections.about") }}</p>

                    <div :class="$style.identityText">
                        <h1 id="about-profile-name" :class="$style.name">
                            <span :class="$style.nameMain">{{ t("about.profile.name") }}</span>
                        </h1>
                        <div :class="$style.profileMeta">
                            <p :class="$style.fact">{{ t("about.profile.location") }}</p>
                            <p :class="[$style.fact, $style.livedFact]">
                                {{ t("about.profile.lived") }}:
                                {{ livedClock.years }} {{ t("about.profile.years") }}
                                {{ livedClock.days }} {{ t("about.profile.days") }}
                                {{ livedClock.time }}<span :class="$style.livedMs">.{{ livedClock.ms }}</span>
                            </p>
                        </div>
                    </div>

                    <p :class="$style.heroBody">{{ t("about.intro") }}</p>

                    <section :class="$style.educationSummary" aria-labelledby="about-educations-title">
                        <h2 id="about-educations-title" :class="$style.educationTitle">
                            {{ t("about.sections.educations") }}
                        </h2>
                        <p :class="$style.educationBody">{{ t("about.education.university") }}</p>
                    </section>

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
                </div>
            </section>

            <section v-reveal :class="$style.skillsSection" aria-labelledby="about-skills-title">
                <div :class="$style.skillsInner">
                    <header :class="$style.skillsHeading">
                        <p :class="$style.skillsEyebrow">Capabilities</p>
                        <h2 id="about-skills-title" :class="$style.skillsTitle">{{ t("about.sections.skills") }}</h2>
                    </header>

                    <div :class="$style.skillsGrid">
                        <article
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
                            <ul :class="$style.skillList">
                                <li
                                    v-for="skill in group.items.slice(1)"
                                    :key="skill.label"
                                    :class="$style.skillItem"
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
                                    <span :class="$style.skillLabel">{{ skill.label }}</span>
                                </li>
                            </ul>
                        </article>
                    </div>
                </div>
            </section>

            <section v-reveal :class="$style.experienceSection" aria-labelledby="about-experience-title">
                <div :class="$style.experienceInner">
                    <header :class="$style.experienceHeading">
                        <p :class="$style.experienceEyebrow">{{ t("about.experience.eyebrow") }}</p>
                        <h2 id="about-experience-title" :class="$style.experienceTitle">
                            {{ t("about.sections.experience") }}
                        </h2>
                    </header>

                    <article :class="$style.experienceCard">
                        <header :class="$style.experienceCardHeader">
                            <div>
                                <h3 :class="$style.experienceRole">{{ t("about.experience.role") }}</h3>
                                <p :class="$style.experienceCompany">{{ t("about.experience.company") }}</p>
                            </div>
                            <span :class="$style.experiencePeriod">{{ t("about.experience.period") }}</span>
                        </header>

                        <div :class="$style.experienceGrid">
                            <div :class="$style.experienceItem">
                                <h4>{{ t("about.experience.workflowTitle") }}</h4>
                                <p>{{ t("about.experience.workflowBody") }}</p>
                            </div>
                            <div :class="$style.experienceItem">
                                <h4>{{ t("about.experience.documentsTitle") }}</h4>
                                <p>{{ t("about.experience.documentsBody") }}</p>
                            </div>
                            <div :class="$style.experienceItem">
                                <h4>{{ t("about.experience.stackTitle") }}</h4>
                                <p>{{ t("about.experience.stackBody") }}</p>
                            </div>
                            <div :class="$style.experienceItem">
                                <h4>{{ t("about.experience.outcomeTitle") }}</h4>
                                <p>{{ t("about.experience.outcomeBody") }}</p>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section v-reveal :class="$style.workSection" aria-labelledby="about-work-title">
                <div :class="$style.workInner">
                    <header :class="$style.workHeading">
                        <p :class="$style.workEyebrow">{{ t("about.howIWork.eyebrow") }}</p>
                        <h2 id="about-work-title" :class="$style.workTitle">
                            {{ t("about.sections.howIWork") }}
                        </h2>
                    </header>

                    <ol :class="$style.workTimeline">
                        <li
                            v-for="(step, index) in workSteps"
                            :key="step"
                            :class="$style.workStep"
                        >
                            <span :class="$style.workNumber">{{ String(index + 1).padStart(2, "0") }}</span>
                            <div :class="$style.workCopy">
                                <h3>{{ t(`about.howIWork.${step}Title`) }}</h3>
                                <p>{{ t(`about.howIWork.${step}Body`) }}</p>
                            </div>
                        </li>
                    </ol>
                </div>
            </section>

            <section v-reveal :class="$style.contactSection" aria-labelledby="about-contact-title">
                <div :class="$style.contactInner">
                    <div :class="$style.contactCopy">
                        <p :class="$style.contactEyebrow">{{ t("about.contact.eyebrow") }}</p>
                        <h2 id="about-contact-title" :class="$style.contactTitle">
                            {{ t("about.contact.title") }}
                        </h2>
                        <p :class="$style.contactBody">{{ t("about.contact.body") }}</p>
                        <p :class="$style.availability">
                            <span :class="$style.availabilityDot" aria-hidden="true" />
                            {{ t("about.contact.availability") }}
                        </p>
                    </div>

                    <div :class="$style.contactActions">
                        <a
                            :class="[$style.contactButton, $style.contactButtonPrimary]"
                            href="mailto:anawat.grudtoop@gmail.com"
                        >
                            <span
                                :class="$style.contactButtonIcon"
                                :style="{ '--contact-icon': `url(${icons.gmail})` }"
                                aria-hidden="true"
                            />
                            {{ t("about.contact.email") }}
                        </a>
                        <RouterLink
                            :class="[$style.contactButton, $style.contactButtonSecondary]"
                            to="/projects"
                        >
                            {{ t("about.contact.projects") }}
                            <span
                                :class="$style.contactButtonIcon"
                                :style="{ '--contact-icon': `url(${icons.directionRight})` }"
                                aria-hidden="true"
                            />
                        </RouterLink>
                    </div>
                </div>
            </section>
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

.aboutHero {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    box-sizing: border-box;
    width: 100vw;
    margin-left: calc(50% - 50vw);
    min-height: calc(100dvh - 73px);
    padding: var(--spacing-space-16);
    background-color: var(--color-main-background);
    overflow: hidden;
}

.heroGridCanvas {
    position: absolute;
    z-index: 0;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.portraitStage {
    position: absolute;
    top: 50%;
    left: -24rem;
    z-index: 1;
    width: 48rem;
    aspect-ratio: 1;
    transform: translateY(-50%);
    transition: left 680ms cubic-bezier(0.16, 1.34, 0.3, 1);
}

@media (min-width: 1101px) and (hover: hover) and (pointer: fine) {
    .portraitStage:hover {
        left: var(--spacing-space-4);
    }

    .portraitStage:hover + .heroCopy {
        transform: translateX(clamp(5rem, 10vw, 12rem)) scale(0.84);
    }

    .portraitStage:hover .portraitName {
        opacity: 1;
        transform: translate(-50%, 0);
    }
}

.portraitStage:focus-visible {
    left: var(--spacing-space-4);
    outline: 2px solid var(--color-main-brand-secondary);
    outline-offset: 4px;
}

.portraitStage:focus-visible + .heroCopy {
    transform: translateX(clamp(5rem, 10vw, 12rem)) scale(0.84);
}

.portraitStage:focus-visible .portraitName {
    opacity: 1;
    transform: translate(-50%, 0);
}

.portraitOrbit {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-full);
    background: conic-gradient(
        from 0deg,
        var(--color-main-brand-primary) 0 50%,
        var(--color-main-brand-secondary) 50% 100%
    );
    animation: portrait-orbit-spin 28s linear infinite;
}

.portraitFrame {
    position: absolute;
    inset: 18%;
    box-sizing: border-box;
    border-radius: var(--radius-full);
    background: var(--color-main-background);
    box-shadow: 0 0 0 8px var(--color-main-background);
    overflow: hidden;
}

.portraitFrame::after {
    position: absolute;
    inset: 0;
    border: 2px solid color-mix(in srgb, var(--color-button-primary) 56%, transparent);
    border-radius: inherit;
    content: "";
    pointer-events: none;
}

@keyframes portrait-orbit-spin {
    to {
        transform: rotate(1turn);
    }
}

.heroPortrait {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
}

.portraitName {
    position: absolute;
    z-index: 2;
    bottom: 8%;
    left: 50%;
    color: var(--color-button-primary);
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    font-weight: 600;
    line-height: 1;
    text-shadow:
        0 2px 3px rgb(0 0 0 / 78%),
        0 5px 14px rgb(0 0 0 / 62%),
        0 10px 28px rgb(0 0 0 / 38%);
    opacity: 0;
    transform: translate(-50%, 12px);
    transition: opacity 260ms ease 180ms, transform 360ms cubic-bezier(0.16, 1, 0.3, 1) 180ms;
    pointer-events: none;
}

.heroCopy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: min(100%, 560px);
    margin-right: max(var(--spacing-space-16), calc((100vw - 1280px) / 2 + var(--spacing-space-16)));
    gap: var(--spacing-space-4);
    transform-origin: right center;
    transition: transform 680ms cubic-bezier(0.16, 1.34, 0.3, 1);
}

.heroEyebrow {
    margin: 0;
    color: var(--color-main-brand-secondary);
    font-size: var(--type-size-overline);
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.heroBody {
    max-width: 56ch;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-main);
    font-weight: 400;
    line-height: 1.6;
}

.identityText {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    gap: var(--spacing-space-3);
}

.name {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    margin: 0;
    gap: 0.22em;
    font-size: clamp(2.25rem, 4vw, 3.5rem);
    line-height: 1.05;
    letter-spacing: -0.035em;
}

.nameMain {
    font-weight: 800;
}

.profileMeta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-space-2) var(--spacing-space-4);
}

.fact {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--type-size-caption);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
}

.livedMs {
    color: var(--color-text-secondary);
}

.contacts {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-space-2);
    padding-top: var(--spacing-space-2);
}

.educationSummary {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    border-left: 3px solid var(--color-main-brand-secondary);
    padding-left: var(--spacing-space-3);
    gap: var(--spacing-space-1);
}

.educationTitle {
    margin: 0;
    font-size: var(--type-size-caption);
    font-weight: 800;
    text-transform: uppercase;
}

.educationBody {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--type-size-caption);
    font-weight: 400;
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

.skillsSection {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    box-sizing: border-box;
    padding: var(--spacing-space-24) var(--spacing-space-16);
    background: var(--color-main-surface);
    color: var(--color-button-primary);
}

.skillsInner {
    display: flex;
    flex-direction: column;
    width: min(100%, 1152px);
    margin: 0 auto;
    gap: var(--spacing-space-8);
}

.skillsHeading {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.skillsEyebrow {
    margin: 0;
    color: var(--color-main-brand-secondary);
    font-size: var(--type-size-overline);
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.skillsTitle {
    margin: 0;
    font-size: clamp(2.75rem, 6vw, 5rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
}

.skillsGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.skillGroup {
    display: flex;
    flex-direction: column;
    min-width: 0;
    box-sizing: border-box;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    padding: var(--spacing-space-4);
    gap: var(--spacing-space-4);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    transition: border-color 220ms ease, transform 220ms ease;
}

.skillGroup:hover {
    transform: translateY(-4px);
}

.skillGroup:last-child:nth-child(odd) {
    grid-column: 1 / -1;
}

.groupHeader {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-2);
}

.groupTitle {
    margin: 0;
    font-size: var(--type-size-body-main);
    font-weight: 800;
}

.skillList {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    margin: 0;
    padding: 0;
    gap: var(--spacing-space-2);
    list-style: none;
}

.groupIcon,
.chipMaskIcon {
    display: inline-block;
    background-color: currentColor;
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

.skillItem {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    min-height: 38px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-full);
    padding: var(--spacing-space-1) var(--spacing-space-3);
    gap: var(--spacing-space-2);
    background: color-mix(in srgb, var(--color-text-primary) 8%, var(--color-main-background));
    color: var(--color-text-primary);
}

.skillLabel {
    font-size: var(--type-size-caption);
    font-weight: 600;
    white-space: nowrap;
}

.experienceSection {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    box-sizing: border-box;
    padding: var(--spacing-space-24) var(--spacing-space-16);
    background: var(--color-main-background);
}

.experienceInner {
    display: flex;
    flex-direction: column;
    width: min(100%, 1152px);
    margin: 0 auto;
    gap: var(--spacing-space-8);
}

.experienceHeading {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.experienceEyebrow {
    margin: 0;
    color: var(--color-main-brand-secondary);
    font-size: var(--type-size-overline);
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.experienceTitle {
    margin: 0;
    font-size: clamp(2.75rem, 6vw, 5rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
}

.experienceCard {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    padding: var(--spacing-space-8);
    gap: var(--spacing-space-6);
    background: color-mix(in srgb, var(--color-main-brand-primary) 5%, var(--color-main-background));
}

.experienceCardHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-space-4);
}

.experienceRole {
    margin: 0;
    font-size: var(--type-size-h3-card-title);
    font-weight: 800;
}

.experienceCompany,
.experienceItem p {
    margin: 0;
    color: var(--color-text-secondary);
}

.experienceCompany {
    margin-top: var(--spacing-space-1);
    font-size: var(--type-size-caption);
    font-weight: 600;
}

.experiencePeriod {
    border-radius: var(--radius-full);
    padding: var(--spacing-space-1) var(--spacing-space-3);
    background: var(--color-main-brand-secondary);
    color: var(--color-main-brand-primary);
    font-size: var(--type-size-caption);
    font-weight: 800;
    white-space: nowrap;
}

.experienceGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-space-6) var(--spacing-space-8);
}

.experienceItem {
    border-top: 2px solid var(--color-main-divider);
    padding-top: var(--spacing-space-3);
}

.experienceItem h4 {
    margin: 0 0 var(--spacing-space-2);
    font-size: var(--type-size-body-small);
    font-weight: 800;
}

.experienceItem p {
    font-size: var(--type-size-caption);
    line-height: 1.55;
}

.workSection {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    box-sizing: border-box;
    padding: var(--spacing-space-24) var(--spacing-space-16);
    background: var(--color-main-background);
}

.workInner {
    display: flex;
    flex-direction: column;
    width: min(100%, 1152px);
    margin: 0 auto;
    gap: var(--spacing-space-12);
}

.workHeading {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.workEyebrow {
    margin: 0;
    color: var(--color-main-brand-secondary);
    font-size: var(--type-size-overline);
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.workTitle {
    margin: 0;
    font-size: clamp(2.75rem, 6vw, 5rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
}

.workTimeline {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    gap: var(--spacing-space-6);
    list-style: none;
}

.workStep {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    min-width: 0;
    min-height: 240px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    padding: var(--spacing-space-4);
    gap: var(--spacing-space-4);
    background: var(--color-main-background);
    transition:
        border-color 220ms ease,
        opacity 220ms ease,
        transform 220ms ease;
}

.workStep:not(:last-child)::after {
    position: absolute;
    top: 50%;
    right: calc(var(--spacing-space-6) * -1);
    z-index: 2;
    width: var(--spacing-space-6);
    color: var(--color-main-divider);
    content: "→";
    font-size: var(--type-size-body-main);
    font-weight: 800;
    line-height: 1;
    text-align: center;
    transform: translateY(-50%);
}

.workStep:hover {
    border-color: var(--color-main-brand-secondary);
    transform: translateY(-6px);
}

.workTimeline:has(.workStep:hover) .workStep:not(:hover) {
    opacity: 0.52;
}

.workNumber {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    background: var(--color-main-brand-secondary);
    color: var(--color-main-brand-primary);
    font-size: var(--type-size-support);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
}

.workCopy {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.workCopy h3,
.workCopy p {
    margin: 0;
}

.workCopy h3 {
    font-size: var(--type-size-body-small);
    font-weight: 800;
}

.workCopy p {
    color: var(--color-text-secondary);
    font-size: var(--type-size-caption);
    line-height: 1.55;
}

.contactSection {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    box-sizing: border-box;
    padding: var(--spacing-space-24) var(--spacing-space-16);
    background: var(--color-main-surface);
    color: var(--color-button-primary);
}

.contactInner {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: min(100%, 1152px);
    margin: 0 auto;
    gap: var(--spacing-space-16);
}

.contactCopy {
    display: flex;
    flex-direction: column;
    width: min(100%, 720px);
    gap: var(--spacing-space-4);
}

.contactEyebrow {
    margin: 0;
    color: var(--color-main-brand-secondary);
    font-size: var(--type-size-overline);
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.contactTitle {
    margin: 0;
    font-size: clamp(2.75rem, 6vw, 5rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
}

.contactBody {
    max-width: 64ch;
    margin: 0;
    color: color-mix(in srgb, var(--color-button-primary) 74%, transparent);
    font-size: var(--type-size-body-main);
    line-height: 1.6;
}

.availability {
    display: flex;
    align-items: center;
    margin: 0;
    gap: var(--spacing-space-2);
    color: color-mix(in srgb, var(--color-button-primary) 82%, transparent);
    font-size: var(--type-size-caption);
    font-weight: 600;
}

.availabilityDot {
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    background: var(--color-main-brand-secondary);
}

.contactActions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--spacing-space-3);
}

.contactButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: 48px;
    border: 1px solid transparent;
    border-radius: var(--radius-xl);
    padding: var(--spacing-space-2) var(--spacing-space-4);
    gap: var(--spacing-space-2);
    font-size: var(--type-size-button);
    font-weight: 800;
    text-decoration: none;
    transition:
        background-color 180ms ease,
        border-color 180ms ease,
        color 180ms ease,
        transform 180ms ease;
}

.contactButton:hover {
    transform: translateY(-2px);
}

.contactButton:focus-visible {
    outline: 2px solid var(--color-main-brand-secondary);
    outline-offset: 3px;
}

.contactButtonPrimary {
    background: var(--color-main-brand-secondary);
    color: var(--color-main-brand-primary);
}

.contactButtonPrimary:hover {
    background: color-mix(in srgb, var(--color-main-brand-secondary) 86%, var(--color-button-primary));
}

.contactButtonSecondary {
    border-color: color-mix(in srgb, var(--color-button-primary) 56%, transparent);
    background: transparent;
    color: var(--color-button-primary);
}

.contactButtonSecondary:hover {
    border-color: var(--color-button-primary);
    background: var(--color-button-primary);
    color: var(--color-main-surface);
}

.contactButtonIcon {
    display: inline-block;
    width: var(--spacing-icon-md);
    height: var(--spacing-icon-md);
    flex-shrink: 0;
    background: currentColor;
    mask: var(--contact-icon) center / contain no-repeat;
    -webkit-mask: var(--contact-icon) center / contain no-repeat;
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

@media (prefers-reduced-motion: reduce) {
    .portraitStage {
        transition: none;
    }

    .heroCopy {
        transition: none;
    }

    .portraitOrbit {
        animation: none;
    }

    .portraitName {
        transition: none;
    }

    .skillGroup {
        transition: none;
    }
}

@media (min-width: 768px) and (max-width: 1100px) {
    .aboutHero {
        padding: var(--spacing-space-8);
    }

    .portraitStage {
        left: -20rem;
        width: 40rem;
    }

    .portraitStage:focus-visible {
        left: -20rem;
    }

    .portraitStage:focus-visible + .heroCopy {
        transform: none;
    }

    .heroCopy {
        width: 54%;
        margin-right: 0;
        gap: var(--spacing-space-3);
    }

    .name {
        font-size: clamp(2rem, 5vw, 3rem);
    }

    .heroBody {
        font-size: var(--type-size-body-small);
        line-height: 1.5;
    }

    .skillsSection,
    .experienceSection,
    .workSection,
    .contactSection {
        padding: var(--spacing-space-20) var(--spacing-space-8);
    }

    .workTimeline {
        grid-template-columns: repeat(5, minmax(220px, 1fr));
        padding-bottom: var(--spacing-space-2);
        overflow-x: auto;
    }
}

@media (max-width: 767px) {
    .aboutPage {
        padding-top: 55px;
    }

    .aboutHero {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        min-height: calc(100svh - 55px);
        gap: var(--spacing-space-12);
        padding: var(--spacing-space-12) var(--spacing-space-8) var(--spacing-space-16);
        text-align: left;
        overflow: visible;
    }

    .portraitStage {
        position: relative;
        top: auto;
        left: auto;
        align-self: center;
        width: min(82vw, 20rem);
        transform: none;
    }

    .portraitStage:focus-visible {
        left: auto;
    }

    .portraitStage:focus-visible + .heroCopy {
        transform: none;
    }

    .portraitFrame {
        inset: 18%;
        box-shadow: 0 0 0 5px var(--color-main-background);
    }

    .heroCopy {
        align-items: flex-start;
        width: 100%;
        margin-top: 0;
        margin-right: 0;
    }

    .heroBody {
        font-size: var(--type-size-body-main);
        text-align: left;
    }

    .name {
        font-size: clamp(2rem, 10vw, 3rem);
        line-height: 1.08;
    }

    .profileMeta {
        align-items: flex-start;
        flex-direction: column;
        gap: var(--spacing-space-2);
    }

    .contacts {
        justify-content: flex-start;
        width: 100%;
    }

    .educationSummary {
        padding-left: var(--spacing-space-3);
    }

    .skillsSection,
    .experienceSection,
    .workSection,
    .contactSection {
        padding: var(--spacing-space-16) var(--spacing-space-8);
    }

    .skillsGrid {
        grid-template-columns: 1fr;
    }

    .skillGroup {
        grid-column: auto;
        padding: var(--spacing-space-3);
    }

    .experienceCard {
        padding: var(--spacing-space-4);
        gap: var(--spacing-space-4);
    }

    .experienceGrid {
        grid-template-columns: 1fr;
        gap: var(--spacing-space-4);
    }

    .workInner {
        gap: var(--spacing-space-8);
    }

    .workTimeline {
        grid-template-columns: 1fr;
        gap: var(--spacing-space-6);
    }

    .workStep {
        min-height: auto;
        gap: var(--spacing-space-4);
    }

    .workStep:not(:last-child)::after {
        top: auto;
        right: auto;
        bottom: calc(var(--spacing-space-6) * -1);
        left: 50%;
        height: var(--spacing-space-6);
        content: "↓";
        line-height: var(--spacing-space-6);
        transform: translateX(-50%);
    }

    .contactInner {
        align-items: flex-start;
        flex-direction: column;
        gap: var(--spacing-space-8);
    }

    .contactActions {
        align-items: stretch;
        flex-direction: column;
        width: 100%;
    }

    .contactButton {
        width: 100%;
    }
}
</style>
