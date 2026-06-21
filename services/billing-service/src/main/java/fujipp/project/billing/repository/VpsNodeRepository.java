package fujipp.project.billing.repository;

import fujipp.project.billing.model.VpsNode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VpsNodeRepository extends JpaRepository<VpsNode, UUID> {

    /** Cabinets to show in the shop, stable order. OFFLINE nodes are filtered in the service. */
    List<VpsNode> findAllByOrderByNameAsc();
}
