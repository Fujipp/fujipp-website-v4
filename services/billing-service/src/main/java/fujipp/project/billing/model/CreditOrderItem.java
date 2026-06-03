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
 * A single purchased line. Code/name/amount are snapshots so later price or
 * promotion changes never rewrite history.
 */
@Entity
@Table(name = "credit_order_items", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class CreditOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "order_id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID orderId;

    /** RENT_MONTHLY | RENT_PERMANENT | SOURCE_CODE | RUNTIME | UPGRADE */
    @Column(name = "kind", nullable = false)
    private String kind;

    @Column(name = "feature_id", columnDefinition = "uuid")
    private UUID featureId;

    @Column(name = "runtime_plan_id", columnDefinition = "uuid")
    private UUID runtimePlanId;

    @Column(name = "price_id", columnDefinition = "uuid")
    private UUID priceId;

    @Column(name = "external_subject_id")
    private String externalSubjectId;

    @Column(name = "amount_satang", nullable = false)
    private long amountSatang;

    @Column(name = "item_code", nullable = false)
    private String itemCode;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "replaces_subscription_id", columnDefinition = "uuid")
    private UUID replacesSubscriptionId;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
