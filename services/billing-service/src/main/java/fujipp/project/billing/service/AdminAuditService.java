package fujipp.project.billing.service;

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
 * atomically with the action it describes. The payload is stored as jsonb
 * (Hibernate serializes the Map).
 */
@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private final AdminAuditLogRepository repository;

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
        log.setPayload(payload == null || payload.isEmpty() ? null : payload);
        return repository.save(log);
    }

    public List<AdminAuditLog> recent() {
        return repository.findTop50ByOrderByCreatedAtDesc();
    }

    public List<AdminAuditLog> recentForUser(UUID targetUserId) {
        return repository.findTop50ByTargetUserIdOrderByCreatedAtDesc(targetUserId);
    }
}
