<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useLocaleText } from "@/i18n";

const text = useLocaleText();

interface Props {
    // Target date/time the subscription ends. Accepts a date ("2026-07-09") or a
    // full ISO timestamp; a bare date is treated as local midnight of that day.
    until: string | null | undefined;
    expiredLabel?: string;
}

const props = withDefaults(defineProps<Props>(), { expiredLabel: "Expired" });

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;

const targetMs = computed(() => {
    if (!props.until) return null;
    const raw = props.until.length <= 10 ? `${props.until}T00:00:00` : props.until;
    const ms = new Date(raw).getTime();
    return Number.isNaN(ms) ? null : ms;
});

const remaining = computed(() => {
    if (targetMs.value === null) return null;
    return Math.max(0, targetMs.value - now.value);
});

const expired = computed(() => remaining.value !== null && remaining.value === 0);

const display = computed(() => {
    if (remaining.value === null) return "-";
    if (remaining.value === 0) return props.expiredLabel === "Expired" ? text("Expired", "หมดอายุ") : props.expiredLabel;

    const totalSeconds = Math.floor(remaining.value / 1000);
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
});

onMounted(() => {
    timer = setInterval(() => { now.value = Date.now(); }, 1000);
});
onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
});
</script>

<template>
    <span :class="[$style.countdown, expired && $style.expired]" role="timer">{{ display }}</span>
</template>

<style module>
.countdown {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    letter-spacing: 0.02em;
}

.expired {
    color: var(--color-status-error);
}
</style>
