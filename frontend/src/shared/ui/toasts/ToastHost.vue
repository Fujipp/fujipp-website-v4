<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useToastStore } from "@/stores";
import StatusToast from "./StatusToast.vue";

const toastStore = useToastStore();
const { toasts } = storeToRefs(toastStore);
</script>

<template>
    <div :class="$style.toastHost" aria-live="polite">
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
    right: 16px;
    bottom: 16px;
    z-index: 90;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    width: min(calc(100vw - 32px), 380px);
    gap: 8px;
    pointer-events: none;
}

.toastItem {
    pointer-events: auto;
}

.slideActive {
    transition: opacity 300ms ease-in-out, transform 300ms ease-in-out;
}

/* Leaving toasts drop out of the flow (keeping their spot) so the rest settle smoothly. */
.slideLeaving {
    position: absolute;
    right: 0;
    left: 0;
}

.slideHidden {
    opacity: 0;
    transform: translateX(calc(100% + 16px));
}

.slideMove {
    transition: transform 300ms ease-in-out;
}
</style>
