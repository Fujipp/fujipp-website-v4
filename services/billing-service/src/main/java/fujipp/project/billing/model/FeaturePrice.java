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

/**
 * A priced SKU for a feature. One feature may have several:
 * RENT_MONTHLY (cheap), RENT_PERMANENT (mid), SOURCE_CODE (expensive).
 */
@Entity
@Table(name = "feature_prices", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class FeaturePrice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "feature_id", columnDefinition = "uuid", nullable = false)
    private UUID featureId;

    /** RENT_MONTHLY | RENT_PERMANENT | SOURCE_CODE */
    @Column(name = "kind", nullable = false)
    private String kind;

    @Column(name = "price_satang", nullable = false)
    private long priceSatang;

    @Column(name = "currency", nullable = false)
    private String currency = "THB";

    @Column(name = "duration_months")
    private Integer durationMonths;

    @Column(name = "promotion_label")
    private String promotionLabel;

    @Column(name = "promotion_price_satang")
    private Long promotionPriceSatang;

    @Column(name = "promotion_starts_at")
    private OffsetDateTime promotionStartsAt;

    @Column(name = "promotion_ends_at")
    private OffsetDateTime promotionEndsAt;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
