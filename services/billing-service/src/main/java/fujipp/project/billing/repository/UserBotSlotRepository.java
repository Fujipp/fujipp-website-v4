package fujipp.project.billing.repository;

import fujipp.project.billing.model.UserBotSlot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserBotSlotRepository extends JpaRepository<UserBotSlot, UUID> {

    Optional<UserBotSlot> findByUserId(UUID userId);

    /** Lock the user's row before incrementing so concurrent purchases can't lose a count. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from UserBotSlot s where s.userId = :userId")
    Optional<UserBotSlot> findByUserIdForUpdate(@Param("userId") UUID userId);
}
