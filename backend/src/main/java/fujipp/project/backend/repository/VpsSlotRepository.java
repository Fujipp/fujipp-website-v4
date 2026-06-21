package fujipp.project.backend.repository;

import fujipp.project.backend.model.VpsSlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VpsSlotRepository extends JpaRepository<VpsSlot, UUID> {

    List<VpsSlot> findByNodeIdOrderBySlotIndexAsc(UUID nodeId);

    Optional<VpsSlot> findByNodeIdAndSlotIndex(UUID nodeId, int slotIndex);

    long countByNodeId(UUID nodeId);
}
