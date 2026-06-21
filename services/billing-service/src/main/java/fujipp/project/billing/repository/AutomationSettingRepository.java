package fujipp.project.billing.repository;

import fujipp.project.billing.model.AutomationSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AutomationSettingRepository extends JpaRepository<AutomationSetting, String> {
}
