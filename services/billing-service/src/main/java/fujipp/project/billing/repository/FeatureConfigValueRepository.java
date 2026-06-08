package fujipp.project.billing.repository;

import fujipp.project.billing.model.FeatureConfigValue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeatureConfigValueRepository extends JpaRepository<FeatureConfigValue, UUID> {

    List<FeatureConfigValue> findByExternalSubjectId(String externalSubjectId);

    Optional<FeatureConfigValue> findByExternalSubjectIdAndFeatureIdAndConfigKey(
        String externalSubjectId, UUID featureId, String configKey);
}
