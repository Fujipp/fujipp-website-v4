package fujipp.project.billing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Append-only trail of privileged admin actions (catalog price edits, renewal-price
 * overrides, wallet adjustments, user/role and bot config changes). Written via
 * {@code AdminAuditService}; never mutated after insert.
 */
@Entity
@Table(name = "admin_audit_log", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    /** Admin profile that performed the action (null only if the profile was later removed). */
    @Column(name = "actor_id", columnDefinition = "uuid", updatable = false)
    private UUID actorId;

    /** e.g. CATALOG_PRICE_UPDATE | SUBSCRIPTION_OVERRIDE | WALLET_ADJUST | USER_ROLE_UPDATE | BOT_CONFIG_UPDATE. */
    @Column(name = "action", nullable = false, updatable = false)
    private String action;

    @Column(name = "target_user_id", columnDefinition = "uuid", updatable = false)
    private UUID targetUserId;

    /** RUNTIME_PLAN | FEATURE_PRICE | RUNTIME_SUBSCRIPTION | FEATURE_SUBSCRIPTION | WALLET | PROFILE | BOT */
    @Column(name = "target_type", updatable = false)
    private String targetType;

    /** uuid or external subject id of the target, as text. */
    @Column(name = "target_id", updatable = false)
    private String targetId;

    /** JSON detail (before/after diff or action context). Mapped to jsonb by Hibernate. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", updatable = false)
    private Map<String, Object> payload;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
