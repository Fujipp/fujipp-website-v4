package fujipp.project.voucher.repository;

import fujipp.project.voucher.model.Redeem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RedeemRepository extends JpaRepository<Redeem, UUID> {

    /** Idempotency guard: a retried request with the same key returns the first row. */
    Optional<Redeem> findByClientIdAndIdempotencyKey(String clientId, String idempotencyKey);
}
