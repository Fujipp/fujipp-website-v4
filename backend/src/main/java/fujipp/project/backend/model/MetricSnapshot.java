package fujipp.project.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One periodic health/metric probe, written by {@code HealthMonitorService}.
 * Maps {@code monitoring.metric_snapshots}. Rows are keyed by {@code service}
 * (e.g. "system", "backend", "shop:auth") so the admin history graphs can pull
 * the latest N samples per series.
 */
@Entity
@Table(name = "metric_snapshots", schema = "monitoring")
@Getter
@Setter
@NoArgsConstructor
public class MetricSnapshot {

    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "captured_at", nullable = false)
    private OffsetDateTime capturedAt;

    @Column(name = "service", nullable = false)
    private String service;

    @Column(name = "status", nullable = false)
    private String status = "operational";

    @Column(name = "cpu_percent")
    private Double cpuPercent;

    @Column(name = "ram_percent")
    private Double ramPercent;

    @Column(name = "disk_percent")
    private Double diskPercent;

    @Column(name = "network_in_kbps")
    private Double networkInKbps;

    @Column(name = "network_out_kbps")
    private Double networkOutKbps;

    @Column(name = "latency_ms")
    private Integer latencyMs;
}
