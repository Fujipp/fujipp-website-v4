package fujipp.project.billing.repository;

import fujipp.project.billing.model.RuntimeSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RuntimeSubscriptionRepository extends JpaRepository<RuntimeSubscription, UUID> {

    Optional<RuntimeSubscription> findByExternalSubjectId(String externalSubjectId);

    List<RuntimeSubscription> findByUserId(UUID userId);

    /** Runtime subs due for auto-renew on a given day. */
    List<RuntimeSubscription> findByStatusAndAutoRenewTrueAndCurrentPeriodEndLessThanEqual(
        String status, LocalDate onOrBefore);

    /** Active runtime that has run past its period end (to suspend). */
    List<RuntimeSubscription> findByStatusAndCurrentPeriodEndLessThan(String status, LocalDate date);
}
