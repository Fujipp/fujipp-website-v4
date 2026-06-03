<script setup lang="ts">
import { computed } from "vue";
import { ActionButton, SecondaryButton } from "@/components/ui/buttons";
import type { ActionButtonVariant } from "@/components/ui/buttons";

export type BotStatus = "offline" | "online";

interface Props {
    image?: string;
    name: string;
    status?: BotStatus;
}

const props = withDefaults(defineProps<Props>(), {
    image: "",
    status: "offline",
});

const emit = defineEmits<{
    action: [action: ActionButtonVariant];
    view: [];
}>();

const actions = ["start", "stop", "restart", "edit"] as const;
const statusLabel = computed(() => props.status === "online" ? "Online" : "Offline");
const placeholderInitial = computed(() => props.name.trim().charAt(0).toUpperCase() || "B");
</script>

<template>
    <article :class="$style.botCard" :aria-label="`${name} bot card`">
        <img
            v-if="image"
            :class="$style.botImage"
            :src="image"
            :alt="name"
            draggable="false"
        >
        <div v-else :class="$style.botPlaceholder" aria-hidden="true">
            {{ placeholderInitial }}
        </div>

        <div :class="$style.content">
            <header :class="$style.header">
                <h3 :class="$style.botName" class="type-body-main-sb">{{ name }}</h3>
                <span
                    :class="[$style.statusDot, status === 'online' ? $style.online : $style.offline]"
                    :aria-label="statusLabel"
                    role="img"
                />
            </header>

            <div :class="$style.actionList" aria-label="Bot actions">
                <ActionButton
                    v-for="action in actions"
                    :key="action"
                    :variant="action"
                    :aria-label="`${action} ${name}`"
                    @click="emit('action', action)"
                />
            </div>

            <SecondaryButton @click="emit('view')">View</SecondaryButton>
        </div>
    </article>
</template>

<style module>
.botCard {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: min(100%, 400px);
    min-height: 192px;
    padding: var(--spacing-space-3);
    gap: var(--spacing-space-3);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.botImage,
.botPlaceholder {
    width: 166px;
    height: 166px;
    flex-shrink: 0;
    border-radius: var(--radius-xl);
}

.botImage {
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
}

.botPlaceholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gradient-card-highlight);
    color: var(--color-button-primary-btn-text-active);
    font-size: 48px;
    font-weight: 600;
    line-height: normal;
}

.content {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 166px;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
}

.header {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: var(--spacing-space-3);
}

.botName {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.statusDot {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
}

.online {
    background-color: var(--color-status-success);
}

.offline {
    background-color: var(--color-status-error);
}

.actionList {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 177px;
    gap: var(--spacing-space-4);
}

@media (max-width: 520px) {
    .botCard {
        width: 100%;
        min-height: auto;
    }

    .botImage,
    .botPlaceholder {
        width: 128px;
        height: 128px;
    }

    .content {
        min-height: 128px;
    }
}
</style>
