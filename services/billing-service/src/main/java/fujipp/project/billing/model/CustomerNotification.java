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
 * A message shown to the SaaS customer — e.g. "renewal failed", "runtime suspended".
 * Written by the automation sweep. Maps billing.customer_notifications.
 */
@Entity
@Table(name = "customer_notifications", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class CustomerNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "external_subject_id")
    private String externalSubjectId;

    /** TOPUP_SUCCESS | WALLET_LOW | RENEWAL_SUCCESS | RENEWAL_FAILED | RUNTIME_SUSPENDED | FEATURE_CANCELED | SOURCE_UPDATE_AVAILABLE */
    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "message", nullable = false)
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static CustomerNotification of(UUID userId, String subjectId, String type, String title, String message) {
        CustomerNotification n = new CustomerNotification();
        n.userId = userId;
        n.externalSubjectId = subjectId;
        n.type = type;
        n.title = title;
        n.message = message;
        return n;
    }
}
