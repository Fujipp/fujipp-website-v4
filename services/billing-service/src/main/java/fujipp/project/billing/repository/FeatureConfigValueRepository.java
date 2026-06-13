package fujipp.project.billing.repository;

import fujipp.project.billing.model.FeatureConfigValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeatureConfigValueRepository extends JpaRepository<FeatureConfigValue, UUID> {

    List<FeatureConfigValue> findByExternalSubjectId(String externalSubjectId);

    /** Reassign all config values for a subject (bot) to a new owner. Returns rows changed. */
    @Modifying
    @Query("update FeatureConfigValue c set c.userId = :newUserId where c.externalSubjectId = :subjectId")
    int reassignOwner(@Param("subjectId") String subjectId, @Param("newUserId") UUID newUserId);

    Optional<FeatureConfigValue> findByExternalSubjectIdAndFeatureIdAndConfigKey(
        String externalSubjectId, UUID featureId, String configKey);
}
