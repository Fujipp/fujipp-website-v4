package fujipp.project.backend.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Public, non-sensitive platform health. Served from a cached snapshot the
 * scheduled collector refreshes, so it is fast and never probes per request.
 * Deliberately excludes server internals (raw CPU/RAM/disk, hostnames, configs).
 */
public record PublicHealthResponse(
    String status,                 // online | degraded | down
    OffsetDateTime checkedAt,
    Backend backend,
    Frontend frontend,
    Shop shop
) {
    public record Backend(String status, long uptimeSeconds, Integer latencyMs, String version) {}

    /** The web/host layer can't be authoritatively probed server-side; status is informational. */
    public record Frontend(String status, String note) {}

    public record Shop(String status, List<Service> services) {}

    public record Service(String name, String status, Integer latencyMs) {}
}
