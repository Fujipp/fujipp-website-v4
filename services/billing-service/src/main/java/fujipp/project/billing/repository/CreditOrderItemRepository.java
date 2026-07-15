package fujipp.project.billing.repository;

import fujipp.project.billing.model.CreditOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface CreditOrderItemRepository extends JpaRepository<CreditOrderItem, UUID> {

    @Query(value = """
        SELECT COUNT(*)
        FROM billing.credit_order_items item
        JOIN billing.credit_orders purchase ON purchase.id = item.order_id
        WHERE purchase.status = 'PAID'
          AND item.feature_id IS NOT NULL
        """, nativeQuery = true)
    long countPaidFeatureItems();

    List<CreditOrderItem> findByOrderId(UUID orderId);
}
