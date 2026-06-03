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
 * One-time source-code ownership, tied to the user (not a subject). Owners always
 * pull the latest release for the feature (free updates).
 */
@Entity
@Table(name = "source_code_entitlements", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class SourceCodeEntitlement {

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

    @Column(name = "purchased_version")
    private String purchasedVersion;

    @Column(name = "license_key", nullable = false, unique = true)
    private String licenseKey;

    /** PENDING | READY | REVOKED */
    @Column(name = "status", nullable = false)
    private String status = "PENDING";

    @Column(name = "download_url")
    private String downloadUrl;

    @Column(name = "download_expires_at")
    private OffsetDateTime downloadExpiresAt;

    @Column(name = "download_count", nullable = false)
    private int downloadCount = 0;

    @Column(name = "max_downloads")
    private Integer maxDownloads;

    @Column(name = "purchased_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime purchasedAt;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
