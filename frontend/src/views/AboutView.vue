<script setup lang="ts">
import { AppFooter, HeaderSection, LanguageButton, SkillCard } from "@/components";
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
import { onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const heroSection = ref<HTMLElement | null>(null);
const heroMusic = ref<HTMLAudioElement | null>(null);

const hiddenScrollbarClass = "about-scrollbar-hidden";
const heroMusicVolume = 0.35;
const musicFadeDuration = 4000;

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
        { threshold: 0 },
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
    <main :class="$style.about" class="pt-22">
        <div :class="$style.heroContainer">
            <section
                ref="heroSection"
                :class="$style.hero"
                class="bg-main-surface text-text-secondary"
                aria-label="About Anawat Grudtoop"
            >
                <audio
                    ref="heroMusic"
                    src="/music/Beauty And A Beat Justin Bieber Nicki Minaj.mp3"
                    preload="metadata"
                    loop
                />
                <div :class="$style.modelSpace">
                    <model-viewer
                        :class="$style.modelViewer"
                        src="/models/Models-Fujipp/Fujipp-Dancing.glb"
                        alt="Animated 3D model of Fujipp"
                        autoplay
                        camera-controls
                        interaction-prompt="none"
                    />
                </div>
                <div :class="$style.heroContent" class="bg-main-surface">
                    <header :class="$style.heroHeader">
                        <h1 class="type-subtitle-sb">Anawat Grudtoop</h1>
                        <LanguageButton />
                    </header>
                    <hr :class="$style.divider" class="border-main-divider">
                    <p
                        v-for="paragraph in heroParagraphs"
                        :key="paragraph"
                        class="type-body-main-r"
                    >
                        {{ t(paragraph) }}
                    </p>
                </div>
            </section>
            <section :class="$style.skillsSection" aria-label="Skills">
                <HeaderSection title="SKILLS" />
                <div :class="$style.skillGrid">
                    <SkillCard
                        v-for="skills in skillGroups"
                        :key="skills[0]?.label"
                        :items="skills"
                    />
                </div>
            </section>
            <section >
                <HeaderSection title="EDUCATION" />
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
    gap: var(--spacing-space-16);
}

.heroContainer {
    display: flex;
    flex-direction: column;
    padding-inline: var(--spacing-space-16);
    gap: var(--spacing-space-16);
}

.hero {
    box-sizing: border-box;
    width: min(100%, 1133px);
    margin: 0 auto;
    overflow: hidden;
    border-radius: 16px;
}

.modelSpace {
    height: 302px;
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
    border-radius: 0 0 16px 16px;
}

.heroHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    width: 100%;
    gap: 20px;
}

.heroHeader h1 {
    margin: 0;
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
    gap: var(--spacing-space-6);
}

.skillGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: 1fr;
    gap: var(--spacing-space-4);
}

@media (max-width: 767px) {
    .about {
        gap: var(--spacing-space-8);
    }

    .heroContainer {
        padding-inline: var(--spacing-space-4);
    }

    .modelSpace {
        height: 220px;
    }

    .skillGrid {
        grid-template-columns: 1fr;
        grid-auto-rows: auto;
        gap: var(--spacing-space-4);
    }
}

@media (min-width: 768px) and (max-width: 1023px) {
    .skillGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>
