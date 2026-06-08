<script setup lang="ts">
import { PrimaryButton } from "@/shared/ui";
import { onMounted, onUnmounted } from "vue";

const scrollLockClass = "home-scroll-locked";

const highlightCards = [
    {
        value: "4",
        unit: "YEARS",
        title: "EDUCATION",
        detail: "Information Technology",
    },
    {
        value: "6",
        unit: "MONTH",
        title: "INTERNSHIP",
        detail: "YIP IN TSOI",
    },
    {
        value: "2",
        unit: "YEARS",
        title: "FREELANCE",
        detail: "Client Projects",
    },
];

onMounted(() => {
    document.documentElement.classList.add(scrollLockClass);
    document.body.classList.add(scrollLockClass);
});

onUnmounted(() => {
    document.documentElement.classList.remove(scrollLockClass);
    document.body.classList.remove(scrollLockClass);
});
</script>

<template>
    <main :class="$style.home">
        <div :class="$style.rectangle_top" aria-hidden="true" />
        <div :class="$style.rectangle_bottom" aria-hidden="true" />
        <div :class="$style.heroLayout">
            <section :class="$style.heroCopy">
                <p class="type-handling-sb text-text-primary">HI GUYS, WELCOME TO MY PLATFORM</p>
                <h1 :class="$style.heroTitle" class="text-text-primary">
                    FULLSTACK<br />
                    DEVELOPER
                </h1>
            </section>
        </div>
        <div :class="$style.mobileProjectAction">
            <PrimaryButton to="/projects">
                View Projects
            </PrimaryButton>
        </div>
        <ul :class="$style.highlightCards">
            <li v-for="card in highlightCards" :key="card.title" :class="$style.highlightCard" class="rounded-xl">
                <div :class="$style.highlightValue">
                    <span :class="$style.highlightNumber" class="text-text-secondary">{{ card.value }}</span>
                    <span class="type-subtitle-sb text-main-primary">{{ card.unit }}</span>
                </div>
                <p class="type-caption-sb text-text-secondary">{{ card.title }}</p>
                <p class="type-overline-r text-text-secondary">{{ card.detail }}</p>
            </li>
        </ul>
        <img
            :class="$style.mascot"
            src="/images/users/fujipp/mascot-home-nobg.png"
            alt=""
            aria-hidden="true"
        />
    </main>
</template>

<style module>
:global(html.home-scroll-locked),
:global(body.home-scroll-locked) {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    margin: 0;
    overflow: hidden;
    overscroll-behavior: none;
}

.home {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
}

.rectangle_top,
.rectangle_bottom,
.highlightCards {
    --diagonal-angle: 8deg;
    --shape-height: 400px;
}

.rectangle_top,
.rectangle_bottom {
    --diagonal-rise: calc(100vw * tan(var(--diagonal-angle)));
    height: var(--shape-height);
}

.rectangle_top {
    position: absolute;
    top: 0;
    inset-inline: 0;
    overflow: hidden;
    flex-shrink: 0;
    pointer-events: none;
    background-color: var(--color-main-surface);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 calc(100% - var(--diagonal-rise)));
}

.rectangle_bottom {
    position: absolute;
    bottom: 0;
    inset-inline: 0;
    overflow: hidden;
    flex-shrink: 0;
    pointer-events: none;
    background-color: var(--color-main-surface);
    clip-path: polygon(0 100%, 0 0, 100% var(--diagonal-rise), 100% 100%);
}

.heroLayout {
    --hero-scale: 1;

    position: absolute;
    top: 44%;
    left: calc(var(--spacing-space-32) * var(--hero-scale));
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    transform: translateY(-50%) scale(var(--hero-scale));
    transform-origin: left center;
}

.heroCopy {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
}

.heroTitle {
    font-family: var(--font-sans);
    font-size: 6rem;
    font-weight: 800;
    line-height: 5rem;
    letter-spacing: 0;
}

.highlightCards {
    --card-scale: 1;
    --cards-left: calc(var(--spacing-space-32) * var(--card-scale));
    --card-step: calc((190px + var(--spacing-space-4)) * tan(var(--diagonal-angle)));

    position: absolute;
    top: calc(100% - var(--shape-height) + var(--cards-left) * tan(var(--diagonal-angle)) + var(--spacing-space-32) * var(--card-scale));
    left: var(--cards-left);
    z-index: 2;
    display: flex;
    gap: var(--spacing-space-4);
    margin: 0;
    padding: 0;
    list-style: none;
    transform: scale(var(--card-scale));
    transform-origin: left top;
}

.highlightCard:nth-child(2) {
    transform: translateY(var(--card-step));
}

.highlightCard:nth-child(3) {
    transform: translateY(calc(var(--card-step) * 2));
}

.highlightCard {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 190px;
    height: 128px;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    background: var(--gradient-card-highlight);
}

.highlightValue {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.highlightNumber {
    font-family: var(--font-sans);
    font-size: 3rem;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0;
}

.mascot {
    --mascot-top-padding: 6rem;

    width: auto;
    height: 100dvh;
    position: absolute;
    bottom: 0;
    padding-top: var(--mascot-top-padding);
    left: 75%;
    z-index: 1;
    max-width: 100%;
    object-fit: contain;
    object-position: center bottom;
    pointer-events: none;
    transform: translateX(-50%);
}

.mobileProjectAction {
    display: none;
}

@media (max-width: 767px) {
    .home {
        --mobile-fit: min(1, calc(100vw / 390px), calc(100dvh / 820px));
    }

    .rectangle_top,
    .rectangle_bottom,
    .highlightCards {
        --shape-height: calc(173px * var(--mobile-fit));
        --diagonal-angle: 8deg;
    }

    .rectangle_top,
    .rectangle_bottom {
        position: fixed;
        left: 0;
        right: 0;
        z-index: 1;
        width: auto;
    }

    .rectangle_top {
        top: 0;
    }

    .rectangle_bottom {
        right: -2px;
        bottom: -2px;
        height: calc(109px * var(--mobile-fit));
    }


    .heroLayout {
        --hero-scale: calc(clamp(0.34, calc(100vw / 1080px), 0.4) * var(--mobile-fit));

        top: calc(176px * var(--mobile-fit));
        left: calc(var(--spacing-space-5) * var(--mobile-fit));
        transform: scale(var(--hero-scale));
        transform-origin: left top;
    }

    .heroCopy > p {
        font-size: calc(0.875rem / var(--hero-scale));
    }

    .highlightCards {
        --card-scale: calc(0.9 * var(--mobile-fit));

        top: calc(272px * var(--mobile-fit));
        right: calc(var(--spacing-space-5) * var(--mobile-fit));
        left: auto;
        flex-direction: column;
        gap: 10px;
        transform: scale(var(--card-scale));
        transform-origin: right top;
    }

    .mobileProjectAction {
        display: flex;
        align-items: center;
        width: 160px;
        position: absolute;
        top: calc(292px * var(--mobile-fit));
        left: calc(var(--spacing-space-5) * var(--mobile-fit));
        z-index: 2;
        transform: scale(var(--mobile-fit));
        transform-origin: left top;
    }

    .highlightCard:nth-child(2),
    .highlightCard:nth-child(3) {
        transform: none;
    }

    .mascot {
        display: block;
        width: 100vw;
        height: auto;
        top: auto;
        bottom: 48px;
        left: 50%;
        z-index: 0;
        max-width: none;
        padding-top: 0;
        object-fit: contain;
        opacity: 1;
        filter: none;
        transform: translateX(-50%);
    }
}

@media (max-width: 380px) {
    .highlightCards {
        --card-scale: calc(0.82 * var(--mobile-fit));

        right: calc(var(--spacing-space-4) * var(--mobile-fit));
    }
}

/* Fit the desktop composition into a reduced viewport when browser zoom increases. */
@media (min-width: 1025px) and (max-width: 1440px) {
    .home {
        --desktop-fit: min(1, calc(100vw / 1440px), calc(100dvh / 900px));
    }

    .rectangle_top,
    .rectangle_bottom,
    .highlightCards {
        --shape-height: calc(400px * var(--desktop-fit));
    }

    .heroLayout {
        --hero-scale: var(--desktop-fit);

        left: calc(var(--spacing-space-32) * var(--desktop-fit));
    }

    .highlightCards {
        --card-scale: var(--desktop-fit);
        --cards-left: calc(var(--spacing-space-32) * var(--desktop-fit));

        top: calc(100% - var(--shape-height) + var(--cards-left) * tan(var(--diagonal-angle)) + var(--spacing-space-32) * var(--desktop-fit));
    }

    .mascot {
        padding-top: calc(6rem * var(--desktop-fit));
    }
}

@media (min-width: 768px) and (max-width: 1024px) {
    .home {
        --tablet-fit: min(1, calc(100dvh / 820px));
        --tablet-shape-fit: min(1, calc(100vw / 1440px), calc(100dvh / 900px));
    }

    .rectangle_top,
    .rectangle_bottom,
    .highlightCards {
        --shape-height: calc(400px * var(--tablet-shape-fit));
    }

    .heroLayout {
        --hero-scale: calc(0.72 * var(--tablet-fit));

        top: calc(28% * var(--tablet-fit));
        left: calc(var(--spacing-space-8) * var(--tablet-fit));
    }

    .highlightCards {
        --card-scale: calc(0.95 * var(--tablet-fit));

        top: 56%;
        right: calc(var(--spacing-space-4) * var(--tablet-fit));
        left: auto;
        flex-direction: column;
        gap: var(--spacing-space-4);
        transform: translateY(-50%) scale(var(--card-scale));
        transform-origin: right center;
    }

    .highlightCard:nth-child(2),
    .highlightCard:nth-child(3) {
        transform: none;
    }

    .mascot {
        height: calc(min(96dvh, 96vw) * var(--tablet-fit));
        left: 50%;
        padding-top: calc(var(--spacing-space-12) * var(--tablet-fit));
    }
}

/* Preserve the 1440x900 composition when a desktop display has a wider aspect ratio. */
@media (min-width: 1441px) {
    .home {
        --desktop-fit: min(calc(100vw / 1440px), calc(100dvh / 900px));
    }

    .rectangle_top,
    .rectangle_bottom,
    .highlightCards {
        --shape-height: calc(400px * var(--desktop-fit));
    }

    .rectangle_top,
    .rectangle_bottom {
        --diagonal-rise: calc(1440px * tan(var(--diagonal-angle)) * var(--desktop-fit));
    }

    .heroLayout {
        --hero-scale: var(--desktop-fit);
    }

    .highlightCards {
        --card-scale: var(--desktop-fit);
    }

    .mascot {
        --mascot-top-padding: calc(96px * var(--desktop-fit));
    }
}
</style>
