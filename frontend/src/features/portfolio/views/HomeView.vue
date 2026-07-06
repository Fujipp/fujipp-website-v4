<script setup lang="ts">
import { PrimaryButton } from "@/shared/ui/buttons";
</script>

<template>
    <main :class="$style.home">
        <section :class="$style.hero" aria-labelledby="home-hero-title">
            <img
                :class="$style.mascot"
                src="/images/users/fujipp/mascot-home-nobg.png"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
            <div :class="$style.heroContent">
                <p :class="$style.kicker">HI GUYS, WELCOME TO MY PLATFORM</p>
                <h1 id="home-hero-title" :class="$style.headline">
                    FUJIPP
                    <!-- FULLSTACK<br>DEVELOPER -->
                </h1>
                <PrimaryButton :class="$style.cta" width-mode="hug" to="/projects">
                    View Projects
                </PrimaryButton>
            </div>
        </section>
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
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    box-sizing: border-box;
    width: 100%;
    isolation: isolate;
}

.mascot {
    position: absolute;
    right: 0;
    bottom: 0;
    z-index: 1;
    width: auto;
    height: min(768px, 100%);
    object-fit: contain;
    object-position: right bottom;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
}

.heroContent {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    width: min(100%, 1052px);
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3) var(--spacing-space-6);
    text-align: left;
}

.kicker {
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--type-size-button);
    font-weight: 700;
}

.headline {
    margin: 0;
    font-family: var(--font-sans);
    /* font-size: 96px; */
    font-size: 136px;
    line-height: 80px;
    font-weight: 800;
}

.cta {
    margin-top: var(--spacing-space-3);
}

@media (max-width: 767px) {
    .hero {
        justify-content: flex-start;
    }

    .heroContent {
        position: relative;
        z-index: 2;
        padding: var(--spacing-space-1) var(--spacing-space-2);
    }

    .headline {
        /* font-size: 56px; */
        font-size: 96px;
        line-height: 46px;
    }

    .mascot {
        z-index: 0;
        right: 0;
        bottom: 0;
        width: min(100%, 420px);
        height: auto;
        max-height: none;
        object-fit: contain;
    }
}
</style>
