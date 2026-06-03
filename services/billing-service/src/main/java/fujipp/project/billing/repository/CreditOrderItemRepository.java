package fujipp.project.billing.repository;

import fujipp.project.billing.model.CreditOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CreditOrderItemRepository extends JpaRepository<CreditOrderItem, UUID> {

    List<CreditOrderItem> findByOrderId(UUID orderId);
}
