package fujipp.project.voucher.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A single TrueMoney voucher redeem (top-up) attempt and its outcome. */
@Entity
@Table(name = "redeem", schema = "voucher")
@Getter
@Setter
@NoArgsConstructor
public class Redeem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "client_id", nullable = false, updatable = false)
    private String clientId;

    @Column(name = "phone", nullable = false, updatable = false)
    private String phone;

    @Column(name = "gift_url_hash", nullable = false, updatable = false)
    private String giftUrlHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RedeemStatus status = RedeemStatus.CREATED;

    @Column(name = "amount_satang")
    private Long amountSatang;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "currency", length = 3, nullable = false)
    private String currency = "THB";

    @Column(name = "issuer")
    private String issuer;

    @Column(name = "reference")
    private String reference;

    @Column(name = "fail_code")
    private String failCode;

    @Column(name = "fail_reason")
    private String failReason;

    @Column(name = "idempotency_key", updatable = false)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
