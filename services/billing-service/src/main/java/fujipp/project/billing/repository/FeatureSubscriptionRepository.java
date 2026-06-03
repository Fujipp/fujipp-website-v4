package fujipp.project.billing.repository;

import fujipp.project.billing.model.FeatureSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeatureSubscriptionRepository extends JpaRepository<FeatureSubscription, UUID> {

    List<FeatureSubscription> findByUserId(UUID userId);

    /** Rentals due for auto-renew on a given day. */
    List<FeatureSubscription> findByStatusAndAutoRenewTrueAndCurrentPeriodEndLessThanEqual(
        String status, LocalDate onOrBefore);

    /** BOT-scoped rentals for a subject (used to suspend when its runtime expires). */
    List<FeatureSubscription> findByExternalSubjectIdAndStatus(String externalSubjectId, String status);

    /** BOT-scoped rental for a specific subject. */
    Optional<FeatureSubscription> findByFeatureIdAndExternalSubjectId(UUID featureId, String externalSubjectId);

    /** ACCOUNT-scoped permanent rental (subject is null). */
    Optional<FeatureSubscription> findByUserIdAndFeatureIdAndScope(UUID userId, UUID featureId, String scope);
}
