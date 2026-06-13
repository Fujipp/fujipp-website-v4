package fujipp.project.billing.dto;

import java.time.OffsetDateTime;

/**
 * Partial update of a feature price (SKU). A {@code null} field is left unchanged.
 * Promotion is handled as a unit — set {@code clearPromotion=true} to wipe all promo
 * fields, otherwise provided promo fields are applied. {@code kind} is immutable.
 */
public record UpdateFeaturePriceRequest(
    Long priceSatang,
    Integer durationMonths,
    Boolean active,
    Boolean clearPromotion,
    String promotionLabel,
    Long promotionPriceSatang,
    OffsetDateTime promotionStartsAt,
    OffsetDateTime promotionEndsAt
) {}
