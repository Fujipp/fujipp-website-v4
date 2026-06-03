package fujipp.project.billing.repository;

import fujipp.project.billing.model.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {

    List<WalletTransaction> findTop50ByUserIdOrderByCreatedAtDesc(UUID userId);
}
