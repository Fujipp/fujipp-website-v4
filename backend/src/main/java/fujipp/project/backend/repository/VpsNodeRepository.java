package fujipp.project.backend.repository;

import fujipp.project.backend.model.VpsNode;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VpsNodeRepository extends JpaRepository<VpsNode, UUID> {

    /** Placement candidates, most-capacity first. Filtered for free slots in the service. */
    List<VpsNode> findByStatusOrderByMaxSlotsDesc(String status);

    /**
     * Lock a node row before counting its slots, so concurrent placements onto the
     * same host are serialized and can't oversubscribe max_slots.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from VpsNode n where n.id = :id")
    Optional<VpsNode> findByIdForUpdate(@Param("id") UUID id);
}
