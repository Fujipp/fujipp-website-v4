<script setup lang="ts">
import { AppFooter } from "@/shared/layout";

const sections = [
    { id: "acceptance", label: "Acceptance" },
    { id: "accounts", label: "Accounts" },
    { id: "purchases", label: "Wallet and purchases" },
    { id: "bots", label: "Bot services" },
    { id: "use", label: "Acceptable use" },
    { id: "availability", label: "Availability" },
    { id: "refunds", label: "Refunds" },
    { id: "ownership", label: "Ownership" },
    { id: "liability", label: "Responsibility" },
    { id: "termination", label: "Termination and contact" },
] as const;
</script>

<template>
    <main :class="$style.termsPage">
        <header :class="$style.hero">
            <div :class="$style.heroInner">
                <p :class="$style.eyebrow">Legal · Terms</p>
                <h1 :class="$style.title">Simple terms.<br>Clear expectations.</h1>
                <div :class="$style.heroMeta">
                    <p>
                        These terms describe the rules for using Fujipp Personal Platform,
                        its shop, wallet, and Discord bot services.
                    </p>
                    <span>Effective · 19 July 2026</span>
                </div>
            </div>
        </header>

        <div :class="$style.contentLayout">
            <aside :class="$style.tableOfContents" aria-label="Terms of service contents">
                <p :class="$style.contentsLabel">On this page</p>
                <nav>
                    <a
                        v-for="(section, index) in sections"
                        :key="section.id"
                        :href="`#${section.id}`"
                    >
                        <span>{{ String(index + 1).padStart(2, "0") }}</span>
                        {{ section.label }}
                    </a>
                </nav>
            </aside>

            <article :class="$style.terms">
                <section id="acceptance" :class="$style.termsSection">
                    <p :class="$style.sectionNumber">01</p>
                    <div :class="$style.sectionCopy">
                        <h2>Acceptance</h2>
                        <p>By creating an account, making a purchase, or using a service, you agree to these Terms and the Privacy Policy. If you do not agree, do not use the account or shop features.</p>
                        <p>You must be legally able to enter into this agreement. If you use the platform for an organization, you confirm that you have authority to act for it.</p>
                    </div>
                </section>

                <section id="accounts" :class="$style.termsSection">
                    <p :class="$style.sectionNumber">02</p>
                    <div :class="$style.sectionCopy">
                        <h2>Accounts</h2>
                        <ul>
                            <li>Provide accurate account and profile information.</li>
                            <li>Keep your sign-in method secure and do not share access with unauthorized people.</li>
                            <li>Notify Fujipp promptly if you believe your account has been compromised.</li>
                            <li>You are responsible for activity performed through your account unless caused by a platform security failure.</li>
                        </ul>
                    </div>
                </section>

                <section id="purchases" :class="$style.termsSection">
                    <p :class="$style.sectionNumber">03</p>
                    <div :class="$style.sectionCopy">
                        <h2>Wallet and purchases</h2>
                        <div :class="$style.detailGrid">
                            <div>
                                <h3>Wallet credit</h3>
                                <p>Wallet credit is used only for eligible products and services on this platform. It is not a bank account, does not earn interest, and cannot be transferred between users unless explicitly supported.</p>
                            </div>
                            <div>
                                <h3>Top-ups</h3>
                                <p>You must pay the exact displayed amount and submit a valid payment slip. Duplicate, altered, incorrect, or unverifiable slips may be rejected.</p>
                            </div>
                            <div>
                                <h3>Pricing</h3>
                                <p>Prices, durations, included features, and availability are shown before purchase. Confirm the order details before completing a transaction.</p>
                            </div>
                            <div>
                                <h3>Subscriptions</h3>
                                <p>Time-limited Runtime or Feature access expires at the displayed time unless renewed. Renewal may require sufficient wallet credit.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="bots" :class="$style.termsSection">
                    <p :class="$style.sectionNumber">04</p>
                    <div :class="$style.sectionCopy">
                        <h2>Discord bot services</h2>
                        <p>You are responsible for having permission to configure the Discord application, server, channels, and content connected to your bot.</p>
                        <p>Credentials must be valid and used only for the bot you are authorized to operate. Tokens and client secrets are treated as sensitive information and stored encrypted, but you should rotate them immediately if exposure is suspected.</p>
                        <p>Use of Discord remains subject to Discord’s own terms, developer policies, rate limits, and platform availability.</p>
                    </div>
                </section>

                <section id="use" :class="$style.termsSection">
                    <p :class="$style.sectionNumber">05</p>
                    <div :class="$style.sectionCopy">
                        <h2>Acceptable use</h2>
                        <p>Do not use the platform or bot services to:</p>
                        <ul>
                            <li>Break applicable law, Discord rules, or another service’s rights.</li>
                            <li>Send spam, scams, malware, abusive content, or unauthorized automated messages.</li>
                            <li>Attempt to access another account, bot, server, wallet, or administrative feature.</li>
                            <li>Probe, disrupt, overload, reverse engineer, or bypass platform security and purchase controls.</li>
                            <li>Upload fraudulent payment evidence or misuse another person’s payment information.</li>
                        </ul>
                    </div>
                </section>

                <section id="availability" :class="$style.termsSection">
                    <p :class="$style.sectionNumber">06</p>
                    <div :class="$style.sectionCopy">
                        <h2>Availability and changes</h2>
                        <p>The platform is developed and operated independently. Features may be improved, replaced, temporarily unavailable, or discontinued for maintenance, security, third-party changes, or operational reasons.</p>
                        <p>Reasonable effort is made to keep paid services reliable, but uninterrupted operation cannot be guaranteed where availability depends on Discord, hosting, payment verification, networks, or other external services.</p>
                    </div>
                </section>

                <section id="refunds" :class="$style.termsSection">
                    <p :class="$style.sectionNumber">07</p>
                    <div :class="$style.sectionCopy">
                        <h2>Refunds and corrections</h2>
                        <p>If a payment is duplicated, credited incorrectly, or a purchased service cannot be provisioned, contact Fujipp with the transaction reference so the issue can be reviewed.</p>
                        <p>Refund or wallet-credit eligibility depends on the transaction status, whether a digital service has already been provisioned or used, and applicable law. Nothing in these Terms removes rights that cannot legally be limited.</p>
                    </div>
                </section>

                <section id="ownership" :class="$style.termsSection">
                    <p :class="$style.sectionNumber">08</p>
                    <div :class="$style.sectionCopy">
                        <h2>Ownership</h2>
                        <p>The platform design, source presentation, branding, and original service materials belong to Fujipp or their respective licensors. Purchasing a service gives you permission to use that service; it does not transfer ownership of the platform or its underlying software.</p>
                        <p>You retain ownership of content and configuration you lawfully provide. You grant only the permission needed to process that material and operate the requested service.</p>
                    </div>
                </section>

                <section id="liability" :class="$style.termsSection">
                    <p :class="$style.sectionNumber">09</p>
                    <div :class="$style.sectionCopy">
                        <h2>Responsibility</h2>
                        <p>The service is provided with reasonable care, but results can be affected by your configuration and third-party platforms. You are responsible for reviewing bot behavior, permissions, messages, embeds, and automated actions before production use.</p>
                        <p>To the extent permitted by law, Fujipp is not responsible for indirect loss caused by misuse, unauthorized credentials, external outages, Discord enforcement, or content supplied by the user.</p>
                    </div>
                </section>

                <section id="termination" :class="[$style.termsSection, $style.contactSection]">
                    <p :class="$style.sectionNumber">10</p>
                    <div :class="$style.sectionCopy">
                        <h2>Termination and contact</h2>
                        <p>Access may be restricted or terminated when these Terms are violated, payment activity is fraudulent, continued operation creates security risk, or suspension is required by law or a third-party platform.</p>
                        <p>For account, billing, service, or Terms questions, contact:</p>
                        <a href="mailto:anawat.grudtoop@gmail.com">anawat.grudtoop@gmail.com</a>
                    </div>
                </section>
            </article>
        </div>

        <AppFooter />
    </main>
</template>

<style module>
.termsPage {
    min-height: 100dvh;
    padding-top: 73px;
    background: var(--color-main-background);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    text-align: left;
}

.hero {
    width: 100%;
    background: var(--color-main-surface);
    color: var(--color-button-primary);
}

.heroInner {
    display: grid;
    box-sizing: border-box;
    width: min(100%, 1280px);
    min-height: min(72dvh, 760px);
    margin: 0 auto;
    padding: var(--spacing-space-16);
    align-content: center;
    grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.55fr);
    gap: var(--spacing-space-12);
}

.eyebrow {
    margin: 0 0 var(--spacing-space-6);
    color: var(--color-main-brand-secondary);
    font-size: var(--type-size-overline);
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    grid-column: 1 / -1;
}

.title {
    max-width: 880px;
    margin: 0;
    font-size: clamp(3.25rem, 8vw, 7.5rem);
    font-weight: 800;
    letter-spacing: -0.065em;
    line-height: 0.88;
}

.heroMeta {
    display: flex;
    flex-direction: column;
    align-self: end;
    padding-bottom: var(--spacing-space-2);
    gap: var(--spacing-space-6);
}

.heroMeta p,
.heroMeta span {
    margin: 0;
    color: color-mix(in srgb, var(--color-button-primary) 68%, transparent);
    font-size: var(--type-size-body-small);
    line-height: 1.6;
}

.heroMeta span {
    font-size: var(--type-size-caption);
}

.contentLayout {
    display: grid;
    box-sizing: border-box;
    width: min(100%, 1280px);
    margin: 0 auto;
    padding: var(--spacing-space-20) var(--spacing-space-16) var(--spacing-space-32);
    grid-template-columns: 240px minmax(0, 1fr);
    gap: var(--spacing-space-16);
}

.tableOfContents {
    position: sticky;
    top: calc(73px + var(--spacing-space-8));
    height: fit-content;
}

.contentsLabel {
    margin: 0 0 var(--spacing-space-4);
    color: var(--color-text-secondary);
    font-size: var(--type-size-overline);
    font-weight: 600;
    text-transform: uppercase;
}

.tableOfContents nav {
    display: flex;
    flex-direction: column;
}

.tableOfContents a {
    display: grid;
    padding: var(--spacing-space-3) 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-main-divider) 44%, transparent);
    color: var(--color-text-secondary);
    font-size: var(--type-size-caption);
    line-height: 1.35;
    text-decoration: none;
    grid-template-columns: 32px 1fr;
    transition: color 180ms ease, padding-left 180ms ease;
}

.tableOfContents a span,
.sectionNumber {
    color: var(--color-main-brand-secondary);
    font-weight: 800;
}

.tableOfContents a:hover,
.tableOfContents a:focus-visible {
    padding-left: var(--spacing-space-2);
    color: var(--color-text-primary);
}

.tableOfContents a:focus-visible {
    outline: 2px solid var(--color-main-brand-secondary);
    outline-offset: 2px;
}

.terms {
    min-width: 0;
}

.termsSection {
    display: grid;
    padding: var(--spacing-space-16) 0;
    border-top: 1px solid var(--color-main-divider);
    scroll-margin-top: 96px;
    grid-template-columns: 64px minmax(0, 1fr);
    gap: var(--spacing-space-6);
}

.termsSection:first-child {
    padding-top: 0;
    border-top: 0;
}

.sectionNumber {
    margin: var(--spacing-space-2) 0 0;
    font-size: var(--type-size-overline);
}

.sectionCopy {
    max-width: 820px;
}

.sectionCopy h2 {
    margin: 0 0 var(--spacing-space-6);
    font-size: clamp(2rem, 4vw, 3.75rem);
    font-weight: 800;
    letter-spacing: -0.045em;
    line-height: 1;
}

.sectionCopy h3 {
    margin: 0 0 var(--spacing-space-2);
    font-size: var(--type-size-body-main);
    font-weight: 600;
}

.sectionCopy p,
.sectionCopy li {
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-small);
    line-height: 1.7;
}

.sectionCopy p {
    margin: 0 0 var(--spacing-space-5);
}

.sectionCopy ul {
    display: grid;
    margin: 0;
    padding-left: var(--spacing-space-6);
    gap: var(--spacing-space-2);
}

.detailGrid {
    display: grid;
    margin-top: var(--spacing-space-8);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-space-8);
}

.detailGrid > div {
    padding-top: var(--spacing-space-4);
    border-top: 2px solid var(--color-main-brand-secondary);
}

.detailGrid p {
    margin-bottom: 0;
}

.contactSection a {
    display: inline-block;
    margin-top: var(--spacing-space-4);
    color: var(--color-text-primary);
    font-size: clamp(1.25rem, 3vw, 2.5rem);
    font-weight: 600;
    text-decoration-color: var(--color-main-brand-secondary);
    text-decoration-thickness: 2px;
    text-underline-offset: 6px;
}

.contactSection a:hover {
    color: var(--color-main-brand-secondary);
}

@media (max-width: 900px) {
    .heroInner {
        min-height: 620px;
        grid-template-columns: 1fr;
        gap: var(--spacing-space-8);
    }

    .heroMeta {
        align-self: start;
        max-width: 520px;
    }

    .contentLayout {
        grid-template-columns: 1fr;
    }

    .tableOfContents {
        position: static;
    }

    .tableOfContents nav {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        column-gap: var(--spacing-space-6);
    }
}

@media (max-width: 600px) {
    .termsPage {
        padding-top: 65px;
    }

    .heroInner {
        min-height: 560px;
        padding: var(--spacing-space-10) var(--spacing-space-6);
    }

    .title {
        font-size: clamp(3rem, 17vw, 5rem);
    }

    .contentLayout {
        padding: var(--spacing-space-12) var(--spacing-space-6) var(--spacing-space-20);
        gap: var(--spacing-space-12);
    }

    .tableOfContents nav,
    .detailGrid {
        grid-template-columns: 1fr;
    }

    .termsSection {
        padding: var(--spacing-space-12) 0;
        grid-template-columns: 1fr;
        gap: var(--spacing-space-3);
    }

    .detailGrid {
        gap: var(--spacing-space-6);
    }

    .contactSection a {
        font-size: var(--type-size-body-main);
        overflow-wrap: anywhere;
    }
}
</style>
