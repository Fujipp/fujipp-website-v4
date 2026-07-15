package fujipp.project.billing.repository;

import fujipp.project.billing.model.FeatureVariableTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface FeatureVariableTemplateRepository extends JpaRepository<FeatureVariableTemplate, UUID> {

    List<FeatureVariableTemplate> findByFeatureIdInOrderBySortOrder(Collection<UUID> featureIds);

    List<FeatureVariableTemplate> findByFeatureIdOrderBySortOrder(UUID featureId);
}
