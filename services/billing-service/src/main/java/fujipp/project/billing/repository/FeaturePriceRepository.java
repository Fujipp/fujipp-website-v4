package fujipp.project.billing.repository;

import fujipp.project.billing.model.FeaturePrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FeaturePriceRepository extends JpaRepository<FeaturePrice, UUID> {

    List<FeaturePrice> findByActiveTrue();

    List<FeaturePrice> findByFeatureIdAndActiveTrue(UUID featureId);
}
