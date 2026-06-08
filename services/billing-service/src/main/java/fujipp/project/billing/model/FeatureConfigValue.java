package fujipp.project.billing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A customer-entered config value for one bot (subject) + feature. Secrets are encrypted. */
@Entity
@Table(name = "feature_config_values", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class FeatureConfigValue {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "external_subject_id", nullable = false)
    private String externalSubjectId;

    @Column(name = "feature_id", columnDefinition = "uuid", nullable = false)
    private UUID featureId;

    @Column(name = "config_key", nullable = false)
    private String configKey;

    @Column(name = "config_value")
    private String configValue;

    @Column(name = "is_secret", nullable = false)
    private boolean secret = false;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
