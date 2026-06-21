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
 * A service incident. Opened by {@code HealthMonitorService} when a probed service
 * flips to degraded/down, resolved when it recovers. Maps {@code monitoring.incidents}.
 * A public-safe subset is surfaced on the status page via {@code /api/public/incidents}.
 */
@Entity
@Table(name = "incidents", schema = "monitoring")
@Getter
@Setter
@NoArgsConstructor
public class Incident {

    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "service", nullable = false)
    private String service;

    /** info | warning | down */
    @Column(name = "severity", nullable = false)
    private String severity;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "detail")
    private String detail;

    /** open | resolved */
    @Column(name = "status", nullable = false)
    private String status = "open";

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
