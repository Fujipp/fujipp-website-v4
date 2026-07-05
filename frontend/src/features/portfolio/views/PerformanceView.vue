<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { AppFooter } from "@/shared/layout";
import { useMonitoringStore } from "@/features/portfolio/stores";

/* ----------------------------------------------------------------------------
 * Live browser-session metrics (REAL data, read from this visitor's browser).
 * Powers the "Browser Runtime" section.
 * ------------------------------------------------------------------------- */

interface RuntimeMetric {
    label: string;
    value: string;
    detail: string;
}

interface ResourceStat {
    label: string;
    count: number;
    duration: number;
}

interface TimelineItem {
    label: string;
    value: number;
}

interface PaintMetric {
    label: string;
    value: number;
}

const sessionStartedAt = Date.now();
const sessionSeconds = ref(0);
const loadTime = ref<number | null>(null);
const domReadyTime = ref<number | null>(null);
const firstPaintTime = ref<number | null>(null);
const firstContentfulPaintTime = ref<number | null>(null);
const resourceStats = ref<ResourceStat[]>([]);
const timelineItems = ref<TimelineItem[]>([]);
const fpsSamples = ref<number[]>(Array.from({ length: 28 }, () => 0));
const memoryUsage = ref<number | null>(null);

let sessionTimer: ReturnType<typeof setInterval> | undefined;
let metricsTimer: ReturnType<typeof setInterval> | undefined;
let healthTimer: ReturnType<typeof setInterval> | undefined;
let sampleTimer: ReturnType<typeof setInterval> | undefined;
let animationFrameId = 0;
let lastFrameTime = 0;

const pageRuntime = computed(() => formatDuration(sessionSeconds.value * 1000));

const paintMetrics = computed<PaintMetric[]>(() => [
    { label: "First paint", value: firstPaintTime.value ?? 0 },
    { label: "Contentful paint", value: firstContentfulPaintTime.value ?? 0 },
    { label: "DOM ready", value: domReadyTime.value ?? 0 },
    { label: "Full load", value: loadTime.value ?? 0 },
]);

const runtimeMetrics = computed<RuntimeMetric[]>(() => [
    {
        label: "Runtime",
        value: pageRuntime.value,
        detail: "How long this performance view has been alive in your browser.",
    },
    {
        label: "Full load",
        value: formatMs(loadTime.value),
        detail: "Measured from navigation start until the window load event completed.",
    },
    {
        label: "Resources",
        value: String(resourceStats.value.reduce((total, item) => total + item.count, 0)),
        detail: "Scripts, styles, images, fonts, and fetches observed by the current page.",
    },
    {
        label: "JS heap",
        value: memoryUsage.value === null ? "N/A" : `${memoryUsage.value} MB`,
        detail: "Available in Chromium-based browsers; hidden by browsers that do not expose memory.",
    },
]);

const maxResourceDuration = computed(() => Math.max(...resourceStats.value.map((item) => item.duration), 1));
const maxTimelineValue = computed(() => Math.max(...timelineItems.value.map((item) => item.value), 1));
const maxPaintValue = computed(() => Math.max(...paintMetrics.value.map((item) => item.value), 1));
const currentFps = computed(() => fpsSamples.value[fpsSamples.value.length - 1] ?? 0);

function formatMs(value: number | null): string {
    if (value === null || !Number.isFinite(value) || value <= 0) {
        return "--";
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(2)}s`;
    }
    return `${Math.round(value)}ms`;
}

function formatDuration(value: number): string {
    const totalSeconds = Math.max(0, Math.floor(value / 1000));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function barWidth(value: number, maxValue: number): string {
    if (value <= 0) {
        return "2%";
    }
    return `${Math.max(4, Math.round((value / maxValue) * 100))}%`;
}

function getResourceKind(entry: PerformanceResourceTiming): string {
    if (entry.initiatorType === "script") return "JavaScript";
    if (entry.initiatorType === "css" || entry.initiatorType === "link") return "Styles";
    if (entry.initiatorType === "img") return "Images";
    if (entry.initiatorType === "fetch" || entry.initiatorType === "xmlhttprequest") return "Fetch";
    if (entry.name.includes("/fonts/")) return "Fonts";
    return "Other";
}

function refreshPerformanceMetrics(): void {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

    if (navigation) {
        loadTime.value = navigation.loadEventEnd > 0 ? navigation.loadEventEnd - navigation.startTime : null;
        domReadyTime.value = navigation.domContentLoadedEventEnd - navigation.startTime;
        timelineItems.value = [
            { label: "DNS", value: navigation.domainLookupEnd - navigation.domainLookupStart },
            { label: "Connect", value: navigation.connectEnd - navigation.connectStart },
            { label: "Request", value: navigation.responseStart - navigation.requestStart },
            { label: "Response", value: navigation.responseEnd - navigation.responseStart },
            { label: "DOM", value: navigation.domContentLoadedEventEnd - navigation.responseEnd },
            { label: "Load", value: navigation.loadEventEnd - navigation.domContentLoadedEventEnd },
        ].filter((item) => Number.isFinite(item.value) && item.value >= 0);
    }

    const paints = performance.getEntriesByType("paint");
    firstPaintTime.value = paints.find((entry) => entry.name === "first-paint")?.startTime ?? null;
    firstContentfulPaintTime.value = paints.find((entry) => entry.name === "first-contentful-paint")?.startTime ?? null;

    const groupedResources = new Map<string, ResourceStat>();
    performance.getEntriesByType("resource").forEach((entry) => {
        const resource = entry as PerformanceResourceTiming;
        const kind = getResourceKind(resource);
        const current = groupedResources.get(kind) ?? { label: kind, count: 0, duration: 0 };
        current.count += 1;
        current.duration += resource.duration;
        groupedResources.set(kind, current);
    });

    resourceStats.value = Array.from(groupedResources.values())
        .sort((left, right) => right.duration - left.duration);

    const memory = (performance as Performance & {
        memory?: { usedJSHeapSize: number };
    }).memory;

    memoryUsage.value = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : null;
}

function trackFrames(frameTime: number): void {
    if (lastFrameTime > 0) {
        const delta = frameTime - lastFrameTime;
        const fps = delta > 0 ? Math.min(60, Math.round(1000 / delta)) : 0;
        fpsSamples.value = [...fpsSamples.value.slice(1), fps];
    }
    lastFrameTime = frameTime;
    animationFrameId = requestAnimationFrame(trackFrames);
}

/* ----------------------------------------------------------------------------
 * Live platform monitoring (real backend) with sample fallback.
 * ------------------------------------------------------------------------- */

type ServiceTone = "up" | "warn" | "down";

const monitoring = useMonitoringStore();

// Section data sources: "live" (cached backend snapshot) or "sample" (backend unreachable).
const healthLive = computed(() => monitoring.healthAvailable && monitoring.health !== null);
const serverLive = computed(() => healthLive.value && monitoring.health?.server !== undefined);

function statusTone(status: string): ServiceTone {
    const value = status.toLowerCase();
    if (value === "down" || value === "offline" || value === "error") return "down";
    if (value === "degraded" || value === "warning" || value === "unknown") return "warn";
    return "up";
}

function statusLabel(status: string): string {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatUptime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return "--";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours.toString().padStart(2, "0")}h`;
    if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
    return `${minutes}m`;
}

function formatMbps(kbps: number): string {
    if (!Number.isFinite(kbps)) return "0";
    if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
    return `${Math.round(kbps)} kbps`;
}

function formatClock(value: Date): string {
    return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatRelative(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// Deterministic pseudo-random series for the sample/fallback charts.
function makeSeries(length: number, seed: number, base: number, swing: number, floor = 0, ceil = 100): number[] {
    const out: number[] = [];
    let value = base;
    let state = seed;
    for (let index = 0; index < length; index += 1) {
        state = (state * 9301 + 49297) % 233280;
        const noise = state / 233280;
        value += (noise - 0.5) * swing;
        value = Math.min(ceil, Math.max(floor, value));
        out.push(Math.round(value * 10) / 10);
    }
    return out;
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((total, item) => total + item, 0) / values.length;
}

function last(values: number[]): number {
    return values[values.length - 1] ?? 0;
}

// SVG sparkline helpers (100 x 36 viewBox).
const SPARK_W = 100;
const SPARK_H = 36;

function sparkPoints(samples: number[], max: number): string {
    const ceil = Math.max(max, 1);
    if (samples.length === 0) return `0,${SPARK_H} ${SPARK_W},${SPARK_H}`;
    return samples
        .map((sample, index) => {
            const x = samples.length > 1 ? (index / (samples.length - 1)) * SPARK_W : 0;
            const y = SPARK_H - Math.min(1, sample / ceil) * SPARK_H;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ");
}

function sparkArea(samples: number[], max: number): string {
    return `0,${SPARK_H} ${sparkPoints(samples, max)} ${SPARK_W},${SPARK_H}`;
}

// ── Sample fallback datasets ──────────────────────────────────────────────
// Static seed shapes for the sample/fallback charts.
const cpuSeed = makeSeries(40, 1187, 32, 22, 6, 92);
const ramSeed = makeSeries(40, 4231, 61, 10, 40, 86);
const netInSeed = makeSeries(40, 7741, 48, 36, 4, 100);
const netOutSeed = makeSeries(40, 9123, 30, 28, 2, 96);
const diskSeed = makeSeries(40, 3357, 47, 3, 42, 58);

// Reactive copies that scroll on an interval so the sample charts feel alive.
// Decorative only — every panel that uses these is clearly badged "Sample data".
const cpuSeriesSample = ref<number[]>([...cpuSeed]);
const ramSeriesSample = ref<number[]>([...ramSeed]);
const netInSeriesSample = ref<number[]>([...netInSeed]);
const netOutSeriesSample = ref<number[]>([...netOutSeed]);
const diskSeriesSample = ref<number[]>([...diskSeed]);

const animatedSampleSeries: { series: typeof cpuSeriesSample; swing: number; floor: number; ceil: number }[] = [
    { series: cpuSeriesSample, swing: 16, floor: 6, ceil: 95 },
    { series: ramSeriesSample, swing: 6, floor: 40, ceil: 88 },
    { series: netInSeriesSample, swing: 32, floor: 2, ceil: 100 },
    { series: netOutSeriesSample, swing: 26, floor: 2, ceil: 98 },
    { series: diskSeriesSample, swing: 1.6, floor: 42, ceil: 60 },
];

// Random-walk each sample series one step (drop oldest, append a new point).
function stepSampleSeries(): void {
    for (const { series, swing, floor, ceil } of animatedSampleSeries) {
        const current = series.value;
        const previous = current[current.length - 1] ?? floor;
        const next = Math.min(ceil, Math.max(floor, previous + (Math.random() - 0.5) * swing));
        series.value = [...current.slice(1), Math.round(next * 10) / 10];
    }
}

const sampleServiceRows = [
    { name: "Auth", description: "Supabase sign-in & session", tone: "up" as ServiceTone, status: "Operational", latency: "58 ms" },
    { name: "Wallet / top-up", description: "TrueMoney voucher redeem", tone: "up" as ServiceTone, status: "Operational", latency: "120 ms" },
    { name: "Bot Config API", description: "Catalog & runtime config", tone: "up" as ServiceTone, status: "Operational", latency: "44 ms" },
    { name: "Runtime control", description: "Start / stop / restart bots", tone: "warn" as ServiceTone, status: "Degraded", latency: "640 ms" },
    { name: "Discord API reach", description: "Gateway & REST reachability", tone: "up" as ServiceTone, status: "Operational", latency: "210 ms" },
];

const sampleChecks = [
    { time: "2 min ago", service: "Bot Config API", message: "Health check passed (44 ms)", tone: "up" as ServiceTone },
    { time: "11 min ago", service: "Runtime control", message: "Elevated latency — restart queue backed up", tone: "warn" as ServiceTone },
    { time: "26 min ago", service: "Wallet / top-up", message: "Voucher redeem check passed", tone: "up" as ServiceTone },
    { time: "48 min ago", service: "Auth", message: "Session refresh check passed", tone: "up" as ServiceTone },
];

const sampleServerInfo = [
    { label: "Provider", value: "Backend Platform VPS" },
    { label: "Runtime", value: "Java 21 · Spring Boot" },
    { label: "System uptime", value: "14d 06h" },
];

// ── Overview ──────────────────────────────────────────────────────────────
interface OverviewCard {
    label: string;
    status: string;
    tone: ServiceTone;
    detail: string;
}

const overviewCards = computed<OverviewCard[]>(() => {
    const h = monitoring.health;
    if (!healthLive.value || !h) {
        return [
            { label: "Backend (VPS)", status: "Online", tone: "up", detail: "API 42 ms · up 14d · sample" },
            { label: "Shop Services", status: "Degraded", tone: "warn", detail: "5 / 6 services healthy · sample" },
            { label: "Runtime", status: "Operational", tone: "up", detail: "bot orchestrator ready · sample" },
        ];
    }
    const services = h.shop.services ?? [];
    const healthy = services.filter((s) => statusTone(s.status) === "up").length;
    return [
        {
            label: "Backend (VPS)",
            status: statusLabel(h.backend.status),
            tone: statusTone(h.backend.status),
            detail: `API ${h.backend.latencyMs ?? "--"} ms · up ${formatUptime(h.backend.uptimeSeconds)} · v${h.backend.version}`,
        },
        {
            label: "Shop Services",
            status: statusLabel(h.shop.status),
            tone: statusTone(h.shop.status),
            detail: `${healthy} / ${services.length} services healthy`,
        },
        {
            label: "Runtime",
            status: statusLabel(services.find((service) => service.name === "Runtime control")?.status ?? "unknown"),
            tone: statusTone(services.find((service) => service.name === "Runtime control")?.status ?? "unknown"),
            detail: "bot orchestrator from cached backend snapshot",
        },
    ];
});

const lastCheckedLabel = computed(() => {
    const h = monitoring.health;
    if (healthLive.value && h) return formatClock(new Date(h.checkedAt));
    return formatClock(localSnapshotAt.value);
});

const localSnapshotAt = ref(new Date());

// ── Shop service rows (live) ──────────────────────────────────────────────
const shopServices = computed(() => {
    const h = monitoring.health;
    if (!healthLive.value || !h) {
        return sampleServiceRows;
    }
    return h.shop.services.map((service) => ({
        name: service.name,
        description: "live backend probe",
        tone: statusTone(service.status),
        status: statusLabel(service.status),
        latency: service.latencyMs === null ? "--" : `${service.latencyMs} ms`,
    }));
});

const recentCheckRows = computed(() => {
    if (!healthLive.value) return sampleChecks;
    return shopServices.value.map((service) => ({
        time: formatRelative(monitoring.health?.checkedAt ?? new Date().toISOString()),
        service: service.name,
        message: `${service.status}${service.latency === "--" ? "" : ` · ${service.latency}`}`,
        tone: service.tone,
    }));
});

// ── Backend Platform server snapshot ──────────────────────────────────────
function flatSeries(value: number | null | undefined): number[] {
    const next = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return Array.from({ length: 24 }, () => next);
}

interface VpsCard {
    key: string;
    label: string;
    value: string;
    caption: string;
    accent: string;
    samples: number[];
    max: number;
}

const vpsCards = computed<VpsCard[]>(() => {
    const server = monitoring.health?.server;
    if (serverLive.value && server) {
        const netIn = server.networkInKbps;
        const netOut = server.networkOutKbps;
        const netMax = Math.max(netIn, netOut, 1);
        return [
            {
                key: "cpu",
                label: "CPU usage",
                value: server.cpuPercent === null ? "--" : `${Math.round(server.cpuPercent)}%`,
                caption: `${server.cpuCores} cores · cached server snapshot`,
                accent: "var(--color-status-info)",
                samples: flatSeries(server.cpuPercent),
                max: 100,
            },
            {
                key: "ram",
                label: "RAM usage",
                value: server.ramPercent === null ? "--" : `${Math.round(server.ramPercent)}%`,
                caption: "cached server snapshot",
                accent: "var(--color-data-pastel-7)",
                samples: flatSeries(server.ramPercent),
                max: 100,
            },
            {
                key: "disk",
                label: "Disk usage",
                value: server.diskPercent === null ? "--" : `${Math.round(server.diskPercent)}%`,
                caption: "cached server snapshot",
                accent: "var(--color-data-pastel-3)",
                samples: flatSeries(server.diskPercent),
                max: 100,
            },
            {
                key: "net",
                label: "Network I/O",
                value: `${formatMbps(netIn)} in`,
                caption: `out ${formatMbps(netOut)} · cached server snapshot`,
                accent: "var(--color-status-success)",
                samples: flatSeries(netIn),
                max: netMax,
            },
        ];
    }
    // Sample fallback
    return [
        {
            key: "cpu",
            label: "CPU usage",
            value: `${Math.round(last(cpuSeriesSample.value))}%`,
            caption: `avg ${Math.round(average(cpuSeriesSample.value))}% · peak ${Math.round(Math.max(...cpuSeriesSample.value))}%`,
            accent: "var(--color-status-info)",
            samples: cpuSeriesSample.value,
            max: 100,
        },
        {
            key: "ram",
            label: "RAM usage",
            value: `${Math.round(last(ramSeriesSample.value))}%`,
            caption: `~${(last(ramSeriesSample.value) / 100 * 4).toFixed(1)} GB of 4 GB`,
            accent: "var(--color-data-pastel-7)",
            samples: ramSeriesSample.value,
            max: 100,
        },
        {
            key: "disk",
            label: "Disk usage",
            value: `${Math.round(last(diskSeriesSample.value))}%`,
            caption: `~${(last(diskSeriesSample.value) / 100 * 80).toFixed(0)} GB of 80 GB SSD`,
            accent: "var(--color-data-pastel-3)",
            samples: diskSeriesSample.value,
            max: 100,
        },
        {
            key: "net",
            label: "Network I/O",
            value: `${Math.round(last(netInSeriesSample.value))} in`,
            caption: `out ${Math.round(last(netOutSeriesSample.value))}`,
            accent: "var(--color-status-success)",
            samples: netInSeriesSample.value,
            max: 100,
        },
    ];
});

const netOutChartSeries = computed(() => {
    const server = monitoring.health?.server;
    if (serverLive.value && server) return flatSeries(server.networkOutKbps);
    return netOutSeriesSample.value;
});

const serverInfo = computed(() => {
    const h = monitoring.health;
    const server = h?.server;
    if (serverLive.value && h && server) {
        return [
            { label: "Platform", value: "Backend Platform VPS" },
            { label: "Runtime", value: "Java 21 · Spring Boot" },
            { label: "App version", value: `v${h.backend.version}` },
            { label: "System uptime", value: formatUptime(server.uptimeSeconds) },
            { label: "CPU cores", value: String(server.cpuCores) },
            { label: "Data source", value: "cached health snapshot" },
        ];
    }
    return sampleServerInfo;
});

// Mode labels for the data-source badges.
const overviewBadge = computed(() => (healthLive.value ? "live" : "sample"));
const shopBadge = computed(() => (healthLive.value ? "live" : "sample"));
const backendBadge = computed(() => (serverLive.value ? "live" : "sample"));

onMounted(() => {
    refreshPerformanceMetrics();
    localSnapshotAt.value = new Date();

    sessionTimer = setInterval(() => {
        sessionSeconds.value = Math.floor((Date.now() - sessionStartedAt) / 1000);
        // Keep the "last checked" clock ticking while showing the local snapshot.
        if (!healthLive.value) localSnapshotAt.value = new Date();
    }, 1000);

    metricsTimer = setInterval(refreshPerformanceMetrics, 2500);
    animationFrameId = requestAnimationFrame(trackFrames);

    // Scroll the sample charts for a realtime feel (skip when reduced-motion).
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReducedMotion) {
        sampleTimer = setInterval(stepSampleSeries, 1200);
    }

    // Live platform monitoring — best effort; falls back to sample on failure.
    void monitoring.fetchPublicHealth();

    healthTimer = setInterval(() => {
        void monitoring.fetchPublicHealth();
    }, 30000);
});

onUnmounted(() => {
    if (sessionTimer) clearInterval(sessionTimer);
    if (metricsTimer) clearInterval(metricsTimer);
    if (healthTimer) clearInterval(healthTimer);
    if (sampleTimer) clearInterval(sampleTimer);
    cancelAnimationFrame(animationFrameId);
});

const toneDot: Record<ServiceTone, string> = {
    up: "dotUp",
    warn: "dotWarn",
    down: "dotDown",
};

const toneText: Record<ServiceTone, string> = {
    up: "statusUp",
    warn: "statusWarn",
    down: "statusDown",
};
</script>

<template>
    <main :class="$style.page">
        <header :class="$style.topbar">
            <div :class="$style.topbarInner">
                <div :class="$style.topbarHead">
                    <p class="type-overline-sb text-main-primary">Platform monitoring</p>
                    <h1 id="performance-heading" class="type-h2-section-title-sb">Fujipp platform status</h1>
                </div>
                <div :class="$style.checked">
                    <span
                        :class="[$style.dot, $style[toneDot[healthLive ? statusTone(monitoring.health?.status ?? 'unknown') : 'up']]]"
                        aria-hidden="true"
                    />
                    <div>
                        <strong class="type-caption-sb">
                            {{ healthLive ? "Live backend connected" : "All core systems reporting" }}
                        </strong>
                        <span class="type-overline-r">
                            Last checked {{ lastCheckedLabel }} ·
                            {{ healthLive ? "backend snapshot" : "your browser" }}
                        </span>
                    </div>
                </div>
            </div>
        </header>

        <div :class="$style.content">
            <p :class="$style.notice" class="type-caption-r">
                <strong class="type-caption-sb text-status-info">Data sources:</strong>
                <strong class="type-caption-sb">Browser Runtime</strong> is your live session.
                <template v-if="healthLive">
                    <strong class="type-caption-sb">Overview, Backend Platform &amp; Shop</strong> are live from the
                    platform backend's cached snapshot.
                </template>
                <template v-else>
                    The platform backend is unreachable right now, so Overview / Backend / Shop panels show
                    <strong class="type-caption-sb">sample display data</strong>.
                </template>
                This page does not fetch incident history or admin database-backed metrics.
            </p>

            <!-- OVERVIEW -->
            <section :class="$style.board" aria-labelledby="overview-heading">
                <header :class="$style.boardHead">
                    <div>
                        <p class="type-overline-sb text-main-primary">Overview</p>
                        <h2 id="overview-heading" class="type-h3-card-title-sb">System health at a glance</h2>
                    </div>
                    <span
                        :class="[$style.tag, overviewBadge === 'live' ? $style.tagLive : $style.tagSample]"
                        class="type-overline-sb"
                    >
                        {{ overviewBadge === "live" ? "Live data" : "Sample data" }}
                    </span>
                </header>

                <div :class="$style.overviewGrid">
                    <article v-for="card in overviewCards" :key="card.label" :class="$style.overviewCard">
                        <span class="type-overline-r">{{ card.label }}</span>
                        <div :class="$style.overviewStatus">
                            <span :class="[$style.dot, $style[toneDot[card.tone]]]" aria-hidden="true" />
                            <strong class="type-h3-card-title-sb" :class="$style[toneText[card.tone]]">
                                {{ card.status }}
                            </strong>
                        </div>
                        <p class="type-caption-r">{{ card.detail }}</p>
                    </article>

                    <article :class="$style.overviewCard">
                        <span class="type-overline-r">Last checked</span>
                        <div :class="$style.overviewStatus">
                            <span :class="[$style.dot, $style[toneDot.up]]" aria-hidden="true" />
                            <strong class="type-h3-card-title-sb">{{ lastCheckedLabel }}</strong>
                        </div>
                        <p class="type-caption-r">
                            {{ healthLive ? "live · backend snapshot" : "sample · rendered in your browser" }}
                        </p>
                    </article>
                </div>
            </section>

            <!-- BROWSER RUNTIME (LIVE) -->
            <section :class="$style.board" aria-labelledby="runtime-heading">
                <header :class="$style.boardHead">
                    <div>
                        <p class="type-overline-sb text-main-primary">Browser Runtime</p>
                        <h2 id="runtime-heading" class="type-h3-card-title-sb">How this page runs for you</h2>
                    </div>
                    <span :class="[$style.tag, $style.tagLive]" class="type-overline-sb">Live browser data</span>
                </header>

                <div :class="$style.metricGrid">
                    <article v-for="metric in runtimeMetrics" :key="metric.label" :class="$style.metricCard">
                        <span class="type-overline-r">{{ metric.label }}</span>
                        <strong class="type-h2-section-title-sb">{{ metric.value }}</strong>
                        <p class="type-caption-r">{{ metric.detail }}</p>
                    </article>
                </div>

                <section :class="$style.chartPanel" aria-labelledby="frame-heading">
                    <header :class="$style.panelHeader">
                        <div>
                            <p class="type-overline-sb text-main-primary">Runtime graph</p>
                            <h3 id="frame-heading" class="type-subtitle-sb">Frame activity</h3>
                        </div>
                        <strong class="type-caption-sb">{{ currentFps }} FPS</strong>
                    </header>
                    <div :class="$style.frameChart" aria-label="Recent frame rate samples">
                        <span
                            v-for="(sample, index) in fpsSamples"
                            :key="index"
                            :style="{ height: `${Math.max(8, (sample / 60) * 100)}%` }"
                        />
                    </div>
                </section>

                <div :class="$style.splitGrid">
                    <section :class="$style.chartPanel" aria-labelledby="paint-heading">
                        <header :class="$style.panelHeader">
                            <div>
                                <p class="type-overline-sb text-main-primary">Paint</p>
                                <h3 id="paint-heading" class="type-subtitle-sb">Page milestones</h3>
                            </div>
                        </header>
                        <div :class="$style.barList">
                            <article v-for="metric in paintMetrics" :key="metric.label" :class="$style.barRow">
                                <div :class="$style.barMeta">
                                    <span class="type-caption-sb">{{ metric.label }}</span>
                                    <strong class="type-caption-sb">{{ formatMs(metric.value) }}</strong>
                                </div>
                                <div :class="$style.track">
                                    <span :style="{ width: barWidth(metric.value, maxPaintValue) }" />
                                </div>
                            </article>
                        </div>
                    </section>

                    <section :class="$style.chartPanel" aria-labelledby="timeline-heading">
                        <header :class="$style.panelHeader">
                            <div>
                                <p class="type-overline-sb text-main-primary">Navigation</p>
                                <h3 id="timeline-heading" class="type-subtitle-sb">Load timeline</h3>
                            </div>
                        </header>
                        <div :class="$style.barList">
                            <article v-for="item in timelineItems" :key="item.label" :class="$style.barRow">
                                <div :class="$style.barMeta">
                                    <span class="type-caption-sb">{{ item.label }}</span>
                                    <strong class="type-caption-sb">{{ formatMs(item.value) }}</strong>
                                </div>
                                <div :class="$style.track">
                                    <span :style="{ width: barWidth(item.value, maxTimelineValue) }" />
                                </div>
                            </article>
                        </div>
                    </section>
                </div>

                <section :class="$style.chartPanel" aria-labelledby="resources-heading">
                    <header :class="$style.panelHeader">
                        <div>
                            <p class="type-overline-sb text-main-primary">Resources</p>
                            <h3 id="resources-heading" class="type-subtitle-sb">
                                What this page loaded
                            </h3>
                        </div>
                    </header>
                    <div :class="$style.resourceGrid">
                        <article v-for="resource in resourceStats" :key="resource.label" :class="$style.resourceCard">
                            <div :class="$style.resourceMeta">
                                <span class="type-caption-sb">{{ resource.label }}</span>
                                <strong class="type-h3-card-title-sb">{{ resource.count }}</strong>
                            </div>
                            <div :class="$style.track">
                                <span :style="{ width: barWidth(resource.duration, maxResourceDuration) }" />
                            </div>
                            <p class="type-overline-r">
                                {{ formatMs(resource.duration) }} total observed duration
                            </p>
                        </article>
                    </div>
                </section>
            </section>

            <!-- BACKEND PLATFORM MONITORING (cached public snapshot, no DB metrics) -->
            <section :class="$style.board" aria-labelledby="backend-heading">
                <header :class="$style.boardHead">
                    <div>
                        <p class="type-overline-sb text-main-primary">Backend Platform</p>
                        <h2 id="backend-heading" class="type-h3-card-title-sb">VPS server &amp; runtime</h2>
                    </div>
                    <span
                        :class="[$style.tag, backendBadge === 'live' ? $style.tagLive : $style.tagSample]"
                        class="type-overline-sb"
                    >
                        {{ backendBadge === "live" ? "Cached live data" : "Sample data" }}
                    </span>
                </header>

                <div :class="$style.metricChartGrid">
                    <section
                        v-for="metric in vpsCards"
                        :key="metric.key"
                        :class="$style.chartPanel"
                        :style="{ '--accent': metric.accent }"
                    >
                        <header :class="$style.panelHeader">
                            <div>
                                <p class="type-overline-sb text-main-primary">{{ metric.label }}</p>
                                <strong class="type-h3-card-title-sb">{{ metric.value }}</strong>
                            </div>
                        </header>
                        <svg :class="$style.spark" viewBox="0 0 100 36" preserveAspectRatio="none" role="img"
                            :aria-label="`${metric.label} over time`">
                            <polygon :class="$style.sparkArea" :points="sparkArea(metric.samples, metric.max)" />
                            <polyline :class="$style.sparkLine" :points="sparkPoints(metric.samples, metric.max)" />
                            <polyline
                                v-if="metric.key === 'net'"
                                :class="$style.sparkLine"
                                :style="{ stroke: 'var(--color-status-warning)' }"
                                :points="sparkPoints(netOutChartSeries, metric.max)"
                            />
                        </svg>
                        <p class="type-overline-r">{{ metric.caption }}</p>
                    </section>
                </div>

                <section :class="$style.chartPanel">
                    <header :class="$style.panelHeader">
                        <div>
                            <p class="type-overline-sb text-main-primary">Server info</p>
                            <h3 class="type-subtitle-sb">
                                {{ serverLive ? "Runtime environment" : "Runtime environment (sample)" }}
                            </h3>
                        </div>
                    </header>
                    <dl :class="$style.infoGrid">
                        <div v-for="info in serverInfo" :key="info.label" :class="$style.infoRow">
                            <dt class="type-overline-r">{{ info.label }}</dt>
                            <dd class="type-caption-sb">{{ info.value }}</dd>
                        </div>
                    </dl>
                </section>
            </section>

            <!-- SHOP SERVICE HEALTH -->
            <section :class="$style.board" aria-labelledby="shop-heading">
                <header :class="$style.boardHead">
                    <div>
                        <p class="type-overline-sb text-main-primary">Shop Service Health</p>
                        <h2 id="shop-heading" class="type-h3-card-title-sb">Shop &amp; bot operations</h2>
                    </div>
                    <span
                        :class="[$style.tag, shopBadge === 'live' ? $style.tagLive : $style.tagSample]"
                        class="type-overline-sb"
                    >
                        {{ shopBadge === "live" ? "Live data" : "Sample data" }}
                    </span>
                </header>

                <section :class="$style.chartPanel">
                    <ul :class="$style.serviceList">
                        <li v-for="service in shopServices" :key="service.name" :class="$style.serviceRow">
                            <span :class="[$style.dot, $style[toneDot[service.tone]]]" aria-hidden="true" />
                            <div :class="$style.serviceMain">
                                <strong class="type-caption-sb">{{ service.name }}</strong>
                                <span class="type-overline-r">{{ service.description }}</span>
                            </div>
                            <span class="type-overline-r" :class="$style.serviceLatency">{{ service.latency }}</span>
                            <strong class="type-caption-sb" :class="$style[toneText[service.tone]]">
                                {{ service.status }}
                            </strong>
                        </li>
                    </ul>
                </section>

                <section :class="$style.chartPanel">
                    <header :class="$style.panelHeader">
                        <div>
                            <p class="type-overline-sb text-main-primary">Recent checks</p>
                            <h3 class="type-subtitle-sb">
                                {{ healthLive ? "Cached service snapshot" : "Latest probes (sample)" }}
                            </h3>
                        </div>
                    </header>

                    <ul :class="$style.checkList">
                        <li
                            v-for="(check, index) in recentCheckRows"
                            :key="index"
                            :class="$style.checkRow"
                        >
                            <span :class="[$style.dot, $style[toneDot[check.tone]]]" aria-hidden="true" />
                            <span class="type-overline-r" :class="$style.checkTime">{{ check.time }}</span>
                            <div :class="$style.checkMain">
                                <strong class="type-caption-sb">{{ check.service }}</strong>
                                <span class="type-overline-r">{{ check.message }}</span>
                            </div>
                        </li>
                    </ul>
                </section>
            </section>
        </div>
    </main>
    <AppFooter />
</template>

<style module>
.page {
    /* Page-scoped, theme-aware palette (light defaults; dark override below). */
    --perf-page: var(--color-neutral-50);
    --perf-panel: #ffffff;
    --perf-inset: var(--color-neutral-100);
    --perf-border: var(--color-input-border);
    --perf-divider: var(--color-neutral-200);
    --perf-text: var(--perf-heading);
    --perf-heading: var(--perf-heading);
    --perf-muted: var(--color-neutral-600);
    --perf-accent: var(--color-main-primary);

    min-height: 100vh;
    padding-top: var(--spacing-space-16);
    color: var(--perf-text);
    background: var(--perf-page);
    transition: background-color 300ms ease, color 300ms ease;
}

:global([data-theme="dark"]) .page {
    --perf-page: var(--color-main-section-background);
    --perf-panel: var(--perf-panel);
    --perf-inset: #1f1f1f;
    --perf-border: var(--perf-border);
    --perf-divider: var(--perf-divider);
    --perf-text: var(--perf-text);
    --perf-heading: var(--perf-heading);
    --perf-muted: #9aa6b4;
    --perf-accent: var(--color-main-primary);
}

/* Smooth theme cross-fade across the whole dashboard (zero-specificity). */
.page :where(section, article, header, li, dl, div, p, span, strong, h1, h2, h3, dt, dd, svg) {
    transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease;
}

.topbar {
    border-bottom: 1px solid var(--perf-divider);
    background: var(--perf-panel);
}

.topbarInner,
.content {
    box-sizing: border-box;
    width: min(100%, var(--container-7xl));
    margin: 0 auto;
    padding-inline: var(--spacing-space-6);
}

.topbarInner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-6);
    padding-top: var(--spacing-space-8);
    padding-bottom: var(--spacing-space-8);
}

.topbarHead {
    display: grid;
    gap: var(--spacing-space-2);
}

.topbarHead h1 {
    color: var(--perf-text);
}

.checked {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--perf-divider);
    border-radius: var(--radius-full);
}

.checked div {
    display: grid;
    gap: var(--spacing-space-1);
}

.checked strong {
    color: var(--perf-text);
}

.checked span:last-child {
    color: var(--perf-text);
    opacity: 0.7;
}

.content {
    display: grid;
    gap: var(--spacing-space-10);
    padding-top: var(--spacing-space-10);
    padding-bottom: var(--spacing-space-20);
}

.notice {
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--perf-divider);
    border-radius: var(--radius-lg);
    background: var(--perf-panel);
    color: var(--perf-text);
}

.notice strong {
    color: var(--perf-text);
}

.empty {
    padding: var(--spacing-space-4);
    color: var(--perf-text);
    opacity: 0.7;
}

.board {
    display: grid;
    gap: var(--spacing-space-5);
}

.boardHead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.boardHead div {
    display: grid;
    gap: var(--spacing-space-2);
}

.boardHead h2 {
    color: var(--perf-heading);
}

.tag {
    flex-shrink: 0;
    padding: var(--spacing-space-1) var(--spacing-space-3);
    border-radius: var(--radius-full);
    border: 1px solid transparent;
}

.tagLive {
    color: var(--color-status-success);
    border-color: color-mix(in srgb, var(--color-status-success) 55%, transparent);
    background: color-mix(in srgb, var(--color-status-success) 12%, transparent);
}

.tagLive::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: var(--spacing-space-2);
    border-radius: var(--radius-full);
    background: var(--color-status-success);
    vertical-align: middle;
    animation: perfPulse 1.6s ease-in-out infinite;
}

@keyframes perfPulse {
    0%, 100% {
        opacity: 1;
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-status-success) 55%, transparent);
    }
    50% {
        opacity: 0.45;
        box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-status-success) 0%, transparent);
    }
}

@media (prefers-reduced-motion: reduce) {
    .tagLive::before {
        animation: none;
    }
}

.tagSample {
    color: var(--perf-text);
    border-color: var(--perf-divider);
    background: var(--perf-panel);
}

.dot {
    display: inline-block;
    width: var(--spacing-space-3);
    height: var(--spacing-space-3);
    border-radius: var(--radius-full);
    flex-shrink: 0;
}

.dotUp {
    background: var(--color-status-success);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-status-success) 22%, transparent);
}

.dotWarn {
    background: var(--color-status-warning);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-status-warning) 22%, transparent);
}

.dotDown {
    background: var(--color-status-error);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-status-error) 22%, transparent);
}

.statusUp {
    color: var(--color-status-success);
}

.statusWarn {
    color: var(--color-status-warning);
}

.statusDown {
    color: var(--color-status-error);
}

.overviewGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.overviewCard {
    display: grid;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-5);
    border: 1px solid var(--perf-border);
    border-radius: var(--radius-lg);
    background: var(--perf-panel);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--perf-text) 5%, transparent);
    transition: background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
}

.overviewCard:hover {
    border-color: color-mix(in srgb, var(--perf-accent) 45%, var(--perf-border));
    box-shadow: 0 10px 28px color-mix(in srgb, var(--perf-accent) 16%, transparent);
}

.overviewCard span,
.overviewCard p {
    color: var(--perf-muted);
}

.overviewStatus {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
}

.metricCard,
.chartPanel,
.resourceCard,
.statCard {
    border: 1px solid var(--perf-border);
    border-radius: var(--radius-lg);
    background: var(--perf-panel);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--perf-text) 5%, transparent);
    transition: background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
}

.chartPanel:hover,
.metricCard:hover,
.statCard:hover {
    border-color: color-mix(in srgb, var(--perf-accent) 40%, var(--perf-border));
    box-shadow: 0 10px 28px color-mix(in srgb, var(--perf-accent) 14%, transparent);
}

.metricGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.metricCard {
    display: grid;
    gap: var(--spacing-space-3);
    min-height: 11rem;
    padding: var(--spacing-space-5);
}

.metricCard span,
.metricCard p {
    color: var(--perf-muted);
}

.metricCard strong {
    color: var(--perf-heading);
}

.panelHeader strong {
    color: var(--perf-text);
}

.splitGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.chartPanel {
    display: grid;
    gap: var(--spacing-space-5);
    padding: var(--spacing-space-6);
}

.panelHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.panelHeader div {
    display: grid;
    gap: var(--spacing-space-2);
}

.panelHeader strong {
    padding: var(--spacing-space-2) var(--spacing-space-3);
    border: 1px solid var(--perf-divider);
    border-radius: var(--radius-full);
}

.frameChart {
    display: grid;
    grid-template-columns: repeat(28, minmax(0, 1fr));
    align-items: end;
    gap: var(--spacing-space-2);
    height: 16rem;
    padding: var(--spacing-space-4);
    border: 1px solid var(--perf-divider);
    border-radius: var(--radius-lg);
    background: var(--perf-inset);
}

.frameChart span {
    display: block;
    min-height: var(--spacing-space-2);
    border-radius: var(--radius-full) var(--radius-full) 0 0;
    background: linear-gradient(
        to top,
        color-mix(in srgb, var(--perf-accent) 55%, transparent),
        var(--perf-accent)
    );
    transition: height 150ms ease;
}

.barList {
    display: grid;
    gap: var(--spacing-space-4);
}

.barRow,
.resourceCard {
    display: grid;
    gap: var(--spacing-space-3);
}

.barMeta,
.resourceMeta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-4);
}

.barMeta span,
.resourceMeta span {
    color: var(--perf-muted);
}

.barMeta strong,
.resourceMeta strong {
    color: var(--perf-heading);
}

.track {
    height: var(--spacing-space-3);
    overflow: hidden;
    border-radius: var(--radius-full);
    background: var(--perf-inset);
}

.track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--perf-accent) 60%, transparent),
        var(--perf-accent)
    );
    transition: width 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.resourceGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.resourceCard {
    padding: var(--spacing-space-5);
}

.resourceCard p {
    color: var(--perf-muted);
}

.statGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.statCard {
    display: grid;
    gap: var(--spacing-space-2);
    padding: var(--spacing-space-5);
}

.statCard span,
.statCard p {
    color: var(--perf-muted);
}

.statCard strong {
    color: var(--perf-heading);
}

.spark {
    width: 100%;
    height: 8rem;
    --accent: var(--color-main-primary);
}

.sparkLine {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.75;
    stroke-linejoin: round;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent) 45%, transparent));
}

.sparkArea {
    fill: var(--accent);
    opacity: 0.16;
    stroke: none;
}

.metricChartGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-space-4);
}

.ribbon {
    display: grid;
    grid-template-columns: repeat(45, minmax(0, 1fr));
    gap: var(--spacing-space-1);
}

.ribbonDot {
    height: var(--spacing-space-6);
    border-radius: var(--radius-sm);
}

.infoGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-space-4);
    margin: 0;
}

.infoRow {
    display: grid;
    gap: var(--spacing-space-1);
    padding: var(--spacing-space-4);
    border: 1px solid var(--perf-divider);
    border-radius: var(--radius-md);
    background: var(--perf-inset);
}

.infoRow dt {
    color: var(--perf-muted);
}

.infoRow dd {
    margin: 0;
    color: var(--perf-heading);
}

.serviceList,
.checkList {
    display: grid;
    gap: var(--spacing-space-1);
    margin: 0;
    padding: 0;
    list-style: none;
}

.serviceRow {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-4);
    border-bottom: 1px solid var(--perf-divider);
}

.serviceRow:last-child {
    border-bottom: none;
}

.serviceMain,
.checkMain {
    display: grid;
    gap: var(--spacing-space-1);
}

.serviceMain span,
.checkMain span {
    color: var(--perf-muted);
}

.serviceLatency {
    color: var(--perf-muted);
}

.checkRow {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border-bottom: 1px solid var(--perf-divider);
}

.checkRow:last-child {
    border-bottom: none;
}

.checkTime {
    color: var(--perf-muted);
    min-width: 5rem;
}

@media (max-width: 1080px) {
    .overviewGrid,
    .statGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .metricGrid,
    .resourceGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 820px) {
    .topbarInner {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-space-4);
    }

    .splitGrid,
    .metricGrid,
    .resourceGrid,
    .metricChartGrid,
    .overviewGrid,
    .statGrid,
    .infoGrid {
        grid-template-columns: 1fr;
    }

    .metricCard {
        min-height: auto;
    }

    .ribbon {
        grid-template-columns: repeat(30, minmax(0, 1fr));
    }
}

@media (max-width: 640px) {
    .page {
        padding-top: var(--spacing-space-12);
    }

    .topbarInner,
    .content {
        padding-inline: var(--spacing-space-4);
    }

    .chartPanel {
        padding: var(--spacing-space-4);
    }

    .panelHeader,
    .barMeta,
    .resourceMeta {
        align-items: flex-start;
        flex-direction: column;
    }

    .serviceRow {
        grid-template-columns: auto 1fr auto;
    }

    .serviceLatency {
        display: none;
    }

    .frameChart {
        gap: var(--spacing-space-1);
        height: 12rem;
        padding: var(--spacing-space-3);
    }
}
</style>
