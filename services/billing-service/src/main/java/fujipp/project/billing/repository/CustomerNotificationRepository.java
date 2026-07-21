package fujipp.project.billing.repository;

import fujipp.project.billing.model.CustomerNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.List;
import java.util.Optional;

public interface CustomerNotificationRepository extends JpaRepository<CustomerNotification, UUID> {
    List<CustomerNotification> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<CustomerNotification> findByIdAndUserId(UUID id, UUID userId);
}
