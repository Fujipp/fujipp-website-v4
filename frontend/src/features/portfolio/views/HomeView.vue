<script setup lang="ts">
import { icons } from "@/config";
import { AppFooter } from "@/shared/layout";
import { PrimaryButton } from "@/shared/ui/buttons";
</script>

<template>
    <main :class="$style.home">
        <section :class="$style.hero" aria-labelledby="home-hero-title">
            <div :class="$style.leftside">
                <p :class="$style.kicker">Hello welcome to my platform</p>
                <h1 id="home-hero-title" :class="$style.headline">FUJIPP</h1>
            </div>
            <img
                :class="$style.heroImage"
                src="/images/users/fujipp/mascot-home-nobg.png"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
        </section>

        <section :class="$style.problemSolution" aria-labelledby="home-problem-title">
            <div :class="$style.cardBot">
                <img
                    :class="$style.cardBotArt"
                    src="/images/home/discord-card-art.png"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                >
            </div>
            <div :class="$style.problemCopy">
                <h2 id="home-problem-title" :class="$style.problemTitle">
                    Say Goodbye to Complicated Bot Setup.
                </h2>
                <p :class="$style.problemBody">
                    Building and hosting a Discord bot used to be a headache.
                    Not anymore. We make it effortless to set up, customize,
                    and run your dream bot without the technical hassle.
                </p>
            </div>
            <img
                :class="$style.ghostTop"
                src="/images/mascot/ghost-light.png"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
            <img
                :class="$style.ghostBottom"
                src="/images/mascot/ghost-dark.png"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
            <img
                :class="$style.ghostTopLeft"
                src="/images/mascot/ghost-dark.png"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
            <img
                :class="$style.ghostBottomLeft"
                src="/images/mascot/ghost-light.png"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
        </section>

        <section :class="$style.servicesFeatures" aria-labelledby="home-services-title">
            <div :class="$style.servicesInner">
                <h2 id="home-services-title" :class="$style.servicesTitle">
                    Premium Bot Features &amp; Reliable Hosting
                </h2>
                <div :class="$style.serviceItem">
                    <h3 :class="$style.serviceName">Custom Bot Features</h3>
                    <p :class="$style.serviceBody">
                        Upgrade your server with our pre-built or custom-made features.
                        Choose exactly what your community needs.
                    </p>
                </div>
                <div :class="$style.serviceItem">
                    <h3 :class="$style.serviceName">Flexible Runtime Plans</h3>
                    <p :class="$style.serviceBody">
                        Keep your bot online 24/7. We offer flexible runtime subscriptions
                        tailored to your needs available in 1, 2, or 3 month plans.
                    </p>
                </div>
            </div>
        </section>

        <section :class="$style.trustedBy" aria-labelledby="home-trusted-title">
            <div :class="$style.trustedInner">
                <h2 id="home-trusted-title" :class="$style.trustedTitle">
                    Trusted by Real Server Owners
                </h2>
                <p :class="$style.trustedBody">
                    Join our growing community! Currently powering custom bots and
                    delivering smooth experiences for 3 active Discord communities.
                </p>
                <div :class="$style.trustedLogos">
                    <img
                        :class="$style.trustedLogo"
                        src="/images/clients/kanom-topup.png"
                        alt="Kanom TopUp"
                        draggable="false"
                    >
                    <img
                        :class="$style.trustedLogo"
                        src="/images/clients/sunglasses-girl.png"
                        alt="Discord community"
                        draggable="false"
                    >
                    <img
                        :class="$style.trustedLogo"
                        src="/images/clients/ak-shop-booster.png"
                        alt="AK Shop Booster"
                        draggable="false"
                    >
                </div>
            </div>
        </section>

        <section :class="$style.aboutUs" aria-labelledby="home-about-title">
            <div :class="$style.aboutInner">
                <h2 id="home-about-title" :class="$style.aboutTitle">
                    The Developer Behind the Bots
                </h2>
                <p :class="$style.aboutBody">
                    More than just a bot shop, this platform is my personal web
                    application and portfolio. I built this space to showcase my
                    development skills while providing top-tier Discord bot services
                    for server creators. Let's build something awesome together!
                </p>
                <PrimaryButton
                    width-mode="hug"
                    to="/projects"
                    :trailing-icon="icons.directionRight"
                >
                    Views my all projects
                </PrimaryButton>
            </div>
        </section>

        <div :class="$style.footerSection">
            <AppFooter />
        </div>
    </main>
</template>

<style module>
.home {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-height: 100dvh;
    padding-top: 73px; /* fixed navbar height */
    color: var(--color-text-primary);
    overflow: hidden;
}

.hero {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    box-sizing: border-box;
    width: 100%;
    gap: var(--spacing-space-4);
    padding: 0 var(--spacing-space-4);
    font-family: var(--font-rammetto-one);
    text-align: left;
}

.leftside {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
}

.kicker {
    margin: 0;
    font-size: 32px;
    font-weight: 400;
}

.headline {
    align-self: stretch;
    margin: 0;
    font-size: 128px;
    font-weight: 400;
}

.heroImage {
    width: 480px;
    height: 632px;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
}

.problemSolution {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    height: 632px;
    gap: var(--spacing-space-16);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    isolation: isolate;
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: left;
}

.cardBot {
    position: relative;
    z-index: 0;
    flex-shrink: 0;
    width: 340px;
    height: 460px;
    border-radius: var(--radius-xl);
    overflow: hidden;
}

.cardBotArt {
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
}

.problemCopy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    z-index: 1;
    gap: var(--spacing-space-2);
}

.problemTitle {
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.problemBody {
    max-width: 628px;
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--type-size-body-main);
    font-weight: 400;
}

.ghostTop,
.ghostBottom,
.ghostTopLeft,
.ghostBottomLeft {
    position: absolute;
    z-index: 2;
    object-fit: contain;
    opacity: 0.5;
    transform: rotate(var(--ghost-tilt));
    animation: ghost-float 5s ease-in-out infinite;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
}

.ghostTop {
    --ghost-tilt: -46deg;
    top: 48px;
    right: 47px;
    width: 64px;
    height: 91px;
}

.ghostBottom {
    --ghost-tilt: 18deg;
    top: 417px;
    right: 40px;
    width: 84px;
    height: 119px;
    animation-duration: 6.5s;
    animation-delay: -2s;
}

.ghostTopLeft {
    --ghost-tilt: 24deg;
    top: 64px;
    left: 44px;
    width: 76px;
    height: 108px;
    animation-duration: 5.8s;
    animation-delay: -3.5s;
}

.ghostBottomLeft {
    --ghost-tilt: -14deg;
    top: 430px;
    left: 56px;
    width: 60px;
    height: 85px;
    animation-duration: 7s;
    animation-delay: -1s;
}

@keyframes ghost-float {
    0%,
    100% {
        transform: translateY(0) rotate(var(--ghost-tilt));
    }

    50% {
        transform: translateY(-14px) rotate(calc(var(--ghost-tilt) + 5deg));
    }
}

@media (prefers-reduced-motion: reduce) {
    .ghostTop,
    .ghostBottom,
    .ghostTopLeft,
    .ghostBottomLeft {
        animation: none;
    }
}

.servicesFeatures {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 632px;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    background-color: var(--color-main-background);
    text-align: left;
}

/* Match the Figma 1280 frame: 1280 - (2 x 128px padding) = 1024px content block. */
.servicesInner {
    display: flex;
    flex-direction: column;
    width: min(100%, 1024px);
    gap: var(--spacing-space-4);
}

.servicesTitle {
    align-self: stretch;
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.serviceItem {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    align-items: flex-start;
    gap: var(--spacing-space-2);
}

.serviceName {
    align-self: stretch;
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--type-size-body-main);
    font-weight: 600;
}

.serviceBody {
    align-self: stretch;
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--type-size-body-main);
    font-weight: 400;
}

.trustedBy {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 632px;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: center;
}

.trustedInner {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(100%, 1024px);
    gap: var(--spacing-space-4);
}

.trustedTitle {
    align-self: stretch;
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.trustedBody {
    align-self: stretch;
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--type-size-body-main);
    font-weight: 400;
}

.trustedLogos {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    gap: var(--spacing-space-4);
}

.trustedLogo {
    width: 128px;
    height: 128px;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
}

.aboutUs {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 632px;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    background-color: var(--color-main-background);
    text-align: left;
}

.aboutInner {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(100%, 1024px);
    gap: var(--spacing-space-4);
}

.aboutTitle {
    align-self: stretch;
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.aboutBody {
    align-self: stretch;
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--type-size-body-main);
    font-weight: 400;
}

.footerSection {
    width: 100%;
    background-color: var(--color-main-background);
}

@media (max-width: 767px) {
    .hero {
        padding: 0 var(--spacing-space-8);
        text-align: center;
    }

    .kicker {
        font-size: 16px;
    }

    .headline {
        font-size: 64px;
    }

    .heroImage {
        display: none;
    }

    .problemSolution {
        flex-direction: column;
        height: auto;
        gap: var(--spacing-space-8);
        padding: var(--spacing-space-8);
        text-align: center;
    }

    .cardBot {
        width: 216px;
        height: 292px;
    }

    .problemCopy {
        align-self: stretch;
    }

    .problemBody {
        max-width: none;
    }

    .ghostTop,
    .ghostBottom,
    .ghostTopLeft,
    .ghostBottomLeft {
        display: none;
    }

    .servicesFeatures {
        padding: var(--spacing-space-3) var(--spacing-space-8);
        text-align: center;
    }

    .servicesInner {
        width: 100%;
    }

    .trustedBy {
        padding: var(--spacing-space-3) var(--spacing-space-8);
    }

    .aboutUs {
        padding: var(--spacing-space-3) var(--spacing-space-8);
    }
}
</style>
