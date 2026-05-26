<script setup lang="ts">
const footerLinks = [
    { label: "Performance", to: "/performance" },
    { label: "Changelog", to: "/changelog" },
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
];
</script>

<template>
    <footer :class="$style.footer" class="bg-main-surface text-text-secondary transition-colors duration-300">
        <div :class="$style.content">
            <div :class="$style.brand">
                <RouterLink to="/" class="type-h1-page-title-sb">
                    FUJIPP
                </RouterLink>
                <div class="type-body-small-r">
                    Building ideas, one commit at a time.
                </div>
            </div>
            <nav :class="$style.footerLinks" class="type-button-r" aria-label="Footer">
                <template v-for="(link, index) in footerLinks" :key="link.to">
                    <RouterLink
                        :to="link.to"
                        class="transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-primary">
                        {{ link.label }}
                    </RouterLink>
                    <span v-if="index < footerLinks.length - 1" aria-hidden="true">
                        |
                    </span>
                </template>
            </nav>
        </div>
        <hr :class="$style.divider" class="border-main-divider">

        <div class="type-body-small-r">© 2026 Fujipp. All rights reserved.</div>

    </footer>
</template>

<style module>
.footer {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 208px;
    padding: 20px;
    gap: 10px;
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

.footerLinks {
    display: flex;
    align-items: center;
    padding: 10px;
    gap: 10px;
}

.divider {
    width: 100%;
    height: 1px;
    margin: 0;
    border-width: 1px 0 0;
}

@media (max-width: 767px) {
    .footer {
        height: 221px;
    }

    .content {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0;
    }

    .brand {
        align-items: center;
        justify-content: center;
    }
}
</style>
