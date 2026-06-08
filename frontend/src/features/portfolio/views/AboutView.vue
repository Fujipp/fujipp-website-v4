<script setup lang="ts">
import { AppFooter } from "@/shared/layout";
import { HeaderSection, LanguageButton } from "@/shared/ui";
import { Gallery, SkillCard } from "@/features/portfolio/components";
import {
    backend,
    database,
    devops,
    frontend as frontendSkills,
    language,
    media_document,
    tools,
    ux_ui,
} from "@/config";
import { galleryImages } from "@/features/portfolio/config";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { SupportedLocale } from "@/i18n";

const { t } = useI18n();
const heroSection = ref<HTMLElement | null>(null);
const heroMusic = ref<HTMLAudioElement | null>(null);
const heroLocale = ref<SupportedLocale>("en");
const educationLocale = ref<SupportedLocale>("en");

const hiddenScrollbarClass = "about-scrollbar-hidden";
const heroMusicVolume = 0.35;
const musicFadeDuration = 1200;

let isHeroVisible = true;
let isMusicStarted = false;
let musicObserver: IntersectionObserver | undefined;
let volumeAnimationFrame: number | undefined;

const heroParagraphs = [
    "about.hero.paragraph_1",
    "about.hero.paragraph_2",
    "about.hero.paragraph_3",
    "about.hero.paragraph_4",
    "about.hero.paragraph_5",
];

const skillGroups = [
    language,
    frontendSkills,
    backend,
    database,
    devops,
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

function heroTranslation(key: string): string {
    return t(key, {}, { locale: heroLocale.value });
}

function educationTranslation(field: "institution" | "degree" | "field" | "years"): string {
    return t(`about.education.${selectedEducation.value.key}.${field}`, {}, { locale: educationLocale.value });
}

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
        // Browsers may require the first click or key press before audio starts.
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
                // The next user interaction can re-enable playback if needed.
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

onMounted(() => {
    document.documentElement.classList.add(hiddenScrollbarClass);
    document.body.classList.add(hiddenScrollbarClass);

    if (!heroSection.value || !heroMusic.value) {
        return;
    }

    heroMusic.value.volume = 0;
    musicObserver = new IntersectionObserver(
        ([entry]) => updateMusicForHeroVisibility(entry?.isIntersecting ?? false),
        { threshold: 0.5 },
    );
    musicObserver.observe(heroSection.value);
    addMusicUnlockListeners();
    void playHeroMusic();
});

onUnmounted(() => {
    document.documentElement.classList.remove(hiddenScrollbarClass);
    document.body.classList.remove(hiddenScrollbarClass);
    removeMusicUnlockListeners();
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
                class="bg-main-surface text-text-secondary"
                aria-label="About Anawat Grudtoop"
            >
                <audio
                    ref="heroMusic"
                    src="/music/beauty-and-a-beat-justin-bieber-nicki-minaj.mp3"
                    preload="metadata"
                    loop
                />
                <div :class="$style.modelSpace">
                    <model-viewer
                        :class="$style.modelViewer"
                        src="/models/fujipp/fujipp-dancing.glb"
                        alt="Animated 3D model of Fujipp"
                        autoplay
                        camera-controls
                        interaction-prompt="none"
                    />
                </div>
                <div :class="$style.heroContent" class="bg-main-surface">
                    <header :class="$style.heroHeader">
                        <h1 class="type-subtitle-sb">Anawat Grudtoop</h1>
                        <LanguageButton v-model="heroLocale" :class="$style.languageButton" />
                    </header>
                    <hr :class="$style.divider" class="border-main-divider">
                    <p
                        v-for="paragraph in heroParagraphs"
                        :key="paragraph"
                        class="type-body-main-r"
                    >
                        {{ heroTranslation(paragraph) }}
                    </p>
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
                <HeaderSection title="Gallery" />
                <Gallery :images="galleryImages" />
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
    max-width: var(--container-7xl);
    margin: 0 auto;
    padding: var(--spacing-space-5);
    gap: var(--spacing-space-5);
}

.hero {
    box-sizing: border-box;
    width: min(100%, 1133px);
    margin: 0 auto;
    overflow: hidden;
    border-radius: var(--radius-2xl);
}

.modelSpace {
    height: 296px;
}

.modelViewer {
    display: block;
    width: 100%;
    height: 100%;
}

.heroContent {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    padding: 16px;
    gap: 10px;
    border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
}

.heroHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    width: 100%;
    gap: 20px;
}

.heroHeader h1,
.heroHeader h3 {
    margin: 0;
}

.languageButton {
    border-radius: var(--radius-3xl);
}

.divider {
    box-sizing: border-box;
    width: 100%;
    height: 1px;
    margin: 0;
    border-width: 1px 0 0;
}

.heroContent p {
    width: 100%;
    margin: 0;
}

.skillsSection {
    display: flex;
    flex-direction: column;
    width: min(100%, 1133px);
    margin: 0 auto;
    gap: var(--spacing-space-5);
}

.skillGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 256px));
    grid-auto-rows: 1fr;
    justify-content: center;
    gap: 36px;
}

.educationSection {
    display: flex;
    flex-direction: column;
    width: min(100%, 1133.5px);
    margin: 0 auto;
    gap: var(--spacing-space-5);
}

.gallerySection {
    display: flex;
    flex-direction: column;
    width: min(100%, 1133.5px);
    margin: 0 auto;
    gap: var(--spacing-space-5);
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
    .heroContainer {
        padding: var(--spacing-space-5);
    }

    .skillGrid {
        grid-template-columns: 1fr;
        grid-auto-rows: auto;
        gap: var(--spacing-space-5);
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
    .skillGrid {
        grid-template-columns: repeat(2, minmax(0, 256px));
    }
}
</style>
