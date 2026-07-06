<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { AppFooter } from "@/shared/layout";
import { LanguageToggleButton, PrimaryButton } from "@/shared/ui/buttons";
import { backend, database, devops, frontend, getIconColorMode, icons, language } from "@/config";
import { saveLocale, type SupportedLocale } from "@/i18n";

const { t, locale } = useI18n();

const currentLocale = computed<SupportedLocale>(() => (locale.value === "th" ? "th" : "en"));

function setLocale(value: SupportedLocale): void {
    locale.value = value;
    saveLocale(value);
}

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
</script>

<template>
    <main :class="$style.aboutPage">
            <div :class="$style.container">
            <img
                :class="$style.banner"
                src="/images/banner/about-banner.jpg"
                alt=""
                aria-hidden="true"
                draggable="false"
            >

            <section :class="$style.profile" aria-label="Profile">
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
                        <p :class="$style.fact">
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
                    <LanguageToggleButton
                        :model-value="currentLocale"
                        @update:model-value="setLocale"
                    />
                </div>
            </section>

            <section :class="$style.about" aria-label="About">
                <p :class="$style.aboutText">{{ t("about.intro") }}</p>
            </section>

            <section :class="$style.education" aria-labelledby="about-educations-title">
                <h2 id="about-educations-title" :class="$style.sectionTitle">{{ t("about.sections.educations") }}</h2>
                <p :class="$style.educationItem">{{ t("about.education.university") }}</p>
            </section>

            <section :class="$style.skills" aria-labelledby="about-skills-title">
                <h2 id="about-skills-title" :class="$style.sectionTitle">{{ t("about.sections.skills") }}</h2>
                <div v-for="group in skillGroups" :key="group.key" :class="$style.skillGroup">
                    <h3 :class="$style.groupTitle">{{ t(`about.skillGroups.${group.key}`) }}</h3>
                    <div :class="$style.chips">
                        <span
                            v-if="group.items[0]?.icon"
                            :class="$style.groupIcon"
                            :style="{
                                mask: `url(${group.items[0].icon}) center / contain no-repeat`,
                                '-webkit-mask': `url(${group.items[0].icon}) center / contain no-repeat`,
                            }"
                            aria-hidden="true"
                        />
                        <span v-for="skill in group.items.slice(1)" :key="skill.label" :class="$style.chip">
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
                            {{ skill.label }}
                        </span>
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

.banner {
    width: 100%;
    height: 345px;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
}

.profile {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-space-5);
    padding: 12px 24px;
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
    user-select: none;
    -webkit-user-drag: none;
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
    font-weight: 300;
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

.about {
    padding: 12px 16px;
}

.aboutText {
    margin: 0;
    font-size: 20px;
    font-weight: 300;
    color: var(--color-text-secondary);
}

.education,
.skills {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
}

.sectionTitle {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
}

.educationItem {
    margin: 0;
    font-size: 20px;
    font-weight: 300;
    color: var(--color-text-secondary);
}

.skillGroup {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.groupTitle {
    margin: 0;
    font-size: 20px;
    font-weight: 300;
    color: var(--color-text-secondary);
}

.chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
}

.groupIcon,
.chipMaskIcon {
    display: inline-block;
    background-color: var(--color-text-primary);
    transition: background-color 300ms ease;
}

.chipIcon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
}

.groupIcon {
    display: inline-block;
    background-color: var(--color-text-primary);
}

.chip {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    gap: 4px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    padding: 4px;
    font-size: 16px;
    font-weight: 300;
}

@media (max-width: 767px) {
    .profile {
        flex-direction: column;
        padding: 12px 16px;
        gap: 8px;
    }

    .name {
        font-size: 26px;
    }

    .fact {
        font-size: 16px;
    }

    .aboutText {
        font-size: 16px;
    }

    .sectionTitle {
        font-size: 22px;
    }

    .educationItem {
        font-size: 16px;
    }

    .groupTitle {
        font-size: 16px;
    }

    .chip {
        font-size: 12px;
    }
}
</style>
