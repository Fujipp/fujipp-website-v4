<script setup lang="ts">
import { AppFooter } from "@/shared/layout";

const sections = [
    { id: "information", label: "Information we collect" },
    { id: "use", label: "How we use information" },
    { id: "services", label: "Services and sharing" },
    { id: "storage", label: "Local storage" },
    { id: "security", label: "Security and retention" },
    { id: "choices", label: "Your choices" },
    { id: "changes", label: "Changes and contact" },
] as const;
</script>

<template>
    <main :class="$style.privacyPage">
        <header :class="$style.hero">
            <div :class="$style.heroInner">
                <p :class="$style.eyebrow">Legal · Privacy</p>
                <h1 :class="$style.title">Your data,<br>explained clearly.</h1>
                <div :class="$style.heroMeta">
                    <p>
                        This policy explains what Fujipp Personal Platform handles,
                        why it is needed, and the choices available to you.
                    </p>
                    <span>Last updated · 19 July 2026</span>
                </div>
            </div>
        </header>

        <div :class="$style.contentLayout">
            <aside :class="$style.tableOfContents" aria-label="Privacy policy contents">
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

            <article :class="$style.policy">
                <section id="information" :class="$style.policySection">
                    <p :class="$style.sectionNumber">01</p>
                    <div :class="$style.sectionCopy">
                        <h2>Information we collect</h2>
                        <p>We collect only information needed to operate the portfolio, account, shop, and bot services.</p>
                        <div :class="$style.detailGrid">
                            <div>
                                <h3>Account and profile</h3>
                                <p>Email address, username, display name, avatar, authentication provider, and account identifier.</p>
                            </div>
                            <div>
                                <h3>Shop and payments</h3>
                                <p>Wallet balance, orders, transaction records, payment references, and information returned from payment-slip verification.</p>
                            </div>
                            <div>
                                <h3>Discord bot services</h3>
                                <p>Bot name, Discord application and server identifiers, public key, configuration, avatar URL, and credentials you provide to run the service.</p>
                            </div>
                            <div>
                                <h3>Messages</h3>
                                <p>Information you choose to include when contacting Fujipp for support, questions, or an opportunity.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="use" :class="$style.policySection">
                    <p :class="$style.sectionNumber">02</p>
                    <div :class="$style.sectionCopy">
                        <h2>How we use information</h2>
                        <ul>
                            <li>Authenticate your account and maintain your profile.</li>
                            <li>Process wallet top-ups, purchases, subscriptions, and order history.</li>
                            <li>Provision, configure, monitor, and support Discord bot services.</li>
                            <li>Protect the platform against fraud, duplicate payments, abuse, and unauthorized access.</li>
                            <li>Respond to support requests and improve platform reliability.</li>
                        </ul>
                        <p>We do not sell personal information or use it for third-party behavioral advertising.</p>
                    </div>
                </section>

                <section id="services" :class="$style.policySection">
                    <p :class="$style.sectionNumber">03</p>
                    <div :class="$style.sectionCopy">
                        <h2>Services and sharing</h2>
                        <p>Information is shared only when required to provide a feature, keep the platform secure, or comply with law.</p>
                        <div :class="$style.serviceList">
                            <div><strong>Supabase</strong><span>Account authentication and session management.</span></div>
                            <div><strong>Discord</strong><span>Bot identity, avatar lookup, and operation of configured bot services.</span></div>
                            <div><strong>SlipOK</strong><span>Verification of submitted Thai bank-transfer slips.</span></div>
                            <div><strong>Infrastructure providers</strong><span>Hosting, databases, deployment, and service monitoring.</span></div>
                        </div>
                    </div>
                </section>

                <section id="storage" :class="$style.policySection">
                    <p :class="$style.sectionNumber">04</p>
                    <div :class="$style.sectionCopy">
                        <h2>Local storage</h2>
                        <p>The browser stores essential preferences such as language, theme, and interface positions. Authentication technology also keeps you signed in securely.</p>
                        <p>The current platform does not use advertising cookies or cross-site behavioral tracking.</p>
                    </div>
                </section>

                <section id="security" :class="$style.policySection">
                    <p :class="$style.sectionNumber">05</p>
                    <div :class="$style.sectionCopy">
                        <h2>Security and retention</h2>
                        <p>Reasonable technical and organizational safeguards are used to protect information. Discord bot tokens and client secrets are stored encrypted rather than as readable plain text.</p>
                        <p>Information is kept only while needed to provide the service, maintain required transaction and security records, resolve disputes, or meet legal obligations. No online system can guarantee absolute security.</p>
                    </div>
                </section>

                <section id="choices" :class="$style.policySection">
                    <p :class="$style.sectionNumber">06</p>
                    <div :class="$style.sectionCopy">
                        <h2>Your choices</h2>
                        <p>You may request access to, correction of, or deletion of your personal information. Some transaction, fraud-prevention, or legal records may need to be retained after account deletion.</p>
                        <p>You can also sign out, stop using a configured bot service, or remove optional browser preferences at any time.</p>
                    </div>
                </section>

                <section id="changes" :class="[$style.policySection, $style.contactSection]">
                    <p :class="$style.sectionNumber">07</p>
                    <div :class="$style.sectionCopy">
                        <h2>Changes and contact</h2>
                        <p>This policy may be updated as the platform changes. The date at the top will be revised when a material update is published.</p>
                        <a href="mailto:anawat.grudtoop@gmail.com">anawat.grudtoop@gmail.com</a>
                    </div>
                </section>
            </article>
        </div>

        <AppFooter />
    </main>
</template>

<style module>
.privacyPage {
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
    max-width: 820px;
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

.tableOfContents a span {
    color: var(--color-main-brand-secondary);
    font-weight: 600;
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

.policy {
    min-width: 0;
}

.policySection {
    display: grid;
    padding: var(--spacing-space-16) 0;
    border-top: 1px solid var(--color-main-divider);
    scroll-margin-top: 96px;
    grid-template-columns: 64px minmax(0, 1fr);
    gap: var(--spacing-space-6);
}

.policySection:first-child {
    padding-top: 0;
    border-top: 0;
}

.sectionNumber {
    margin: var(--spacing-space-2) 0 0;
    color: var(--color-main-brand-secondary);
    font-size: var(--type-size-overline);
    font-weight: 800;
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
    margin: 0 0 var(--spacing-space-6);
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

.serviceList {
    margin-top: var(--spacing-space-8);
    border-top: 1px solid var(--color-main-divider);
}

.serviceList > div {
    display: grid;
    padding: var(--spacing-space-4) 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-main-divider) 54%, transparent);
    grid-template-columns: minmax(120px, 0.35fr) minmax(0, 1fr);
    gap: var(--spacing-space-6);
}

.serviceList strong {
    font-size: var(--type-size-body-small);
}

.serviceList span {
    color: var(--color-text-secondary);
    font-size: var(--type-size-body-small);
    line-height: 1.55;
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
    .privacyPage {
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

    .tableOfContents nav {
        grid-template-columns: 1fr;
    }

    .policySection {
        padding: var(--spacing-space-12) 0;
        grid-template-columns: 1fr;
        gap: var(--spacing-space-3);
    }

    .detailGrid {
        grid-template-columns: 1fr;
        gap: var(--spacing-space-6);
    }

    .serviceList > div {
        grid-template-columns: 1fr;
        gap: var(--spacing-space-1);
    }

    .contactSection a {
        font-size: var(--type-size-body-main);
        overflow-wrap: anywhere;
    }
}
</style>
