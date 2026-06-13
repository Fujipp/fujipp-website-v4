package fujipp.project.billing.repository;

import fujipp.project.billing.model.AdminAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, UUID> {

    List<AdminAuditLog> findTop50ByOrderByCreatedAtDesc();

    List<AdminAuditLog> findTop50ByTargetUserIdOrderByCreatedAtDesc(UUID targetUserId);
}
