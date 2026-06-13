package fujipp.project.billing.service;

import fujipp.project.billing.model.AdminAuditLog;
import fujipp.project.billing.repository.AdminAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Writes the append-only {@code billing.admin_audit_log} trail. The payload is a
 * JSON string stored in a text column (serialized here with Jackson 3 — Hibernate's
 * auto jsonb mapper doesn't support Jackson 3, so we don't rely on it).
 *
 * {@link #record} never throws: auditing must never fail the admin action it
 * describes. Callers invoke it from within their own transaction.
 */
@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private static final Logger log = LoggerFactory.getLogger(AdminAuditService.class);

    private final AdminAuditLogRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * @param actorId      admin profile performing the action (may be null)
     * @param action       short action code, e.g. {@code WALLET_ADJUST}
     * @param targetUserId affected user, if the action targets one
     * @param targetType   target entity kind, e.g. {@code RUNTIME_PLAN}
     * @param targetId     target id (uuid or external subject id) as text
     * @param payload      JSON-serializable detail (before/after diff or context)
     */
    public AdminAuditLog record(UUID actorId, String action, UUID targetUserId,
                                String targetType, String targetId, Map<String, Object> payload) {
        try {
            AdminAuditLog entry = new AdminAuditLog();
            entry.setActorId(actorId);
            entry.setAction(action);
            entry.setTargetUserId(targetUserId);
            entry.setTargetType(targetType);
            entry.setTargetId(targetId);
            entry.setPayload(toJson(payload));
            return repository.save(entry);
        } catch (RuntimeException e) {
            // Never let an audit failure break the action it describes.
            log.warn("Admin audit record failed (action={}, target={}) — ignored", action, targetId, e);
            return null;
        }
    }

    public List<AdminAuditLog> recent() {
        return repository.findTop50ByOrderByCreatedAtDesc();
    }

    public List<AdminAuditLog> recentForUser(UUID targetUserId) {
        return repository.findTop50ByTargetUserIdOrderByCreatedAtDesc(targetUserId);
    }

    private String toJson(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (RuntimeException e) {
            return "{\"_serializationError\":true}";
        }
    }
}
