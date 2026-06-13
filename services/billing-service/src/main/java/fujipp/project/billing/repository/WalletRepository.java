package fujipp.project.billing.repository;

import fujipp.project.billing.model.Wallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface WalletRepository extends JpaRepository<Wallet, UUID> {

    Optional<Wallet> findByUserId(UUID userId);

    /** Total credit held across all wallets (satang). Used by the admin dashboard. */
    @Query("select coalesce(sum(w.balanceSatang), 0) from Wallet w")
    long sumAllBalances();

    /**
     * Locks the wallet row (SELECT ... FOR UPDATE) so concurrent credit/debit
     * calls for the same user serialize. Must be called inside a transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Wallet w where w.userId = :userId")
    Optional<Wallet> findByUserIdForUpdate(@Param("userId") UUID userId);
}
