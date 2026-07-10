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

@Entity
@Table(name = "feature_catalog", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class FeatureCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", nullable = false)
    private String description = "";

    @Column(name = "icon_key", nullable = false)
    private String iconKey = "shop-all";

    /** SHOP | PAYMENT | ROBLOX | ENGAGEMENT | RUNTIME | ADMIN | AUTOMATION | SUPPORT */
    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "current_source_version")
    private String currentSourceVersion;

    @Column(name = "is_featured", nullable = false)
    private boolean featured = false;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 100;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
