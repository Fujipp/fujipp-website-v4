<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { AppFooter } from "@/shared/layout";
import { useUserStore } from "@/stores";
import { useMonitoringStore } from "@/features/portfolio/stores";
import type { HealthStatus } from "@/features/portfolio/stores";

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

const userStore = useUserStore();
const monitoring = useMonitoringStore();
const isAdmin = computed(() => userStore.isAdmin);

// Section data sources: "live" (real backend), "sample" (backend unreachable),
// "restricted" (backend reachable but detailed data is admin-only).
const healthLive = computed(() => monitoring.healthAvailable && monitoring.health !== null);
const vpsLive = computed(() => monitoring.vpsAvailable && monitoring.vps !== null);

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

function severityTone(severity: string): ServiceTone {
    if (severity === "down") return "down";
    if (severity === "warning") return "warn";
    return "warn";
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

function formatGB(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 GB";
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
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
const cpuSeriesSample = makeSeries(40, 1187, 32, 22, 6, 92);
const ramSeriesSample = makeSeries(40, 4231, 61, 10, 40, 86);
const netInSeriesSample = makeSeries(40, 7741, 48, 36, 4, 100);
const netOutSeriesSample = makeSeries(40, 9123, 30, 28, 2, 96);
const diskSeriesSample = makeSeries(40, 3357, 47, 3, 42, 58);
const responseSeries = makeSeries(40, 5519, 180, 70, 96, 320);

const frontendUptime = [
    { label: "Uptime (30d)", value: "99.95%", detail: "sample target for the Rukcom-hosted frontend" },
    { label: "Avg response", value: `${Math.round(average(responseSeries))} ms`, detail: "edge response across sample checks" },
    { label: "Check interval", value: "1 min", detail: "how often a sample probe would run" },
    { label: "Last incident", value: "12d ago", detail: "sample last degraded window" },
];

const pageLoadMetrics = [
    { label: "p50 load", value: "1.24 s", detail: "sample median full page load" },
    { label: "p75 load", value: "1.91 s", detail: "sample 75th percentile" },
    { label: "p95 load", value: "3.12 s", detail: "sample 95th percentile" },
    { label: "Error rate", value: "0.04%", detail: "sample 5xx / failed responses" },
];

const uptimeRibbon: ServiceTone[] = (() => {
    const dots = makeSeries(90, 2207, 50, 100, 0, 100).map((): ServiceTone => "up");
    [21, 53, 78].forEach((index) => (dots[index] = "warn"));
    dots[64] = "down";
    return dots;
})();

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
    { label: "Provider", value: "VPS · Bangkok" },
    { label: "OS", value: "Ubuntu 22.04 LTS" },
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
            { label: "Frontend (Rukcom)", status: "Online", tone: "up", detail: "uptime 99.95% · sample" },
            { label: "Backend (VPS)", status: "Online", tone: "up", detail: "API 42 ms · up 14d · sample" },
            { label: "Shop Services", status: "Degraded", tone: "warn", detail: "5 / 6 services healthy · sample" },
        ];
    }
    const services = h.shop.services ?? [];
    const healthy = services.filter((s) => statusTone(s.status) === "up").length;
    return [
        {
            label: "Frontend (Rukcom)",
            status: "Online",
            tone: "up",
            detail: "served to your browser",
        },
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

const incidentRows = computed(() => {
    if (!healthLive.value) return null; // signal sample mode to the template
    return monitoring.incidents.map((incident) => ({
        time: formatRelative(incident.startedAt),
        service: incident.service,
        message:
            incident.status === "resolved"
                ? `${incident.title} — resolved`
                : incident.title,
        tone: severityTone(incident.severity),
    }));
});

// ── Backend (VPS) live series ─────────────────────────────────────────────
function historySeries(pick: (sample: { cpuPercent: number | null; ramPercent: number | null; diskPercent: number | null; networkInKbps: number | null; networkOutKbps: number | null }) => number | null): number[] {
    const v = monitoring.vps;
    if (!v) return [];
    return v.history.map((sample) => {
        const value = pick(sample);
        return value === null || !Number.isFinite(value) ? 0 : value;
    });
}

const cpuSeries = computed(() => (vpsLive.value ? historySeries((s) => s.cpuPercent) : cpuSeriesSample));
const ramSeries = computed(() => (vpsLive.value ? historySeries((s) => s.ramPercent) : ramSeriesSample));
const diskSeries = computed(() => (vpsLive.value ? historySeries((s) => s.diskPercent) : diskSeriesSample));
const netInSeries = computed(() => (vpsLive.value ? historySeries((s) => s.networkInKbps) : netInSeriesSample));
const netOutSeries = computed(() => (vpsLive.value ? historySeries((s) => s.networkOutKbps) : netOutSeriesSample));

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
    const v = monitoring.vps;
    if (vpsLive.value && v) {
        const netMax = Math.max(...netInSeries.value, ...netOutSeries.value, 1);
        return [
            {
                key: "cpu",
                label: "CPU usage",
                value: `${Math.round(v.cpu.currentPercent)}%`,
                caption: `avg ${Math.round(v.cpu.averagePercent)}% · peak ${Math.round(v.cpu.maxPercent)}% · ${v.cpu.cores} cores`,
                accent: "var(--color-status-info)",
                samples: cpuSeries.value,
                max: 100,
            },
            {
                key: "ram",
                label: "RAM usage",
                value: `${Math.round(v.ram.percent)}%`,
                caption: `${formatGB(v.ram.usedBytes)} of ${formatGB(v.ram.totalBytes)}`,
                accent: "var(--color-data-pastel-7)",
                samples: ramSeries.value,
                max: 100,
            },
            {
                key: "disk",
                label: "Disk usage",
                value: `${Math.round(v.disk.percent)}%`,
                caption: `${formatGB(v.disk.usedBytes)} of ${formatGB(v.disk.totalBytes)}`,
                accent: "var(--color-data-pastel-3)",
                samples: diskSeries.value,
                max: 100,
            },
            {
                key: "net",
                label: "Network I/O",
                value: `${formatMbps(v.network.inKbps)} in`,
                caption: `out ${formatMbps(v.network.outKbps)}`,
                accent: "var(--color-status-success)",
                samples: netInSeries.value,
                max: netMax,
            },
        ];
    }
    // Sample fallback
    return [
        {
            key: "cpu",
            label: "CPU usage",
            value: `${Math.round(last(cpuSeriesSample))}%`,
            caption: `avg ${Math.round(average(cpuSeriesSample))}% · peak ${Math.round(Math.max(...cpuSeriesSample))}%`,
            accent: "var(--color-status-info)",
            samples: cpuSeriesSample,
            max: 100,
        },
        {
            key: "ram",
            label: "RAM usage",
            value: `${Math.round(last(ramSeriesSample))}%`,
            caption: `~${(last(ramSeriesSample) / 100 * 4).toFixed(1)} GB of 4 GB`,
            accent: "var(--color-data-pastel-7)",
            samples: ramSeriesSample,
            max: 100,
        },
        {
            key: "disk",
            label: "Disk usage",
            value: `${Math.round(last(diskSeriesSample))}%`,
            caption: `~${(last(diskSeriesSample) / 100 * 80).toFixed(0)} GB of 80 GB SSD`,
            accent: "var(--color-data-pastel-3)",
            samples: diskSeriesSample,
            max: 100,
        },
        {
            key: "net",
            label: "Network I/O",
            value: `${Math.round(last(netInSeriesSample))} in`,
            caption: `out ${Math.round(last(netOutSeriesSample))}`,
            accent: "var(--color-status-success)",
            samples: netInSeriesSample,
            max: 100,
        },
    ];
});

const serverInfo = computed(() => {
    const v = monitoring.vps;
    if (vpsLive.value && v) {
        return [
            { label: "Operating system", value: v.server.os },
            { label: "Runtime", value: v.server.runtime },
            { label: "App version", value: `v${v.server.version}` },
            { label: "System uptime", value: formatUptime(v.systemUptimeSeconds) },
            { label: "CPU cores", value: String(v.cpu.cores) },
            { label: "JVM heap", value: `${Math.round(v.jvm.percent)}% used` },
        ];
    }
    return sampleServerInfo;
});

// Mode labels for the data-source badges.
const overviewBadge = computed(() => (healthLive.value ? "live" : "sample"));
const shopBadge = computed(() => (healthLive.value ? "live" : "sample"));
const backendBadge = computed(() => {
    if (vpsLive.value) return "live-admin";
    if (healthLive.value) return "restricted";
    return "sample";
});

onMounted(() => {
    refreshPerformanceMetrics();
    localSnapshotAt.value = new Date();

    sessionTimer = setInterval(() => {
        sessionSeconds.value = Math.floor((Date.now() - sessionStartedAt) / 1000);
    }, 1000);

    metricsTimer = setInterval(refreshPerformanceMetrics, 2500);
    animationFrameId = requestAnimationFrame(trackFrames);

    // Live platform monitoring — best effort; falls back to sample on failure.
    void monitoring.fetchPublicHealth();
    void monitoring.fetchIncidents();
    if (isAdmin.value) void monitoring.fetchVpsMetrics();

    healthTimer = setInterval(() => {
        void monitoring.fetchPublicHealth();
        void monitoring.fetchIncidents();
        if (isAdmin.value) void monitoring.fetchVpsMetrics();
    }, 30000);
});

onUnmounted(() => {
    if (sessionTimer) clearInterval(sessionTimer);
    if (metricsTimer) clearInterval(metricsTimer);
    if (healthTimer) clearInterval(healthTimer);
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
                    <strong class="type-caption-sb">Overview, Backend &amp; Shop</strong> are live from the platform
                    backend.
                    <template v-if="!vpsLive">Detailed VPS metrics (CPU/RAM/disk/network) are admin-only.</template>
                </template>
                <template v-else>
                    The platform backend is unreachable right now, so Overview / Backend / Shop panels show
                    <strong class="type-caption-sb">sample display data</strong>.
                </template>
                Frontend (Rukcom) hosting cannot be probed server-side and stays sample.
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
                            <h3 id="frame-heading" class="type-subtitle-sb text-text-secondary">Frame activity</h3>
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
                                <h3 id="paint-heading" class="type-subtitle-sb text-text-secondary">Page milestones</h3>
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
                                <h3 id="timeline-heading" class="type-subtitle-sb text-text-secondary">Load timeline</h3>
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
                            <h3 id="resources-heading" class="type-subtitle-sb text-text-secondary">
                                What this page loaded
                            </h3>
                        </div>
                    </header>
                    <div :class="$style.resourceGrid">
                        <article v-for="resource in resourceStats" :key="resource.label" :class="$style.resourceCard">
                            <div :class="$style.resourceMeta">
                                <span class="type-caption-sb text-text-secondary">{{ resource.label }}</span>
                                <strong class="type-h3-card-title-sb text-text-secondary">{{ resource.count }}</strong>
                            </div>
                            <div :class="$style.track">
                                <span :style="{ width: barWidth(resource.duration, maxResourceDuration) }" />
                            </div>
                            <p class="type-overline-r text-text-secondary">
                                {{ formatMs(resource.duration) }} total observed duration
                            </p>
                        </article>
                    </div>
                </section>
            </section>

            <!-- FRONTEND MONITORING (SAMPLE — host not server-probeable) -->
            <section :class="$style.board" aria-labelledby="frontend-heading">
                <header :class="$style.boardHead">
                    <div>
                        <p class="type-overline-sb text-main-primary">Frontend Monitoring</p>
                        <h2 id="frontend-heading" class="type-h3-card-title-sb">Rukcom hosting &amp; delivery</h2>
                    </div>
                    <span :class="[$style.tag, $style.tagSample]" class="type-overline-sb">Sample data</span>
                </header>

                <div :class="$style.statGrid">
                    <article v-for="stat in frontendUptime" :key="stat.label" :class="$style.statCard">
                        <span class="type-overline-r">{{ stat.label }}</span>
                        <strong class="type-h3-card-title-sb">{{ stat.value }}</strong>
                        <p class="type-overline-r">{{ stat.detail }}</p>
                    </article>
                </div>

                <section :class="$style.chartPanel" :style="{ '--accent': 'var(--color-status-info)' }">
                    <header :class="$style.panelHeader">
                        <div>
                            <p class="type-overline-sb text-main-primary">Response time</p>
                            <h3 class="type-subtitle-sb text-text-secondary">Edge response (sample)</h3>
                        </div>
                        <strong class="type-caption-sb">{{ Math.round(last(responseSeries)) }} ms</strong>
                    </header>
                    <svg :class="$style.spark" viewBox="0 0 100 36" preserveAspectRatio="none" role="img"
                        aria-label="Sample response time over recent checks">
                        <polygon :class="$style.sparkArea" :points="sparkArea(responseSeries, 320)" />
                        <polyline :class="$style.sparkLine" :points="sparkPoints(responseSeries, 320)" />
                    </svg>
                </section>

                <section :class="$style.chartPanel">
                    <header :class="$style.panelHeader">
                        <div>
                            <p class="type-overline-sb text-main-primary">Recent uptime</p>
                            <h3 class="type-subtitle-sb text-text-secondary">Last 90 days (sample)</h3>
                        </div>
                    </header>
                    <div :class="$style.ribbon" aria-label="Sample daily uptime, last 90 days">
                        <span
                            v-for="(day, index) in uptimeRibbon"
                            :key="index"
                            :class="[$style.ribbonDot, $style[toneDot[day]]]"
                        />
                    </div>
                </section>

                <div :class="$style.statGrid">
                    <article v-for="stat in pageLoadMetrics" :key="stat.label" :class="$style.statCard">
                        <span class="type-overline-r">{{ stat.label }}</span>
                        <strong class="type-h3-card-title-sb">{{ stat.value }}</strong>
                        <p class="type-overline-r">{{ stat.detail }}</p>
                    </article>
                </div>
            </section>

            <!-- BACKEND MONITORING (LIVE for admins, status-only for public, sample if offline) -->
            <section :class="$style.board" aria-labelledby="backend-heading">
                <header :class="$style.boardHead">
                    <div>
                        <p class="type-overline-sb text-main-primary">Backend Monitoring</p>
                        <h2 id="backend-heading" class="type-h3-card-title-sb">VPS server &amp; runtime</h2>
                    </div>
                    <span
                        :class="[$style.tag, backendBadge === 'live-admin' ? $style.tagLive : $style.tagSample]"
                        class="type-overline-sb"
                    >
                        {{ backendBadge === "live-admin" ? "Live · admin" : backendBadge === "restricted" ? "Admin-only detail" : "Sample data" }}
                    </span>
                </header>

                <p v-if="backendBadge === 'restricted'" :class="$style.notice" class="type-caption-r">
                    Detailed CPU / RAM / disk / network metrics are visible to admins only. Backend status,
                    uptime, latency, and version above are live.
                </p>

                <div v-if="backendBadge !== 'restricted'" :class="$style.metricChartGrid">
                    <section
                        v-for="metric in vpsCards"
                        :key="metric.key"
                        :class="$style.chartPanel"
                        :style="{ '--accent': metric.accent }"
                    >
                        <header :class="$style.panelHeader">
                            <div>
                                <p class="type-overline-sb text-main-primary">{{ metric.label }}</p>
                                <strong class="type-h3-card-title-sb text-text-secondary">{{ metric.value }}</strong>
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
                                :points="sparkPoints(netOutSeries, metric.max)"
                            />
                        </svg>
                        <p class="type-overline-r text-text-secondary">{{ metric.caption }}</p>
                    </section>
                </div>

                <section :class="$style.chartPanel">
                    <header :class="$style.panelHeader">
                        <div>
                            <p class="type-overline-sb text-main-primary">Server info</p>
                            <h3 class="type-subtitle-sb text-text-secondary">
                                {{ vpsLive ? "Runtime environment" : "Runtime environment (sample)" }}
                            </h3>
                        </div>
                    </header>
                    <dl :class="$style.infoGrid">
                        <div v-for="info in serverInfo" :key="info.label" :class="$style.infoRow">
                            <dt class="type-overline-r">{{ info.label }}</dt>
                            <dd class="type-caption-sb text-text-secondary">{{ info.value }}</dd>
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
                                <strong class="type-caption-sb text-text-secondary">{{ service.name }}</strong>
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
                            <p class="type-overline-sb text-main-primary">Recent incidents</p>
                            <h3 class="type-subtitle-sb text-text-secondary">
                                {{ healthLive ? "Service incident log" : "Latest probes (sample)" }}
                            </h3>
                        </div>
                    </header>

                    <p v-if="incidentRows && incidentRows.length === 0" :class="$style.empty" class="type-caption-r">
                        No incidents recorded — all monitored services have been healthy.
                    </p>

                    <ul v-else :class="$style.checkList">
                        <li
                            v-for="(check, index) in (incidentRows ?? sampleChecks)"
                            :key="index"
                            :class="$style.checkRow"
                        >
                            <span :class="[$style.dot, $style[toneDot[check.tone]]]" aria-hidden="true" />
                            <span class="type-overline-r" :class="$style.checkTime">{{ check.time }}</span>
                            <div :class="$style.checkMain">
                                <strong class="type-caption-sb text-text-secondary">{{ check.service }}</strong>
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
    min-height: 100vh;
    padding-top: var(--spacing-space-16);
    color: var(--color-text-secondary);
    background: var(--color-main-background);
}

.topbar {
    border-bottom: 1px solid var(--color-main-divider);
    background: var(--color-main-surface);
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
    color: var(--color-text-secondary);
}

.checked {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-full);
}

.checked div {
    display: grid;
    gap: var(--spacing-space-1);
}

.checked strong {
    color: var(--color-text-secondary);
}

.checked span:last-child {
    color: var(--color-text-secondary);
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
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    background: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.notice strong {
    color: var(--color-text-secondary);
}

.empty {
    padding: var(--spacing-space-4);
    color: var(--color-text-secondary);
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
    color: var(--color-text-primary);
}

.tag {
    flex-shrink: 0;
    padding: var(--spacing-space-1) var(--spacing-space-3);
    border-radius: var(--radius-full);
    border: 1px solid transparent;
}

.tagLive {
    color: var(--color-status-success);
    border-color: var(--color-status-success);
    background: color-mix(in srgb, var(--color-status-success) 12%, transparent);
}

.tagSample {
    color: var(--color-text-secondary);
    border-color: var(--color-main-divider);
    background: var(--color-main-surface);
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
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-lg);
    background: var(--color-main-surface);
}

.overviewCard span,
.overviewCard p {
    color: var(--color-text-secondary);
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
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-lg);
    background: var(--color-main-surface);
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
.metricCard strong,
.metricCard p,
.panelHeader strong {
    color: var(--color-text-secondary);
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
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-full);
}

.frameChart {
    display: grid;
    grid-template-columns: repeat(28, minmax(0, 1fr));
    align-items: end;
    gap: var(--spacing-space-2);
    height: 16rem;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    background: var(--color-main-background);
}

.frameChart span {
    display: block;
    min-height: var(--spacing-space-2);
    border-radius: var(--radius-full) var(--radius-full) 0 0;
    background: var(--color-main-primary);
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
.barMeta strong,
.resourceMeta span,
.resourceMeta strong {
    color: var(--color-text-secondary);
}

.track {
    height: var(--spacing-space-3);
    overflow: hidden;
    border-radius: var(--radius-full);
    background: var(--color-main-background);
}

.track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--color-main-primary);
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
    color: var(--color-text-secondary);
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
.statCard strong,
.statCard p {
    color: var(--color-text-secondary);
}

.statCard p {
    opacity: 0.7;
}

.spark {
    width: 100%;
    height: 8rem;
    --accent: var(--color-main-primary);
}

.sparkLine {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.5;
    stroke-linejoin: round;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
}

.sparkArea {
    fill: var(--accent);
    opacity: 0.14;
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
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-md);
    background: var(--color-main-background);
}

.infoRow dt {
    color: var(--color-text-secondary);
    opacity: 0.7;
}

.infoRow dd {
    margin: 0;
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
    border-bottom: 1px solid var(--color-main-divider);
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
    color: var(--color-text-secondary);
    opacity: 0.7;
}

.serviceLatency {
    color: var(--color-text-secondary);
    opacity: 0.8;
}

.checkRow {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border-bottom: 1px solid var(--color-main-divider);
}

.checkRow:last-child {
    border-bottom: none;
}

.checkTime {
    color: var(--color-text-secondary);
    opacity: 0.7;
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
