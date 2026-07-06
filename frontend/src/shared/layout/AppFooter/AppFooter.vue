<script setup lang="ts">
const footerLinks = [
    { label: "Performance", to: "/performance" },
    { label: "Changelog", to: "/changelog" },
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
];
</script>

<template>
    <footer :class="$style.footer" class="bg-main-background text-text-primary transition-colors duration-300">
        <hr :class="$style.divider" class="border-main-divider">
        <div :class="$style.content">
            <div :class="$style.brand">
                <RouterLink to="/" class="type-h1-page-title-sb">
                    FUJIPP
                </RouterLink>
                <div :class="$style.tagline" class="type-body-main-r">
                    Building ideas, one commit at a time.
                </div>
            </div>
            <nav :class="$style.footerLinks" class="type-button-r" aria-label="Footer">
                <template v-for="(link, index) in footerLinks" :key="link.to">
                    <RouterLink
                        :to="link.to"
                        :class="$style.footerLink"
                        :data-label="link.label"
                        class="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary">
                        <span>{{ link.label }}</span>
                    </RouterLink>
                    <span v-if="index < footerLinks.length - 1" :class="$style.separator" aria-hidden="true">
                        |
                    </span>
                </template>
            </nav>
        </div>
        <div :class="$style.copyright" class="type-body-main-r">© 2026 Fujipp. All rights reserved.</div>
    </footer>
</template>

<style module>
.footer {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 12px 16px;
    gap: 24px;
    overflow: hidden;
}

.divider {
    align-self: stretch;
    height: 1px;
    margin: 0;
    border-width: 1px 0 0;
}

.content {
    align-self: stretch;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-space-5);
}

.brand {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.brand a {
    color: inherit;
    text-decoration: none;
}

.tagline,
.copyright {
    font-weight: 300;
    color: var(--color-text-secondary);
}

.footerLinks {
    display: flex;
    align-items: center;
    padding: 8px;
    gap: 12px;
    user-select: none;
}

.footerLink {
    display: inline-grid;
    color: inherit;
    font-weight: 300;
    text-decoration: none;
    transition: color 180ms ease;
}

.footerLink::after,
.footerLink span {
    grid-area: 1 / 1;
}

.footerLink::after {
    visibility: hidden;
    font-weight: 600;
    content: attr(data-label);
}

.footerLink:hover,
.footerLink:focus-visible {
    color: var(--color-text-secondary);
    font-weight: 600;
}

.separator {
    flex-shrink: 0;
    font-weight: 300;
}

@media (max-width: 767px) {
    .content {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0;
    }

    .brand {
        align-items: center;
    }

    .footerLinks {
        padding: 10px;
    }
}
</style>
