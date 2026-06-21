<script setup lang="ts">
import { AppFooter } from "@/shared/layout";
import { HeaderSection, LanguageButton } from "@/shared/ui";
import { Gallery, SkillCard } from "@/features/portfolio/components";
import {
    backend,
    database,
    devops,
    externalService,
    frontend as frontendSkills,
    language,
    media_document,
    tools,
    ux_ui,
} from "@/config";
import { galleryImages } from "@/features/portfolio/config";
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { SupportedLocale } from "@/i18n";

interface ModelViewerAnimationElement extends HTMLElement {
    currentTime: number;
    pause: () => void;
    play: (options?: { repetitions: number; pingpong: boolean }) => void;
}

const { t } = useI18n();
const heroSection = ref<HTMLElement | null>(null);
const heroMusic = ref<HTMLAudioElement | null>(null);
const heroMascotModel = ref<ModelViewerAnimationElement | null>(null);
const heroMascotVisible = ref(false);
const heroLocale = ref<SupportedLocale>("en");
const educationLocale = ref<SupportedLocale>("en");

const hiddenScrollbarClass = "about-scrollbar-hidden";
const heroMusicVolume = 0.14;
const musicFadeDuration = 1200;
const birthTimestamp = new Date("2003-11-26T00:00:00+07:00").getTime();
const livedElapsedMs = ref(Math.max(Date.now() - birthTimestamp, 0));
const heroFactFields = ["birthday", "lived", "nickname", "height", "weight", "nationality"] as const;
const heroMascotAnimationLoops = false;
const heroMascotModelSrc = "/models/fujipp/fujipp-spiderman.glb";
const criticalAboutAssets = [
    { href: heroMascotModelSrc, as: "fetch", type: "model/gltf-binary", fetchPriority: "high" },
    { href: "/images/education/kmutt.jpeg", as: "image", type: "image/jpeg", fetchPriority: "high" },
    { href: galleryImages[0]?.src, as: "image", type: "image/jpeg", fetchPriority: "low" },
] as const;

let livedTimer: number | undefined;
let isHeroVisible = true;
let isMusicStarted = false;
let musicObserver: IntersectionObserver | undefined;
let volumeAnimationFrame: number | undefined;
let preloadLinks: HTMLLinkElement[] = [];

const skillGroups = [
    language,
    frontendSkills,
    backend,
    database,
    devops,
    externalService,
    tools,
    ux_ui,
    media_document,
];

const educationEntries = [
    {
        key: "university",
        label: "University",
        image: "/images/education/kmutt.jpeg",
    },
    {
        key: "seniorHigh",
        label: "Senior High",
        image: "/images/education/bpk.jpg",
    },
    {
        key: "foundation",
        label: "Foundation",
        image: "/images/education/kjr.jpg",
    },
] as const;

type EducationKey = (typeof educationEntries)[number]["key"];

const selectedEducationKey = ref<EducationKey>("university");
const selectedEducation = computed(() => (
    educationEntries.find((entry) => entry.key === selectedEducationKey.value) ?? educationEntries[0]
));

function educationTranslation(field: "institution" | "degree" | "field" | "years"): string {
    return t(`about.education.${selectedEducation.value.key}.${field}`, {}, { locale: educationLocale.value });
}

function playHeroMascotAnimation(): void {
    const model = heroMascotModel.value;

    if (!model) {
        return;
    }

    heroMascotVisible.value = false;
    model.currentTime = 0;
    model.play({
        repetitions: heroMascotAnimationLoops ? Infinity : 1,
        pingpong: false,
    });
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            heroMascotVisible.value = true;
        });
    });
}

function handleHeroMascotAnimationFinished(): void {
    if (heroMascotAnimationLoops) {
        return;
    }

    heroMascotModel.value?.pause();
}

const livedClock = computed(() => {
    const totalMilliseconds = Math.max(livedElapsedMs.value, 0);
    const totalHours = Math.floor(totalMilliseconds / 3_600_000);
    const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
    const seconds = Math.floor((totalMilliseconds % 60_000) / 1000);
    const centiseconds = Math.floor((totalMilliseconds % 1000) / 10);

    return `${totalHours.toLocaleString("en-US")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${centiseconds.toString().padStart(2, "0")}`;
});

function fadeMusicTo(targetVolume: number): void {
    const audio = heroMusic.value;

    if (!audio || !isMusicStarted) {
        return;
    }

    if (volumeAnimationFrame !== undefined) {
        cancelAnimationFrame(volumeAnimationFrame);
    }

    const initialVolume = audio.volume;
    const startTime = performance.now();

    function updateVolume(currentTime: number): void {
        if (!audio) {
            return;
        }

        const progress = Math.min((currentTime - startTime) / musicFadeDuration, 1);
        const easedProgress = 0.5 - (Math.cos(Math.PI * progress) / 2);
        audio.volume = initialVolume + ((targetVolume - initialVolume) * easedProgress);

        if (progress < 1) {
            volumeAnimationFrame = requestAnimationFrame(updateVolume);
            return;
        }

        volumeAnimationFrame = undefined;

        if (targetVolume === 0) {
            audio.pause();
        }
    }

    volumeAnimationFrame = requestAnimationFrame(updateVolume);
}

async function playHeroMusic(): Promise<void> {
    const audio = heroMusic.value;

    if (!audio) {
        return;
    }

    try {
        await audio.play();
        isMusicStarted = true;
        removeMusicUnlockListeners();
        fadeMusicTo(isHeroVisible ? heroMusicVolume : 0);
    } catch {
        addMusicUnlockListeners();
    }
}

function updateMusicForHeroVisibility(visible: boolean): void {
    isHeroVisible = visible;

    if (!isMusicStarted) {
        return;
    }

    const audio = heroMusic.value;

    if (visible && audio?.paused) {
        void audio.play()
            .then(() => fadeMusicTo(heroMusicVolume))
            .catch(() => {
                addMusicUnlockListeners();
            });
        return;
    }

    fadeMusicTo(visible ? heroMusicVolume : 0);
}

function unlockMusic(): void {
    void playHeroMusic();
}

function addMusicUnlockListeners(): void {
    document.addEventListener("pointerdown", unlockMusic, { passive: true });
    document.addEventListener("keydown", unlockMusic);
}

function removeMusicUnlockListeners(): void {
    document.removeEventListener("pointerdown", unlockMusic);
    document.removeEventListener("keydown", unlockMusic);
}

function preloadAboutAssets(): void {
    preloadLinks = criticalAboutAssets.flatMap((asset) => {
        if (!asset.href || document.head.querySelector(`link[rel="preload"][href="${asset.href}"]`)) {
            return [];
        }

        const link = document.createElement("link");
        link.rel = "preload";
        link.href = asset.href;
        link.as = asset.as;
        link.type = asset.type;
        link.setAttribute("fetchpriority", asset.fetchPriority);

        if (asset.as === "fetch") {
            link.crossOrigin = "anonymous";
        }

        document.head.append(link);
        return [link];
    });
}

function removeAboutPreloads(): void {
    for (const link of preloadLinks) {
        link.remove();
    }

    preloadLinks = [];
}

onBeforeMount(() => {
    preloadAboutAssets();
});

onMounted(() => {
    document.documentElement.classList.add(hiddenScrollbarClass);
    document.body.classList.add(hiddenScrollbarClass);
    livedTimer = window.setInterval(() => {
        livedElapsedMs.value = Math.max(Date.now() - birthTimestamp, 0);
    }, 43);

    if (!heroSection.value || !heroMusic.value) {
        return;
    }

    heroMusic.value.volume = 0;
    musicObserver = new IntersectionObserver(
        ([entry]) => updateMusicForHeroVisibility(entry?.isIntersecting ?? false),
        { threshold: 0.5 },
    );
    musicObserver.observe(heroSection.value);
    void playHeroMusic();
});

onUnmounted(() => {
    document.documentElement.classList.remove(hiddenScrollbarClass);
    document.body.classList.remove(hiddenScrollbarClass);

    if (livedTimer !== undefined) {
        window.clearInterval(livedTimer);
    }

    removeMusicUnlockListeners();
    removeAboutPreloads();
    musicObserver?.disconnect();

    if (volumeAnimationFrame !== undefined) {
        cancelAnimationFrame(volumeAnimationFrame);
    }

    heroMusic.value?.pause();
});
</script>

<template>
    <main :class="$style.about">
        <div :class="$style.heroContainer">
            <section
                ref="heroSection"
                :class="$style.hero"
                class="bg-main-section-background text-text-secondary"
                aria-label="About Anawat Grudtoop"
            >
                <audio
                    ref="heroMusic"
                    src="/music/shall-we-sped-up-instrumental.mp3"
                    preload="metadata"
                    loop
                />
                <div :class="$style.heroStage" :lang="heroLocale">
                    <div :class="$style.heroTopbar">
                        <p class="type-overline-sb text-text-muted">
                            ABOUT ME
                        </p>
                        <LanguageButton v-model="heroLocale" :class="$style.languageButton" />
                    </div>
                    <Transition
                        mode="out-in"
                        :enter-active-class="$style.heroLanguageEnterActive"
                        :leave-active-class="$style.heroLanguageLeaveActive"
                        :enter-from-class="$style.heroLanguageEnterFrom"
                        :leave-to-class="$style.heroLanguageLeaveTo"
                    >
                        <header :key="`hero-title-${heroLocale}`" :class="$style.heroTitle">
                            <h1 class="type-h1-page-title-sb text-text-primary-text">
                                {{ t("about.hero.name", {}, { locale: heroLocale }) }}
                            </h1>
                            <div :class="$style.heroRole" class="text-text-primary-text">
                                <span :class="$style.heroRoleBadge" class="type-caption-sb">
                                    {{ t("about.hero.role_title", {}, { locale: heroLocale }) }}
                                </span>
                                <span :class="$style.heroRoleInterest" class="type-caption-r">
                                    {{ t("about.hero.role_interest", {}, { locale: heroLocale }) }}
                                </span>
                            </div>
                        </header>
                    </Transition>
                    <div :class="$style.modelSpace">
                        <model-viewer
                            ref="heroMascotModel"
                            :class="[
                                $style.modelViewer,
                                { [$style.modelViewerReady]: heroMascotVisible },
                            ]"
                            :src="heroMascotModelSrc"
                            alt="Animated 3D model of Fujipp"
                            camera-controls
                            interaction-prompt="none"
                            loading="eager"
                            reveal="auto"
                            @load="playHeroMascotAnimation"
                            @finished="handleHeroMascotAnimationFinished"
                        />
                    </div>
                    <Transition
                        mode="out-in"
                        :enter-active-class="$style.heroLanguageEnterActive"
                        :leave-active-class="$style.heroLanguageLeaveActive"
                        :enter-from-class="$style.heroLanguageEnterFrom"
                        :leave-to-class="$style.heroLanguageLeaveTo"
                    >
                        <div :key="`hero-copy-${heroLocale}`" :class="$style.heroCopy">
                            <p :class="$style.heroIntro" class="type-body-small-r">
                                {{ t("about.hero.intro_1", {}, { locale: heroLocale }) }}
                            </p>
                            <dl :class="$style.heroFacts" class="type-body-small-r">
                                <div
                                    v-for="fact in heroFactFields"
                                    :key="fact"
                                    :class="$style.heroFact"
                                >
                                    <dt>{{ t(`about.hero.facts.${fact}.label`, {}, { locale: heroLocale }) }}</dt>
                                    <dd>
                                        <span
                                            v-if="fact === 'lived'"
                                            :class="$style.livedClock"
                                            :aria-label="t('about.hero.lived_format', {}, { locale: heroLocale })"
                                        >
                                            {{ livedClock }}
                                        </span>
                                        <span v-else>
                                            {{ t(`about.hero.facts.${fact}.value`, {}, { locale: heroLocale }) }}
                                        </span>
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </Transition>
                    <Transition
                        mode="out-in"
                        :enter-active-class="$style.heroLanguageEnterActive"
                        :leave-active-class="$style.heroLanguageLeaveActive"
                        :enter-from-class="$style.heroLanguageEnterFrom"
                        :leave-to-class="$style.heroLanguageLeaveTo"
                    >
                        <p
                            :key="`hero-status-${heroLocale}`"
                            :class="$style.heroStatus"
                            class="type-caption-sb text-text-primary-text"
                        >
                            {{ t("about.hero.status", {}, { locale: heroLocale }) }}
                        </p>
                    </Transition>
                </div>
            </section>
            <section :class="$style.skillsSection" aria-label="Skills">
                <HeaderSection title="Skills" />
                <div :class="$style.skillGrid">
                    <SkillCard
                        v-for="skills in skillGroups"
                        :key="skills[0]?.label"
                        :items="skills"
                    />
                </div>
            </section>
            <section :class="$style.educationSection" aria-label="Education">
                <HeaderSection title="Educations" />
                <article :class="$style.educationCard" class="bg-main-surface text-text-secondary">
                    <img
                        :class="$style.educationImage"
                        :src="selectedEducation.image"
                        :alt="educationTranslation('institution')"
                        loading="eager"
                        decoding="async"
                        fetchpriority="high"
                    >
                    <div :class="$style.educationContent" class="bg-main-surface">
                        <header :class="$style.heroHeader">
                            <h3 class="type-subtitle-sb">
                                {{ educationTranslation("institution") }}
                            </h3>
                            <div :class="$style.desktopEducationLanguage">
                                <LanguageButton v-model="educationLocale" :class="$style.languageButton" />
                            </div>
                        </header>
                        <hr :class="$style.divider" class="border-main-divider">
                        <p class="type-body-main-r">
                            {{ educationTranslation("degree") }}
                        </p>
                        <p class="type-body-main-r">
                            {{ educationTranslation("field") }}
                        </p>
                        <div :class="$style.educationFooter">
                            <p :class="$style.educationYears" class="type-body-main-r">
                                {{ educationTranslation("years") }}
                            </p>
                            <div :class="$style.mobileEducationLanguage">
                                <LanguageButton v-model="educationLocale" :class="$style.languageButton" />
                            </div>
                        </div>
                    </div>
                </article>
                <div
                    :class="$style.educationPicker"
                    class=" text-text-primary"
                    role="group"
                    aria-label="Select education level"
                >
                    <template v-for="(entry, index) in educationEntries" :key="entry.key">
                        <button
                            type="button"
                            :class="[
                                $style.educationPickerButton,
                                entry.key === selectedEducationKey ? 'type-button-sb' : 'type-button-r',
                            ]"
                            :aria-pressed="entry.key === selectedEducationKey"
                            @click="selectedEducationKey = entry.key"
                        >
                            {{ entry.label }}
                        </button>
                        <span v-if="index < educationEntries.length - 1" class="type-button-r" aria-hidden="true">
                            |
                        </span>
                    </template>
                </div>
            </section>
            <section :class="$style.gallerySection" aria-label="Gallery">
                <div :class="$style.galleryStage">
                    <HeaderSection :class="$style.galleryHeader" title="Gallery" />
                    <Gallery :images="galleryImages" />
                </div>
            </section>
        </div>
        <AppFooter />
    </main>
</template>

<style module>
:global(html.about-scrollbar-hidden),
:global(body.about-scrollbar-hidden) {
    scrollbar-width: none;
    -ms-overflow-style: none;
}

:global(html.about-scrollbar-hidden::-webkit-scrollbar),
:global(body.about-scrollbar-hidden::-webkit-scrollbar) {
    display: none;
}

.about {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    padding-top: var(--spacing-space-16);
}

.heroContainer {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: none;
    margin: 0 auto;
    padding: 0;
    gap: var(--spacing-space-5);
}

.hero {
    --about-hero-height: clamp(720px, calc(100svh - var(--spacing-space-16)), 860px);

    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: stretch;
    width: 100%;
    min-height: var(--about-hero-height);
    margin: 0 auto;
    overflow: hidden;
    border-radius: 0;
}

.heroStage {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 0.78fr) minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    min-height: var(--about-hero-height);
    margin: 0 auto;
    padding: var(--spacing-space-8) var(--spacing-space-5);
    gap: var(--spacing-space-6);
}

.heroStage::before,
.heroStage::after {
    position: absolute;
    left: var(--spacing-space-5);
    right: var(--spacing-space-5);
    height: 1px;
    background: var(--color-main-divider);
    content: "";
    opacity: 0.72;
}

.heroStage::before {
    top: var(--spacing-space-20);
}

.heroStage::after {
    bottom: var(--spacing-space-20);
}

.heroTopbar {
    position: relative;
    z-index: 3;
    display: flex;
    grid-column: 1 / -1;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.heroTopbar p {
    margin: 0;
}

.heroTitle {
    z-index: 2;
    display: flex;
    grid-column: 1 / -1;
    grid-row: 2;
    flex-direction: column;
    align-self: start;
    max-width: 560px;
    margin-top: var(--spacing-space-10);
    gap: var(--spacing-space-2);
}

.heroTitle h1 {
    margin: 0;
}

.heroRole {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    width: fit-content;
    gap: var(--spacing-space-1);
}

.heroRoleBadge {
    display: block;
    color: var(--color-main-primary);
}

.heroRoleInterest {
    display: block;
    color: var(--color-text-secondary);
    font-style: italic;
}

.modelSpace {
    z-index: 1;
    grid-column: 2;
    grid-row: 2;
    align-self: center;
    height: min(68svh, 640px);
    min-height: 420px;
    overflow: visible;
    animation: mascotFloat 5600ms ease-in-out infinite;
}

.modelViewer {
    display: block;
    width: 132%;
    height: 100%;
    margin-left: -16%;
    overflow: visible;
    opacity: 0;
    transition: opacity 180ms ease;
}

.modelViewerReady {
    opacity: 1;
}

.heroCopy {
    z-index: 2;
    display: grid;
    grid-column: 1 / -1;
    grid-row: 2;
    grid-template-columns: minmax(0, 340px) minmax(300px, 1fr) minmax(0, 340px);
    align-self: center;
    gap: var(--spacing-space-6);
    pointer-events: none;
}

.heroIntro,
.heroFacts {
    box-sizing: border-box;
    margin: 0;
    padding: var(--spacing-space-4) 0;
    border-top: 1px solid var(--color-main-divider);
    border-bottom: 1px solid var(--color-main-divider);
}

.heroIntro {
    grid-column: 1;
    align-self: start;
}

.heroFacts {
    grid-column: 3;
    align-self: end;
    display: grid;
    gap: var(--spacing-space-2);
}

.heroFact {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    align-items: baseline;
    gap: var(--spacing-space-2);
}

.heroFact dt {
    color: var(--color-text-secondary);
    font-weight: 600;
    white-space: nowrap;
}

.heroFact dt::after {
    content: ":";
}

.heroFact dd {
    min-width: 0;
    margin: 0;
    color: var(--color-text-secondary);
}

.livedClock {
    display: inline-block;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.heroStatus {
    z-index: 2;
    grid-column: 1 / -1;
    grid-row: 3;
    justify-self: center;
    max-width: 680px;
    margin: 0;
    padding-top: var(--spacing-space-5);
    text-align: center;
}

.heroLanguageEnterActive {
    transition:
        opacity 420ms ease,
        transform 420ms ease,
        filter 420ms ease;
    transition-delay: 90ms;
}

.heroLanguageLeaveActive {
    transition:
        opacity 180ms ease,
        transform 180ms ease,
        filter 180ms ease;
}

.heroLanguageEnterFrom {
    opacity: 0;
    filter: blur(6px);
    transform: translateY(var(--spacing-space-3));
}

.heroLanguageLeaveTo {
    opacity: 0;
    filter: blur(4px);
    transform: translateY(calc(var(--spacing-space-2) * -1));
}

.heroHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    width: 100%;
    gap: 20px;
}

.heroHeader h3 {
    margin: 0;
}

.languageButton {
    z-index: 3;
    border-radius: var(--radius-xl);
}

.divider {
    box-sizing: border-box;
    width: 100%;
    height: 1px;
    margin: 0;
    border-width: 1px 0 0;
}

.skillsSection {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
    padding: 0 var(--spacing-space-5);
    gap: var(--spacing-space-5);
}

.skillGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: 1fr;
    gap: var(--spacing-space-5);
}

.educationSection {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
    padding: 0 var(--spacing-space-5);
    gap: var(--spacing-space-5);
}

.gallerySection {
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    margin: 0 auto;
    padding: var(--spacing-space-8) 0;
    overflow: hidden;
    background: var(--color-main-section-background);
}

.galleryStage {
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
    padding: 0 var(--spacing-space-5);
    gap: var(--spacing-space-5);
}

/* .galleryStage::before,
.galleryStage::after {
    position: absolute;
    left: var(--spacing-space-5);
    right: var(--spacing-space-5);
    height: 1px;
    background: var(--color-main-divider);
    content: "";
    opacity: 0.72;
} */

/* .galleryStage::before {
    top: calc(var(--spacing-space-8) * -1);
}

.galleryStage::after {
    bottom: calc(var(--spacing-space-8) * -1);
} */

.galleryHeader h2 {
    color: var(--color-text-secondary);
}

.educationPicker {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: fit-content;
    margin: 0 auto;
    padding: 10px;
    gap: 10px;
    border-radius: var(--radius-lg);
}

.educationPickerButton {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
}

.educationPickerButton:focus-visible {
    border-radius: var(--radius-sm);
    outline: 2px solid var(--color-text-primary);
    outline-offset: 2px;
}

.educationCard {
    overflow: hidden;
    border-radius: var(--radius-2xl);
}

.educationImage {
    display: block;
    width: 100%;
    height: 507px;
    object-fit: cover;
}

.educationContent {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    padding: var(--spacing-space-4);
    gap: 10px;
    border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
}

.educationContent h3,
.educationContent p {
    width: 100%;
    margin: 0;
}

.educationFooter {
    width: 100%;
}

.desktopEducationLanguage {
    flex-shrink: 0;
}

.educationYears {
    text-align: center;
}

.mobileEducationLanguage {
    display: none;
}

@media (max-width: 767px) {
    .hero {
        --about-hero-height: calc(100svh - var(--spacing-space-16));
    }

    .heroContainer {
        padding: 0;
    }

    .heroStage {
        display: flex;
        flex-direction: column;
        min-height: var(--about-hero-height);
        padding: var(--spacing-space-5);
        gap: var(--spacing-space-5);
    }

    .heroStage::before {
        top: var(--spacing-space-16);
    }

    .heroStage::after {
        bottom: var(--spacing-space-16);
    }

    .heroTopbar {
        align-items: flex-start;
    }

    .heroTitle {
        align-items: center;
        max-width: none;
        margin-top: var(--spacing-space-2);
        text-align: center;
    }

    .heroRole {
        align-items: center;
    }

    .modelSpace {
        width: 100%;
        height: 36svh;
        min-height: 260px;
    }

    .modelViewer {
        width: 116%;
        margin-left: -8%;
    }

    .heroCopy {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-space-4);
    }

    .heroIntro,
    .heroFacts {
        align-self: stretch;
    }

    .heroFact {
        grid-template-columns: max-content minmax(0, 1fr);
    }

    .heroStatus {
        padding-top: 0;
    }

    .skillGrid {
        min-width: 0;
        grid-template-columns: 1fr;
        grid-auto-rows: auto;
        gap: var(--spacing-space-4);
    }

    .educationCard {
        overflow: hidden;
        border-radius: var(--radius-2xl);
    }

    .educationImage {
        height: 255px;
        border-radius: 0;
        object-fit: cover;
    }

    .educationContent {
        height: 205px;
        min-height: 205px;
        margin-top: -26px;
        border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
    }

    .educationContent h3 {
        font-size: 1rem;
    }

    .educationContent p {
        font-size: 1.125rem;
    }

    .desktopEducationLanguage {
        display: none;
    }

    .educationFooter {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--spacing-space-5);
    }

    .educationFooter .educationYears {
        width: auto;
    }

    .mobileEducationLanguage {
        display: block;
        flex-shrink: 0;
    }
}

@media (min-width: 768px) and (max-width: 1023px) {
    .heroStage {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: auto auto minmax(0, 1fr) auto auto;
    }

    .heroTitle {
        grid-column: 1 / -1;
        grid-row: 2;
        justify-self: center;
        margin-top: var(--spacing-space-4);
        text-align: center;
    }

    .modelSpace {
        grid-column: 1 / -1;
        grid-row: 3;
        height: 44svh;
        min-height: 340px;
    }

    .modelViewer {
        width: 116%;
        margin-left: -8%;
    }

    .heroCopy {
        grid-column: 1 / -1;
        grid-row: 4;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .heroIntro {
        grid-column: 1;
    }

    .heroFacts {
        grid-column: 2;
    }

    .heroStatus {
        grid-row: 5;
    }

    .skillGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (prefers-reduced-motion: reduce) {
    .heroLanguageEnterActive,
    .heroLanguageLeaveActive,
    .modelViewer,
    .modelSpace {
        transition: none;
        animation: none;
    }
}

@keyframes mascotFloat {
    0%,
    100% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(calc(var(--spacing-space-3) * -1));
    }
}

</style>
