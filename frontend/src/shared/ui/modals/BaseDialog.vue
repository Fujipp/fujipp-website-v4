<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from "vue";

type DialogSize = "small" | "medium" | "large";

interface Props {
    ariaDescribedBy?: string;
    ariaLabelledBy?: string;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    size?: DialogSize;
}

const props = withDefaults(defineProps<Props>(), {
    ariaDescribedBy: undefined,
    ariaLabelledBy: undefined,
    closeOnBackdrop: true,
    closeOnEscape: true,
    size: "medium",
});

const emit = defineEmits<{
    close: [];
}>();

const dialog = ref<HTMLElement | null>(null);
let previouslyFocusedElement: HTMLElement | null = null;
let previousBodyOverflow = "";

function focusableElements(): HTMLElement[] {
    if (!dialog.value) return [];

    return Array.from(dialog.value.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape" && props.closeOnEscape) {
        event.preventDefault();
        emit("close");
        return;
    }

    if (event.key !== "Tab") return;

    const elements = focusableElements();
    if (!elements.length) {
        event.preventDefault();
        dialog.value?.focus();
        return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function handleBackdropClick(): void {
    if (props.closeOnBackdrop) emit("close");
}

onMounted(() => {
    previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);

    void nextTick(() => {
        const [firstFocusableElement] = focusableElements();
        (firstFocusableElement ?? dialog.value)?.focus();
    });
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
    document.body.style.overflow = previousBodyOverflow;
    previouslyFocusedElement?.focus();
});
</script>

<template>
    <Teleport to="body">
        <div :class="$style.backdrop" @click.self="handleBackdropClick">
            <section
                ref="dialog"
                :class="[$style.dialog, $style[size]]"
                role="dialog"
                aria-modal="true"
                :aria-labelledby="ariaLabelledBy"
                :aria-describedby="ariaDescribedBy"
                tabindex="-1"
            >
                <slot />
            </section>
        </div>
    </Teleport>
</template>

<style module>
.backdrop {
    position: fixed;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    inset: 0;
    padding: var(--spacing-space-4);
    background-color: rgb(0 0 0 / 60%);
    backdrop-filter: blur(4px);
    animation: base-dialog-fade 180ms ease-out;
}

.dialog {
    box-sizing: border-box;
    width: 100%;
    max-height: min(80vh, 640px);
    overflow: hidden;
    border: 1px solid var(--color-dialog-divider);
    border-radius: var(--radius-2xl);
    background-color: var(--color-dialog-background);
    color: var(--color-dialog-text-primary);
    font-family: var(--font-sans);
    outline: none;
    animation: base-dialog-pop 220ms ease-out;
}

.small { max-width: 420px; }
.medium { max-width: 448px; }
.large { max-width: 640px; }

@keyframes base-dialog-fade {
    from { opacity: 0; }
}

@keyframes base-dialog-pop {
    from {
        opacity: 0;
        transform: translateY(var(--spacing-space-3)) scale(0.97);
    }
}

@media (prefers-reduced-motion: reduce) {
    .backdrop,
    .dialog {
        animation: none;
    }
}
</style>
