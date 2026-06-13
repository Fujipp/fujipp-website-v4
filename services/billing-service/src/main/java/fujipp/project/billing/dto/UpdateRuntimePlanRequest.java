package fujipp.project.billing.dto;

import java.time.OffsetDateTime;

/**
 * Partial update of a runtime plan. Every field is optional: a {@code null} field is
 * left unchanged. Promotion is handled as a unit — set {@code clearPromotion=true} to
 * wipe all promo fields, otherwise provided promo fields are applied.
 */
public record UpdateRuntimePlanRequest(
    String name,
    Long priceSatang,
    Integer durationMonths,
    Boolean featured,
    Integer sortOrder,
    Boolean active,
    Boolean clearPromotion,
    String promotionLabel,
    Long promotionPriceSatang,
    OffsetDateTime promotionStartsAt,
    OffsetDateTime promotionEndsAt
) {}
