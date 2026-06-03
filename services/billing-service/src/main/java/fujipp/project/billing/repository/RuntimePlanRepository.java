package fujipp.project.billing.repository;

import fujipp.project.billing.model.RuntimePlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RuntimePlanRepository extends JpaRepository<RuntimePlan, UUID> {

    List<RuntimePlan> findByActiveTrueOrderBySortOrderAsc();
}
