<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { useToastStore } from "@/stores";
import StatusToast from "./StatusToast.vue";

const toastStore = useToastStore();
const { toasts } = storeToRefs(toastStore);
const notificationAudio = ref<HTMLAudioElement | null>(null);

watch(
    () => toasts.value.map((toast) => toast.id),
    (currentIds, previousIds = []) => {
        if (!currentIds.some((id) => !previousIds.includes(id))) return;
        const audio = notificationAudio.value;
        if (!audio) return;
        audio.currentTime = 0;
        audio.volume = 0.28;
        void audio.play().catch(() => {
            // Browsers may block audio before the user's first interaction.
        });
    },
);
</script>

<template>
    <div :class="$style.toastHost" aria-live="polite">
        <!-- Message pop alert by Mixkit, used under the Mixkit Sound Effects License. -->
        <audio ref="notificationAudio" src="/sounds/toast-notification.mp3" preload="auto" />
        <TransitionGroup
            :enter-from-class="$style.slideHidden"
            :leave-to-class="$style.slideHidden"
            :enter-active-class="$style.slideActive"
            :leave-active-class="[$style.slideActive, $style.slideLeaving].join(' ')"
            :move-class="$style.slideMove"
        >
            <StatusToast
                v-for="toast in toasts"
                :key="toast.id"
                :class="$style.toastItem"
                :title="toast.title"
                :description="toast.description"
                :status="toast.status"
                @close="toastStore.dismiss(toast.id)"
            />
        </TransitionGroup>
    </div>
</template>

<style module>
.toastHost {
    position: fixed;
    right: var(--spacing-space-4);
    bottom: var(--spacing-space-4);
    z-index: 90;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    width: min(calc(100vw - var(--spacing-space-8)), 440px);
    gap: var(--spacing-space-2);
    pointer-events: none;
}

.toastItem {
    pointer-events: auto;
}

.slideActive {
    transform-origin: bottom right;
    transition: opacity 240ms ease, transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* Leaving toasts drop out of the flow (keeping their spot) so the rest settle smoothly. */
.slideLeaving {
    position: absolute;
    right: 0;
    left: 0;
}

.slideHidden {
    opacity: 0;
    transform: translateY(var(--spacing-space-3)) scale(0.97);
}

.slideMove {
    transition: transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@media (max-width: 520px) {
    .toastHost {
        right: var(--spacing-space-3);
        bottom: var(--spacing-space-3);
        width: calc(100vw - var(--spacing-space-6));
    }
}

@media (prefers-reduced-motion: reduce) {
    .slideActive,
    .slideMove {
        transition: none;
    }
}
</style>
