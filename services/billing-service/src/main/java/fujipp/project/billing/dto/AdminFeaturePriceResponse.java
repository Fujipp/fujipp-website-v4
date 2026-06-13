package fujipp.project.billing.dto;

import fujipp.project.billing.model.FeaturePrice;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Full feature-price (SKU) view for the admin pricing editor, with its owning feature. */
public record AdminFeaturePriceResponse(
    UUID id,
    UUID featureId,
    String featureCode,
    String featureName,
    String kind,
    long priceSatang,
    String currency,
    Integer durationMonths,
    String promotionLabel,
    Long promotionPriceSatang,
    OffsetDateTime promotionStartsAt,
    OffsetDateTime promotionEndsAt,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static AdminFeaturePriceResponse from(FeaturePrice price, String featureCode, String featureName) {
        return new AdminFeaturePriceResponse(
            price.getId(),
            price.getFeatureId(),
            featureCode,
            featureName,
            price.getKind(),
            price.getPriceSatang(),
            price.getCurrency(),
            price.getDurationMonths(),
            price.getPromotionLabel(),
            price.getPromotionPriceSatang(),
            price.getPromotionStartsAt(),
            price.getPromotionEndsAt(),
            price.isActive(),
            price.getCreatedAt(),
            price.getUpdatedAt()
        );
    }
}
