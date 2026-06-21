package fujipp.project.backend.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Admin-only detailed VPS/runtime metrics: current readings plus a recent history
 * series for the dashboard graphs. Returned only to ADMIN profiles.
 */
public record VpsMetricsResponse(
    OffsetDateTime checkedAt,
    long systemUptimeSeconds,
    Cpu cpu,
    Memory ram,
    Disk disk,
    Network network,
    Jvm jvm,
    Server server,
    List<Sample> history
) {
    public record Cpu(double currentPercent, double averagePercent, double maxPercent, int cores) {}

    public record Memory(double usedBytes, double totalBytes, double percent) {}

    public record Disk(double usedBytes, double totalBytes, double percent) {}

    public record Network(double inKbps, double outKbps) {}

    public record Jvm(double usedHeapBytes, double maxHeapBytes, double percent) {}

    public record Server(String os, String runtime, String version) {}

    /** A single historical snapshot point (oldest → newest in the list). */
    public record Sample(
        OffsetDateTime at,
        Double cpuPercent,
        Double ramPercent,
        Double diskPercent,
        Double networkInKbps,
        Double networkOutKbps,
        Integer latencyMs,
        String status
    ) {}
}
