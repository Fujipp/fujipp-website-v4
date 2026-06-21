package fujipp.project.billing.repository;

import fujipp.project.billing.model.RuntimeSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RuntimeSubscriptionRepository extends JpaRepository<RuntimeSubscription, UUID> {

    Optional<RuntimeSubscription> findByExternalSubjectId(String externalSubjectId);

    /** Active runtimes that occupy a seat — used to render the cabinet (slot → runtime). */
    List<RuntimeSubscription> findByStatusAndVpsSlotIdIsNotNull(String status);

    /** The active runtime on a given seat, if any (the seat's current occupant). */
    Optional<RuntimeSubscription> findByVpsSlotIdAndStatus(UUID vpsSlotId, String status);

    /** The active runtime powering a given bot, if any (one per bot, enforced in DB). */
    Optional<RuntimeSubscription> findByExternalSubjectIdAndStatus(String externalSubjectId, String status);

    /** Reassign all runtime subs for a subject (bot) to a new owner. Returns rows changed. */
    @Modifying
    @Query("update RuntimeSubscription r set r.userId = :newUserId where r.externalSubjectId = :subjectId")
    int reassignOwner(@Param("subjectId") String subjectId, @Param("newUserId") UUID newUserId);

    List<RuntimeSubscription> findByUserId(UUID userId);

    /** Runtime subs due for auto-renew on a given day. */
    List<RuntimeSubscription> findByStatusAndAutoRenewTrueAndCurrentPeriodEndLessThanEqual(
        String status, LocalDate onOrBefore);

    /** Active runtime that has run past its period end (to suspend). */
    List<RuntimeSubscription> findByStatusAndCurrentPeriodEndLessThan(String status, LocalDate date);
}
