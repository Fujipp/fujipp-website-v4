package fujipp.project.billing.repository;

import fujipp.project.billing.model.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {

    List<WalletTransaction> findTop50ByUserIdOrderByCreatedAtDesc(UUID userId);

    /** Sum of real money in (confirmed top-ups) since the given instant, in satang. */
    @Query("""
        select coalesce(sum(t.amountSatang), 0) from WalletTransaction t
        where t.type = 'TOPUP' and t.direction = 'CREDIT' and t.createdAt >= :since
        """)
    long sumTopupsSince(@Param("since") OffsetDateTime since);
}
