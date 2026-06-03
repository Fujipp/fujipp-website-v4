package fujipp.project.billing.repository;

import fujipp.project.billing.model.SourceCodeRelease;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SourceCodeReleaseRepository extends JpaRepository<SourceCodeRelease, UUID> {

    Optional<SourceCodeRelease> findByFeatureIdAndLatestTrue(UUID featureId);

    List<SourceCodeRelease> findByFeatureIdOrderByReleasedAtDesc(UUID featureId);
}
