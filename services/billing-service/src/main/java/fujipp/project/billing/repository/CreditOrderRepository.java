package fujipp.project.billing.repository;

import fujipp.project.billing.model.CreditOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CreditOrderRepository extends JpaRepository<CreditOrder, UUID> {

    Optional<CreditOrder> findByIdempotencyKey(String idempotencyKey);

    List<CreditOrder> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
