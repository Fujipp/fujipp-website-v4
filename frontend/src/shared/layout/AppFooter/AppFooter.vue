<script setup lang="ts">
import { icons } from "@/config";

const footerLinks = [
    { label: "TERMS", to: "/terms" },
    { label: "PRIVACY", to: "/privacy" },
    { label: "CHANGELOG", to: "/changelog" },
] as const;

const socialLinks = [
    { label: "Email Fujipp", href: "mailto:anawat.grudtoop@gmail.com", icon: icons.gmail, external: false },
    { label: "Join Fujipp on Discord", href: "https://discord.gg/fujipp", icon: icons.discord, external: true },
    { label: "View Fujipp on GitHub", href: "https://github.com/Fujipp", icon: icons.github, external: true },
] as const;
</script>

<template>
    <footer :class="$style.footer">
        <div :class="$style.divider" />

        <div :class="$style.companyInfo">
            <div :class="$style.companyTagline">
                <RouterLink to="/" :class="$style.logo" aria-label="Fujipp home">
                    <svg :class="$style.logoMark" viewBox="0 0 344 300" aria-hidden="true">
                        <path
                            :class="$style.logoPrimary"
                            d="M0 75.0001V300C49.8638 300 90.3073 259.617 90.3822 209.753L90.4156 187.5H231.875V112.5H90.5745V91.0001H231.875V87.2419C231.875 60.5309 242.561 34.93 261.552 16.1459L277.875 0.00012207H74.5033C33.3563 0.00012207 0 33.5788 0 75.0001Z"
                        />
                        <path
                            :class="$style.logoSecondary"
                            d="M343.75 225V3.05176e-05C293.768 3.05176e-05 253.25 40.5182 253.25 90.5V209H111.875V212.758C111.875 239.469 101.189 265.07 82.1982 283.854L65.875 300H269.247C310.394 300 343.75 266.421 343.75 225Z"
                        />
                    </svg>
                </RouterLink>
                <span :class="$style.tagline" class="type-button-r">
                    Building ideas, one commit at a time.
                </span>
            </div>

            <nav :class="$style.linksGroup" class="type-button-r" aria-label="Footer navigation">
                <RouterLink
                    v-for="link in footerLinks"
                    :key="link.to"
                    :to="link.to"
                    :class="$style.footerLink"
                >
                    {{ link.label }}
                </RouterLink>
            </nav>
        </div>

        <div :class="$style.bottomRow" class="type-button-r">
            <span :class="$style.footerText">© 2026 Fujipp</span>
            <div :class="$style.socialLinks">
                <a
                    v-for="social in socialLinks"
                    :key="social.href"
                    :href="social.href"
                    :class="$style.socialLink"
                    :aria-label="social.label"
                    :target="social.external ? '_blank' : undefined"
                    :rel="social.external ? 'noopener noreferrer' : undefined"
                >
                    <span
                        :class="$style.socialIcon"
                        :style="{ '--footer-icon': `url(${social.icon})` }"
                        aria-hidden="true"
                    />
                </a>
            </div>
        </div>
    </footer>
</template>

<style module>
.footer {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 12px 16px;
    gap: 8px;
    background: var(--color-footer-background);
    color: var(--color-footer-text);
    text-align: left;
}

.divider {
    align-self: stretch;
    height: 1px;
    background: var(--color-footer-divider);
}

.companyInfo {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    align-self: stretch;
    flex-wrap: wrap;
    gap: 20px;
}

.companyTagline {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
}

.logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-base);
    color: inherit;
}

.logoMark {
    width: 32px;
    height: 28px;
    overflow: visible;
}

.logoPrimary,
.logoSecondary {
    fill: var(--color-text-primary);
}

.tagline {
    display: inline-block;
    width: min(319px, 100%);
    font-weight: 300;
}

.linksGroup {
    display: flex;
    align-items: flex-start;
    box-sizing: border-box;
    min-height: 59px;
    padding: 8px;
    gap: 12px;
}

.footerText,
.footerLink {
    font-weight: 300;
}

.footerLink {
    border-radius: var(--radius-base);
    color: inherit;
    text-decoration: none;
    transition:
        color 160ms ease,
        font-weight 160ms ease;
}

.footerLink:hover,
.footerLink:focus-visible {
    color: var(--color-text-secondary);
    font-weight: 600;
}

.bottomRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    align-self: stretch;
    flex-wrap: wrap;
    box-sizing: border-box;
    padding: 8px;
    gap: 8px 20px;
}

.socialLinks {
    display: flex;
    align-items: center;
    gap: 8px;
}

.socialLink {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-base);
    color: inherit;
    transition:
        color 160ms ease,
        transform 160ms ease;
}

.socialLink:hover,
.socialLink:focus-visible {
    color: var(--color-text-secondary);
    transform: translateY(-2px);
}

.socialIcon {
    display: inline-block;
    width: 24px;
    height: 24px;
    background: currentColor;
    mask: var(--footer-icon) center / contain no-repeat;
    -webkit-mask: var(--footer-icon) center / contain no-repeat;
}

.logo:focus-visible,
.footerLink:focus-visible,
.socialLink:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}
</style>
