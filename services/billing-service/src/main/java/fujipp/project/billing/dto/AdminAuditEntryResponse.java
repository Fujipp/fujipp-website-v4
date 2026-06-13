package fujipp.project.billing.dto;

import fujipp.project.billing.model.AdminAuditLog;

import java.time.OffsetDateTime;
import java.util.UUID;

/** One admin audit row for the dashboard activity feed. */
public record AdminAuditEntryResponse(
    UUID id,
    UUID actorId,
    String action,
    UUID targetUserId,
    String targetType,
    String targetId,
    OffsetDateTime createdAt
) {
    public static AdminAuditEntryResponse from(AdminAuditLog log) {
        return new AdminAuditEntryResponse(
            log.getId(),
            log.getActorId(),
            log.getAction(),
            log.getTargetUserId(),
            log.getTargetType(),
            log.getTargetId(),
            log.getCreatedAt()
        );
    }
}
