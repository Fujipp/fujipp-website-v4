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
 * A downloadable source release for a feature. Owners always pull the latest one.
 */
@Entity
@Table(name = "source_code_releases", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class SourceCodeRelease {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "feature_id", columnDefinition = "uuid", nullable = false)
    private UUID featureId;

    @Column(name = "version", nullable = false)
    private String version;

    @Column(name = "changelog")
    private String changelog;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "is_latest", nullable = false)
    private boolean latest = false;

    @Column(name = "released_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime releasedAt;
}
