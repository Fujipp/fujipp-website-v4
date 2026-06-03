package fujipp.project.billing.repository;

import fujipp.project.billing.model.SourceCodeEntitlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SourceCodeEntitlementRepository extends JpaRepository<SourceCodeEntitlement, UUID> {

    List<SourceCodeEntitlement> findByUserId(UUID userId);

    Optional<SourceCodeEntitlement> findByUserIdAndFeatureId(UUID userId, UUID featureId);
}
