package fujipp.project.billing.repository;

import fujipp.project.billing.model.FeatureSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeatureSubscriptionRepository extends JpaRepository<FeatureSubscription, UUID> {

    List<FeatureSubscription> findByUserId(UUID userId);

    /** Reassign all BOT-scoped feature subs for a subject to a new owner. Returns rows changed. */
    @Modifying
    @Query("update FeatureSubscription f set f.userId = :newUserId where f.externalSubjectId = :subjectId")
    int reassignOwner(@Param("subjectId") String subjectId, @Param("newUserId") UUID newUserId);

    /** Rentals due for auto-renew on a given day. */
    List<FeatureSubscription> findByStatusAndAutoRenewTrueAndCurrentPeriodEndLessThanEqual(
        String status, LocalDate onOrBefore);

    /** BOT-scoped rentals for a subject (used to suspend when its runtime expires). */
    List<FeatureSubscription> findByExternalSubjectIdAndStatus(String externalSubjectId, String status);

    /** Live (ACTIVE/PAST_DUE) features for a subject — drives its config form. */
    List<FeatureSubscription> findByExternalSubjectIdAndStatusIn(
        String externalSubjectId, Collection<String> statuses);

    /** BOT-scoped rental for a specific subject. */
    Optional<FeatureSubscription> findByFeatureIdAndExternalSubjectId(UUID featureId, String externalSubjectId);

    /** ACCOUNT-scoped permanent rental (subject is null). */
    Optional<FeatureSubscription> findByUserIdAndFeatureIdAndScope(UUID userId, UUID featureId, String scope);
}
