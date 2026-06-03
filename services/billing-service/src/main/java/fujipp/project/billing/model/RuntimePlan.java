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
import java.util.UUID;

@Entity
@Table(name = "runtime_plans", schema = "billing")
@Getter
@Setter
@NoArgsConstructor
public class RuntimePlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "duration_months", nullable = false)
    private int durationMonths;

    @Column(name = "price_satang", nullable = false)
    private long priceSatang;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "currency", length = 3, nullable = false)
    private String currency = "THB";

    @Column(name = "promotion_label")
    private String promotionLabel;

    @Column(name = "promotion_price_satang")
    private Long promotionPriceSatang;

    @Column(name = "promotion_starts_at")
    private OffsetDateTime promotionStartsAt;

    @Column(name = "promotion_ends_at")
    private OffsetDateTime promotionEndsAt;

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
