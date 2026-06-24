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

/** Config schema for a feature — drives the customer-facing form. */
@Entity
@Table(name = "feature_variable_templates", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class FeatureVariableTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "feature_id", columnDefinition = "uuid", nullable = false)
    private UUID featureId;

    @Column(name = "variable_key", nullable = false)
    private String variableKey;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "description")
    private String description;

    /** STRING | TEXT | NUMBER | BOOLEAN | CHANNEL_ID | ROLE_ID | USER_ID | SECRET | JSON | STRING_LIST | ENUM */
    @Column(name = "value_type", nullable = false)
    private String valueType = "STRING";

    /**
     * ENUM choices as raw JSON text ([{"value":…,"label":…}, …]); null for non-ENUM fields.
     * Stored in a plain text column (not jsonb): this service runs on Jackson 3 while
     * Hibernate 7.2 only auto-wires a JSON FormatMapper for Jackson 2, so a jsonb mapping
     * fails at runtime. The frontend parses this string.
     */
    @Column(name = "options")
    private String options;

    @Column(name = "is_required", nullable = false)
    private boolean required = false;

    @Column(name = "is_sensitive", nullable = false)
    private boolean sensitive = false;

    @Column(name = "default_value")
    private String defaultValue;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 100;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
