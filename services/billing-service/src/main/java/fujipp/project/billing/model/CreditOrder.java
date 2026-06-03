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
 * One credit spend = one order = one wallet debit. May contain several items
 * (rent + source + runtime in a single basket).
 */
@Entity
@Table(name = "credit_orders", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class CreditOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID userId;

    /** PENDING | PAID | REFUNDED | FAILED */
    @Column(name = "status", nullable = false)
    private String status = "PENDING";

    @Column(name = "total_satang", nullable = false)
    private long totalSatang = 0L;

    @Column(name = "currency", nullable = false)
    private String currency = "THB";

    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Column(name = "note")
    private String note;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
