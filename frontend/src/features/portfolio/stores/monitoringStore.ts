import { ref } from "vue";
import { defineStore } from "pinia";
import { API_BASE_URL } from "@/config";

/**
 * Platform monitoring client for the /performance dashboard.
 *
 * - Public health comes from the unauthenticated `/api/public/health` endpoint,
 *   served from the backend's cached in-memory probe snapshot.
 * - The public Performance page intentionally does not fetch incidents or admin
 *   VPS metrics, so opening it does not create database work for monitoring UI.
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
    frontend: {
        status: string;
        latencyMs: number | null;
        uptimePercent: number | null;
        responseHistory: (number | null)[];
        statusHistory: string[];
        note: string;
    };
    server: {
        cpuPercent: number | null;
        ramPercent: number | null;
        diskPercent: number | null;
        networkInKbps: number;
        networkOutKbps: number;
        uptimeSeconds: number;
        cpuCores: number;
    };
    shop: { status: HealthStatus; services: ServiceHealth[] };
}

export const useMonitoringStore = defineStore("monitoring", () => {
    const health = ref<PublicHealth | null>(null);

    const healthAvailable = ref(false);

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

    return {
        health,
        healthAvailable,
        fetchPublicHealth,
    };
});
