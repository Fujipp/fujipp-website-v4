<script setup lang="ts">
import { AdminLayout } from "@/features/admin/components";

// Metrics are wired up in a later PR (PR6). For now this is the admin landing page
// with placeholders so the shell, routing, and navigation can be used end-to-end.
const placeholders = [
    { label: "Users", hint: "Total registered users" },
    { label: "Active bots", hint: "Bots currently running" },
    { label: "Revenue (30d)", hint: "Top-ups in the last 30 days" },
    { label: "VPS capacity", hint: "Slots used across hosts" },
] as const;
</script>

<template>
    <AdminLayout title="Dashboard">
        <section :class="$style.cards" aria-label="Platform metrics">
            <article v-for="card in placeholders" :key="card.label" :class="$style.card">
                <span :class="$style.cardLabel">{{ card.label }}</span>
                <span :class="$style.cardValue">—</span>
                <span :class="$style.cardHint">{{ card.hint }}</span>
            </article>
        </section>
        <p :class="$style.note">Metrics will be populated in a later release.</p>
    </AdminLayout>
</template>

<style module>
.cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
}

.card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-sizing: border-box;
    padding: 20px;
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.cardLabel {
    font-size: 14px;
    color: var(--color-text-secondary);
}

.cardValue {
    font-size: 28px;
    font-weight: 600;
    color: var(--color-text-secondary);
}

.cardHint {
    font-size: 12px;
    color: var(--color-text-disabled);
}

.note {
    margin: 0;
    color: var(--color-text-disabled);
    font-size: 14px;
}
</style>
