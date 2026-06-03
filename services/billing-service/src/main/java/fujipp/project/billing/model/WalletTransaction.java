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
 * Append-only ledger row. The wallet balance is a cache; this table is the
 * source of truth. Every credit/debit writes exactly one row here.
 */
@Entity
@Table(name = "wallet_transactions", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class WalletTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "wallet_id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID walletId;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID userId;

    /** CREDIT | DEBIT */
    @Column(name = "direction", nullable = false, updatable = false)
    private String direction;

    /** TOPUP | PURCHASE | RENEWAL | REFUND | UPGRADE_CREDIT | ADJUSTMENT | BONUS */
    @Column(name = "type", nullable = false, updatable = false)
    private String type;

    @Column(name = "amount_satang", nullable = false, updatable = false)
    private long amountSatang;

    @Column(name = "balance_after_satang", nullable = false, updatable = false)
    private long balanceAfterSatang;

    /** PAYMENT | ORDER | SUBSCRIPTION | MANUAL */
    @Column(name = "reference_type", updatable = false)
    private String referenceType;

    @Column(name = "reference_id", columnDefinition = "uuid", updatable = false)
    private UUID referenceId;

    @Column(name = "note", updatable = false)
    private String note;

    /** Admin profile id for manual ADJUSTMENT, otherwise null. */
    @Column(name = "created_by", columnDefinition = "uuid", updatable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
