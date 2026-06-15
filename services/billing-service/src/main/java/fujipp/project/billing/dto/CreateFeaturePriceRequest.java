package fujipp.project.billing.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Create a new feature price (SKU) for an existing feature. {@code featureId},
 * {@code kind} and {@code priceSatang} are required; {@code kind} must be one of
 * RENT_MONTHLY / RENT_PERMANENT / SOURCE_CODE and unique per feature. Promotion
 * fields are optional.
 */
public record CreateFeaturePriceRequest(
    UUID featureId,
    String kind,
    Long priceSatang,
    Integer durationMonths,
    Boolean active,
    String promotionLabel,
    Long promotionPriceSatang,
    OffsetDateTime promotionStartsAt,
    OffsetDateTime promotionEndsAt
) {}
