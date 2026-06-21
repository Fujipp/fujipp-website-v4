import { ref } from "vue";
import { defineStore } from "pinia";
import { API_BASE_URL } from "@/config";
import { useUserStore } from "@/stores";

/**
 * Platform monitoring client for the /performance dashboard.
 *
 * - Public health + incidents come from the unauthenticated `/api/public/**`
 *   endpoints (served from the backend's cached probe snapshot).
 * - Detailed VPS metrics come from `/api/admin/health/vps` and are only fetched
 *   for ADMIN users; the backend enforces the role regardless.
 *
 * Every fetch is best-effort: when the backend is unreachable the view falls back
 * to clearly-labelled sample data, so the page still renders during local frontend
 * work or a backend outage.
 */

export type HealthStatus =
    | "online"
    | "operational"
    | "degraded"
    | "down"
    | "offline"
    | "unknown";

export interface ServiceHealth {
    name: string;
    status: HealthStatus;
    latencyMs: number | null;
}

export interface PublicHealth {
    status: HealthStatus;
    checkedAt: string;
    backend: { status: string; uptimeSeconds: number; latencyMs: number | null; version: string };
    frontend: { status: string; note: string };
    shop: { status: HealthStatus; services: ServiceHealth[] };
}

export interface Incident {
    id: string;
    service: string;
    severity: "info" | "warning" | "down";
    title: string;
    status: "open" | "resolved";
    startedAt: string;
    resolvedAt: string | null;
}

export interface VpsSample {
    at: string;
    cpuPercent: number | null;
    ramPercent: number | null;
    diskPercent: number | null;
    networkInKbps: number | null;
    networkOutKbps: number | null;
    latencyMs: number | null;
    status: string;
}

export interface VpsMetrics {
    checkedAt: string;
    systemUptimeSeconds: number;
    cpu: { currentPercent: number; averagePercent: number; maxPercent: number; cores: number };
    ram: { usedBytes: number; totalBytes: number; percent: number };
    disk: { usedBytes: number; totalBytes: number; percent: number };
    network: { inKbps: number; outKbps: number };
    jvm: { usedHeapBytes: number; maxHeapBytes: number; percent: number };
    server: { os: string; runtime: string; version: string };
    history: VpsSample[];
}

export const useMonitoringStore = defineStore("monitoring", () => {
    const health = ref<PublicHealth | null>(null);
    const incidents = ref<Incident[]>([]);
    const vps = ref<VpsMetrics | null>(null);

    const healthAvailable = ref(false);
    const vpsAvailable = ref(false);

    async function fetchPublicHealth(): Promise<void> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/public/health`, {
                headers: { Accept: "application/json" },
            });
            if (!response.ok) throw new Error(`health ${response.status}`);
            health.value = (await response.json()) as PublicHealth;
            healthAvailable.value = true;
        } catch {
            healthAvailable.value = false;
        }
    }

    async function fetchIncidents(limit = 8): Promise<void> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/public/incidents?limit=${limit}`, {
                headers: { Accept: "application/json" },
            });
            if (!response.ok) throw new Error(`incidents ${response.status}`);
            incidents.value = (await response.json()) as Incident[];
        } catch {
            incidents.value = [];
        }
    }

    async function fetchVpsMetrics(): Promise<void> {
        const userStore = useUserStore();
        if (!userStore.accessToken || !userStore.isAdmin) {
            vpsAvailable.value = false;
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/health/vps`, {
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${userStore.accessToken}`,
                },
            });
            if (!response.ok) throw new Error(`vps ${response.status}`);
            vps.value = (await response.json()) as VpsMetrics;
            vpsAvailable.value = true;
        } catch {
            vpsAvailable.value = false;
        }
    }

    return {
        health,
        incidents,
        vps,
        healthAvailable,
        vpsAvailable,
        fetchPublicHealth,
        fetchIncidents,
        fetchVpsMetrics,
    };
});
