package fujipp.project.billing.repository;

import fujipp.project.billing.model.AutomationRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AutomationRunRepository extends JpaRepository<AutomationRun, UUID> {
}
