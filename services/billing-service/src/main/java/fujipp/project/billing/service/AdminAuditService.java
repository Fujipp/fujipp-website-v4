package fujipp.project.billing.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import fujipp.project.billing.model.AdminAuditLog;
import fujipp.project.billing.repository.AdminAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Writes the append-only {@code billing.admin_audit_log} trail. Callers invoke
 * {@link #record} from within their own transaction so the audit row commits
 * atomically with the action it describes.
 */
@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private final AdminAuditLogRepository repository;
    private final ObjectMapper objectMapper;

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
        AdminAuditLog log = new AdminAuditLog();
        log.setActorId(actorId);
        log.setAction(action);
        log.setTargetUserId(targetUserId);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setPayload(toJson(payload));
        return repository.save(log);
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
        } catch (JsonProcessingException e) {
            // Auditing must never block the action it records; fall back to a marker.
            return "{\"_serializationError\":true}";
        }
    }
}
