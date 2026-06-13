package fujipp.project.billing.dto;

import java.util.Map;
import java.util.UUID;

/**
 * Lets the main backend record an admin action that originates outside billing
 * (e.g. a profile/role change). The acting admin arrives in {@code X-Admin-Id}.
 */
public record AdminAuditRecordRequest(
    String action,
    UUID targetUserId,
    String targetType,
    String targetId,
    Map<String, Object> payload
) {}
