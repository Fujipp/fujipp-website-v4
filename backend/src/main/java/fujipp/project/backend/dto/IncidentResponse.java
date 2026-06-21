package fujipp.project.backend.dto;

import fujipp.project.backend.model.Incident;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Public-safe incident view for the status page. Intentionally omits the internal
 * {@code detail} field, which can hold raw error reasons.
 */
public record IncidentResponse(
    UUID id,
    String service,
    String severity,
    String title,
    String status,
    OffsetDateTime startedAt,
    OffsetDateTime resolvedAt
) {
    public static IncidentResponse from(Incident incident) {
        return new IncidentResponse(
            incident.getId(),
            incident.getService(),
            incident.getSeverity(),
            incident.getTitle(),
            incident.getStatus(),
            incident.getStartedAt(),
            incident.getResolvedAt()
        );
    }
}
