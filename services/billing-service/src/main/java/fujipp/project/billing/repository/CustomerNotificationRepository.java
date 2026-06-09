package fujipp.project.billing.repository;

import fujipp.project.billing.model.CustomerNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CustomerNotificationRepository extends JpaRepository<CustomerNotification, UUID> {
}
