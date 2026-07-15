package fujipp.project.billing.repository;

import fujipp.project.billing.model.CreditOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CreditOrderRepository extends JpaRepository<CreditOrder, UUID> {

    @Query("SELECT COALESCE(SUM(o.totalSatang), 0) FROM CreditOrder o WHERE o.status = 'PAID'")
    long sumPaidSalesSatang();

    @Query("SELECT COALESCE(SUM(o.totalSatang), 0) FROM CreditOrder o WHERE o.status = 'PAID' AND o.createdAt >= :since")
    long sumPaidSalesSince(@Param("since") OffsetDateTime since);

    Optional<CreditOrder> findByIdempotencyKey(String idempotencyKey);

    List<CreditOrder> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
