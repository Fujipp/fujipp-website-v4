package fujipp.project.billing.repository;

import fujipp.project.billing.model.FeatureCatalog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeatureCatalogRepository extends JpaRepository<FeatureCatalog, UUID> {

    List<FeatureCatalog> findByActiveTrueOrderBySortOrderAsc();

    Optional<FeatureCatalog> findByCode(String code);
}
