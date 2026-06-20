<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <main :class="$style.page" aria-labelledby="not-found-title">
    <section :class="$style.panel">
      <p :class="$style.code" class="type-overline-sb">404</p>
      <h1 id="not-found-title" :class="$style.title" class="type-h1-page-title-sb">
        Page not found
      </h1>
      <p :class="$style.description" class="type-body-small-r">
        The page may have moved, or the link is no longer available.
      </p>
      <nav :class="$style.actions" aria-label="404 navigation">
        <RouterLink :class="$style.primaryAction" class="type-button-sb" :to="{ name: 'home' }">
          Back home
        </RouterLink>
        <RouterLink :class="$style.secondaryAction" class="type-button-sb" :to="{ name: 'projects' }">
          View projects
        </RouterLink>
      </nav>
    </section>
  </main>
</template>

<style module>
.page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  box-sizing: border-box;
  padding: var(--spacing-space-24) var(--spacing-space-6);
  background-color: var(--color-main-background);
  color: var(--color-text-primary);
}

.panel {
  display: flex;
  width: min(100%, 560px);
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-space-4);
  border: 1px solid var(--color-input-border);
  border-radius: var(--radius-2xl);
  background-color: var(--color-neutral-50);
  padding: var(--spacing-space-8);
}

.code {
  color: var(--color-main-primary);
  letter-spacing: 0;
}

.title {
  margin: 0;
}

.description {
  margin: 0;
  color: var(--color-neutral-600);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-space-3);
  padding-top: var(--spacing-space-2);
}

.primaryAction,
.secondaryAction {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  padding: var(--spacing-space-3) var(--spacing-space-5);
  text-decoration: none;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.primaryAction {
  background-color: var(--color-button-primary-btn-bg);
  color: var(--color-button-primary-btn-text-active);
}

.primaryAction:hover {
  background-color: var(--color-button-primary-btn-hover);
}

.primaryAction:active {
  background-color: var(--color-button-primary-btn-active);
}

.secondaryAction {
  border: 1px solid var(--color-input-border);
  background-color: var(--color-input-bg);
  color: var(--color-text-primary);
}

.secondaryAction:hover {
  border-color: var(--color-input-border-hover);
}

.primaryAction:focus-visible,
.secondaryAction:focus-visible {
  outline: 2px solid var(--color-input-border-focus);
  outline-offset: 3px;
}

:global(.dark) .panel,
:global([data-theme="dark"]) .panel {
  background-color: var(--color-main-surface);
}

:global(.dark) .description,
:global([data-theme="dark"]) .description {
  color: var(--color-text-secondary);
}

@media (max-width: 640px) {
  .page {
    align-items: start;
    padding-top: var(--spacing-space-20);
  }

  .panel {
    padding: var(--spacing-space-6);
  }

  .actions,
  .primaryAction,
  .secondaryAction {
    width: 100%;
  }
}
</style>
