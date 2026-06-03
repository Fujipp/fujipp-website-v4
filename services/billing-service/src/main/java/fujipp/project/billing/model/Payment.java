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
 * Real-money entry point. The only way funds enter the system: once a payment is
 * PAID, the wallet is credited with type TOPUP.
 */
@Entity
@Table(name = "payments", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "purpose", nullable = false)
    private String purpose = "WALLET_TOPUP";

    @Column(name = "provider", nullable = false)
    private String provider = "MANUAL";

    @Column(name = "provider_payment_id")
    private String providerPaymentId;

    @Column(name = "reference")
    private String reference;

    /** PENDING | PAID | FAILED | EXPIRED | REFUNDED */
    @Column(name = "status", nullable = false)
    private String status = "PENDING";

    @Column(name = "amount_satang", nullable = false)
    private long amountSatang;

    @Column(name = "currency", nullable = false)
    private String currency = "THB";

    @Column(name = "qr_code_url")
    private String qrCodeUrl;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @Column(name = "failure_message")
    private String failureMessage;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
