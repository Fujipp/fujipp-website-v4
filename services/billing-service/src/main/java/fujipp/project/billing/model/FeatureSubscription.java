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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A rented feature.
 *   scope = BOT      → tied to one external_subject_id (per-bot rental).
 *   scope = ACCOUNT  → external_subject_id null, valid for all the user's subjects
 *                      (RENT_PERMANENT).
 */
@Entity
@Table(name = "feature_subscriptions", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class FeatureSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "feature_id", columnDefinition = "uuid", nullable = false)
    private UUID featureId;

    @Column(name = "price_id", columnDefinition = "uuid")
    private UUID priceId;

    /** BOT | ACCOUNT */
    @Column(name = "scope", nullable = false)
    private String scope = "BOT";

    @Column(name = "external_subject_id")
    private String externalSubjectId;

    /** RENT_MONTHLY | RENT_PERMANENT */
    @Column(name = "billing_type", nullable = false)
    private String billingType = "RENT_MONTHLY";

    /** ACTIVE | PAST_DUE | SUSPENDED | CANCELED */
    @Column(name = "status", nullable = false)
    private String status = "ACTIVE";

    @Column(name = "current_period_start", nullable = false)
    private LocalDate currentPeriodStart;

    /** null for RENT_PERMANENT */
    @Column(name = "current_period_end")
    private LocalDate currentPeriodEnd;

    @Column(name = "auto_renew", nullable = false)
    private boolean autoRenew = true;

    @Column(name = "renew_price_satang")
    private Long renewPriceSatang;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
