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
 * Runtime hosting subscription — one reserved VPS seat, optionally powering one
 * bot. A purchase always begins unassigned and locks in its plan for renewals.
 */
@Entity
@Table(name = "runtime_subscriptions", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class RuntimeSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    /** The bot this runtime powers, or NULL if bought-but-unassigned. Movable. */
    @Column(name = "external_subject_id")
    private String externalSubjectId;

    /** The VPS seat (bots.vps_slots) this runtime occupies. NULL only for legacy/unparked rows. */
    @Column(name = "vps_slot_id", columnDefinition = "uuid")
    private UUID vpsSlotId;

    @Column(name = "runtime_plan_id", columnDefinition = "uuid")
    private UUID runtimePlanId;

    /** ACTIVE | PAST_DUE | SUSPENDED | CANCELED. A released seat is CANCELED. */
    @Column(name = "status", nullable = false)
    private String status = "ACTIVE";

    @Column(name = "current_period_start", nullable = false)
    private LocalDate currentPeriodStart;

    @Column(name = "current_period_end", nullable = false)
    private LocalDate currentPeriodEnd;

    @Column(name = "auto_renew", nullable = false)
    private boolean autoRenew = true;

    @Column(name = "renew_plan_id", columnDefinition = "uuid")
    private UUID renewPlanId;

    @Column(name = "renew_price_satang")
    private Long renewPriceSatang;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
