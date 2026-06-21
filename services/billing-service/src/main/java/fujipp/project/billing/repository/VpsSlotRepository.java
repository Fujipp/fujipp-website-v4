package fujipp.project.billing.repository;

import fujipp.project.billing.model.VpsSlot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VpsSlotRepository extends JpaRepository<VpsSlot, UUID> {

    List<VpsSlot> findByNodeIdOrderBySlotIndexAsc(UUID nodeId);

    /** Lock the seat before selling it, so two buyers can't take the same one. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from VpsSlot s where s.id = :id")
    Optional<VpsSlot> findByIdForUpdate(@Param("id") UUID id);
}
