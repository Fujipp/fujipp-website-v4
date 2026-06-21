package fujipp.project.backend.service;

import fujipp.project.backend.dto.IncidentResponse;
import fujipp.project.backend.dto.PublicHealthResponse;
import fujipp.project.backend.dto.VpsMetricsResponse;
import fujipp.project.backend.model.Incident;
import fujipp.project.backend.model.MetricSnapshot;
import fujipp.project.backend.repository.IncidentRepository;
import fujipp.project.backend.repository.MetricSnapshotRepository;
import fujipp.project.backend.runtime.RuntimeClient;
import fujipp.project.backend.runtime.RuntimeRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.management.ManagementFactory;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Periodically probes the platform (host metrics, DB, billing, runtime, Discord),
 * caches a public-safe health snapshot for fast {@code /api/public/health} reads,
 * persists a historical {@code metric_snapshots} row, and opens/resolves incidents
 * as services flip down/up. Also assembles the admin-only detailed VPS view.
 *
 * Design: the public endpoint never probes per request — it serves the last cached
 * snapshot the scheduler produced, the way an uptime monitor would.
 */
@Service
public class HealthMonitorService {

    private static final Logger log = LoggerFactory.getLogger(HealthMonitorService.class);

    private static final String SYSTEM_SERIES = "system";
    private static final String STATUS_OPERATIONAL = "operational";
    private static final String STATUS_DEGRADED = "degraded";
    private static final String STATUS_DOWN = "down";

    private final SystemMetricsService systemMetrics;
    private final MetricSnapshotRepository snapshots;
    private final IncidentRepository incidents;
    private final AdminAccessService adminAccess;
    private final JdbcTemplate jdbc;
    private final RuntimeClient runtime;
    private final RuntimeRouter runtimeRouter;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(2))
        .build();

    @Value("${app.version:0.1.0}")
    private String appVersion;

    @Value("${billing.base-url:}")
    private String billingBaseUrl;

    @Value("${monitoring.collect.enabled:true}")
    private boolean collectEnabled;

    @Value("${monitoring.history.limit:60}")
    private int historyLimit;

    @Value("${monitoring.retention.days:7}")
    private int retentionDays;

    @Value("${monitoring.discord.probe-url:https://discord.com/api/v10/gateway}")
    private String discordProbeUrl;

    /** Last successfully composed public snapshot. Volatile: written by the scheduler, read by requests. */
    private volatile PublicHealthResponse latest;

    public HealthMonitorService(
            SystemMetricsService systemMetrics,
            MetricSnapshotRepository snapshots,
            IncidentRepository incidents,
            AdminAccessService adminAccess,
            JdbcTemplate jdbc,
            RuntimeClient runtime,
            RuntimeRouter runtimeRouter) {
        this.systemMetrics = systemMetrics;
        this.snapshots = snapshots;
        this.incidents = incidents;
        this.adminAccess = adminAccess;
        this.jdbc = jdbc;
        this.runtime = runtime;
        this.runtimeRouter = runtimeRouter;
    }

    // ─── Scheduled collection ────────────────────────────────────────────────

    @Scheduled(
        initialDelayString = "${monitoring.collect.initial-delay-ms:15000}",
        fixedRateString = "${monitoring.collect.interval-ms:60000}")
    void collect() {
        if (!collectEnabled) {
            return;
        }
        try {
            probeAndStore();
        } catch (RuntimeException e) {
            log.warn("Health collection run failed", e);
        }
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    /** Fast public health: cached snapshot, computing one synchronously only if none exists yet. */
    public PublicHealthResponse publicHealth() {
        PublicHealthResponse cached = latest;
        if (cached != null) {
            return cached;
        }
        try {
            return probeAndStore();
        } catch (RuntimeException e) {
            log.warn("On-demand health probe failed", e);
            OffsetDateTime now = OffsetDateTime.now();
            return new PublicHealthResponse(
                STATUS_DEGRADED, now,
                new PublicHealthResponse.Backend("online", backendUptimeSeconds(), null, appVersion),
                new PublicHealthResponse.Frontend("unknown", "Served by Rukcom hosting; not probed by the backend."),
                new PublicHealthResponse.Shop("unknown", List.of()));
        }
    }

    /** Recent incidents for the public status page (no internal detail). */
    @Transactional(readOnly = true)
    public List<IncidentResponse> recentIncidents(int limit) {
        return incidents.findAllByOrderByStartedAtDesc(PageRequest.of(0, Math.max(1, Math.min(limit, 50))))
            .stream()
            .map(IncidentResponse::from)
            .toList();
    }

    /** Admin-only detailed VPS metrics + history. Role enforced here. */
    @Transactional(readOnly = true)
    public VpsMetricsResponse vpsMetrics(UUID adminId) {
        adminAccess.requireAdmin(adminId);

        SystemMetricsService.HostSnapshot host = systemMetrics.capture();
        double[] heap = systemMetrics.jvmHeap();

        List<MetricSnapshot> recent = snapshots.findByServiceOrderByCapturedAtDesc(
            SYSTEM_SERIES, PageRequest.of(0, Math.max(1, historyLimit)));

        // History is newest-first from the query; present oldest → newest for charting.
        List<VpsMetricsResponse.Sample> history = new ArrayList<>(recent.size());
        double cpuSum = 0;
        double cpuMax = host.cpuPercent() != null ? host.cpuPercent() : 0;
        int cpuCount = 0;
        for (int i = recent.size() - 1; i >= 0; i--) {
            MetricSnapshot s = recent.get(i);
            history.add(new VpsMetricsResponse.Sample(
                s.getCapturedAt(), s.getCpuPercent(), s.getRamPercent(), s.getDiskPercent(),
                s.getNetworkInKbps(), s.getNetworkOutKbps(), s.getLatencyMs(), s.getStatus()));
            if (s.getCpuPercent() != null) {
                cpuSum += s.getCpuPercent();
                cpuMax = Math.max(cpuMax, s.getCpuPercent());
                cpuCount++;
            }
        }
        double cpuCurrent = host.cpuPercent() != null ? host.cpuPercent() : 0;
        double cpuAverage = cpuCount > 0 ? round(cpuSum / cpuCount) : cpuCurrent;

        return new VpsMetricsResponse(
            OffsetDateTime.now(),
            host.uptimeSeconds(),
            new VpsMetricsResponse.Cpu(cpuCurrent, cpuAverage, round(cpuMax), host.cpuCores()),
            new VpsMetricsResponse.Memory(host.memUsedBytes(), host.memTotalBytes(), nz(host.memPercent())),
            new VpsMetricsResponse.Disk(host.diskUsedBytes(), host.diskTotalBytes(), nz(host.diskPercent())),
            new VpsMetricsResponse.Network(host.networkInKbps(), host.networkOutKbps()),
            new VpsMetricsResponse.Jvm(heap[0], heap[1], heap[2]),
            new VpsMetricsResponse.Server(
                host.osDescription(),
                "Java " + System.getProperty("java.version") + " · Spring Boot",
                appVersion),
            history);
    }

    // ─── Probe + persist + reconcile ─────────────────────────────────────────

    private PublicHealthResponse probeAndStore() {
        OffsetDateTime now = OffsetDateTime.now();
        SystemMetricsService.HostSnapshot host = systemMetrics.capture();

        // Backend reachability proxied by a DB round-trip.
        Integer dbLatency = pingDatabase();
        boolean dbUp = dbLatency != null;
        String backendStatus = dbUp ? "online" : STATUS_DOWN;

        // Billing service powers wallet + bot-config; probe once, reuse.
        Integer billingLatency = billingBaseUrl == null || billingBaseUrl.isBlank() ? null : probeHttp(billingBaseUrl);
        boolean billingUp = billingLatency != null;

        // Runtime orchestrator (bot start/stop/restart).
        long runtimeStart = System.nanoTime();
        boolean runtimeUp = runtimeReachable();
        Integer runtimeLatency = runtimeUp ? (int) ((System.nanoTime() - runtimeStart) / 1_000_000) : null;

        // Discord REST/gateway reachability (external, best-effort).
        Integer discordLatency = probeHttp(discordProbeUrl);
        boolean discordUp = discordLatency != null;

        List<PublicHealthResponse.Service> services = List.of(
            service("Auth", dbUp ? STATUS_OPERATIONAL : STATUS_DOWN, dbLatency),
            service("Wallet / top-up", billingUp ? STATUS_OPERATIONAL : STATUS_DOWN, billingLatency),
            service("Bot Config API", billingUp ? STATUS_OPERATIONAL : STATUS_DOWN, billingLatency),
            service("Runtime control", runtimeUp ? STATUS_OPERATIONAL : STATUS_DOWN, runtimeLatency),
            service("Discord API reach", discordUp ? STATUS_OPERATIONAL : STATUS_DEGRADED, discordLatency));

        String shopStatus = worst(services.stream().map(PublicHealthResponse.Service::status).toList());
        String overall = worst(List.of(backendStatus.equals("online") ? STATUS_OPERATIONAL : STATUS_DOWN, shopStatus));

        PublicHealthResponse response = new PublicHealthResponse(
            overall.equals(STATUS_OPERATIONAL) ? "online" : overall,
            now,
            new PublicHealthResponse.Backend(backendStatus, backendUptimeSeconds(), dbLatency, appVersion),
            new PublicHealthResponse.Frontend("unknown", "Served by Rukcom hosting; not probed by the backend."),
            new PublicHealthResponse.Shop(shopStatus, services));

        this.latest = response;

        persistSnapshot(now, host, dbLatency, overall);
        reconcileIncidents(services, backendStatus);
        pruneOldSnapshots();

        return response;
    }

    private void persistSnapshot(OffsetDateTime at, SystemMetricsService.HostSnapshot host, Integer latencyMs, String status) {
        try {
            MetricSnapshot snapshot = new MetricSnapshot();
            snapshot.setCapturedAt(at);
            snapshot.setService(SYSTEM_SERIES);
            snapshot.setStatus(status);
            snapshot.setCpuPercent(host.cpuPercent());
            snapshot.setRamPercent(host.memPercent());
            snapshot.setDiskPercent(host.diskPercent());
            snapshot.setNetworkInKbps(host.networkInKbps());
            snapshot.setNetworkOutKbps(host.networkOutKbps());
            snapshot.setLatencyMs(latencyMs);
            snapshots.save(snapshot);
        } catch (RuntimeException e) {
            log.warn("Failed to persist metric snapshot", e);
        }
    }

    /** Open an incident when a service is unhealthy; resolve the open one when it recovers. */
    private void reconcileIncidents(List<PublicHealthResponse.Service> services, String backendStatus) {
        try {
            if (!"online".equals(backendStatus)) {
                openIncident("Backend", STATUS_DOWN, "Backend database unreachable", "DB round-trip failed");
            } else {
                resolveIncident("Backend");
            }
            for (PublicHealthResponse.Service service : services) {
                switch (service.status()) {
                    case STATUS_DOWN -> openIncident(service.name(), STATUS_DOWN,
                        service.name() + " is unreachable", "Probe reported the service as down");
                    case STATUS_DEGRADED -> openIncident(service.name(), "warning",
                        service.name() + " is degraded", "Probe reported degraded performance");
                    default -> resolveIncident(service.name());
                }
            }
        } catch (RuntimeException e) {
            log.warn("Incident reconciliation failed", e);
        }
    }

    private void openIncident(String service, String severity, String title, String detail) {
        Optional<Incident> open = incidents.findFirstByServiceAndStatusOrderByStartedAtDesc(service, "open");
        if (open.isPresent()) {
            return; // already tracking this ongoing incident
        }
        Incident incident = new Incident();
        incident.setService(service);
        incident.setSeverity(severity);
        incident.setTitle(title);
        incident.setDetail(detail);
        incident.setStatus("open");
        incident.setStartedAt(OffsetDateTime.now());
        incidents.save(incident);
        log.info("Opened incident for {} ({})", service, severity);
    }

    private void resolveIncident(String service) {
        incidents.findFirstByServiceAndStatusOrderByStartedAtDesc(service, "open").ifPresent(incident -> {
            incident.setStatus("resolved");
            incident.setResolvedAt(OffsetDateTime.now());
            incidents.save(incident);
            log.info("Resolved incident for {}", service);
        });
    }

    private void pruneOldSnapshots() {
        try {
            snapshots.deleteByCapturedAtBefore(OffsetDateTime.now().minusDays(Math.max(1, retentionDays)));
        } catch (RuntimeException e) {
            log.debug("Snapshot pruning failed", e);
        }
    }

    // ─── Probes ──────────────────────────────────────────────────────────────

    private Integer pingDatabase() {
        try {
            long t0 = System.nanoTime();
            jdbc.queryForObject("select 1", Integer.class);
            return (int) ((System.nanoTime() - t0) / 1_000_000);
        } catch (RuntimeException e) {
            log.warn("Database ping failed", e);
            return null;
        }
    }

    private boolean runtimeReachable() {
        try {
            return runtime.isReachable(runtimeRouter.targetForNode(null));
        } catch (RuntimeException e) {
            return false;
        }
    }

    /** Returns latency in ms if the URL answers with any HTTP status, else null (connection failed). */
    private Integer probeHttp(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        try {
            long t0 = System.nanoTime();
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(3))
                .GET()
                .build();
            httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            return (int) ((System.nanoTime() - t0) / 1_000_000);
        } catch (Exception e) {
            return null;
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private long backendUptimeSeconds() {
        return ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
    }

    private static PublicHealthResponse.Service service(String name, String status, Integer latencyMs) {
        return new PublicHealthResponse.Service(name, status, latencyMs);
    }

    /** Worst status wins: down > degraded > operational. */
    private static String worst(List<String> statuses) {
        boolean degraded = false;
        for (String status : statuses) {
            if (STATUS_DOWN.equals(status)) {
                return STATUS_DOWN;
            }
            if (STATUS_DEGRADED.equals(status)) {
                degraded = true;
            }
        }
        return degraded ? STATUS_DEGRADED : STATUS_OPERATIONAL;
    }

    private static double nz(Double value) {
        return value == null ? 0 : value;
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
