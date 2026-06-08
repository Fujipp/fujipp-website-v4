package fujipp.project.billing.dto;

import fujipp.project.billing.model.FeaturePrice;

import java.util.UUID;

public record FeaturePriceResponse(
    UUID id,
    String kind,
    long priceSatang,
    long effectivePriceSatang,
    boolean onPromotion,
    String promotionLabel,
    Integer durationMonths
) {
    public static FeaturePriceResponse from(FeaturePrice price, long effectiveSatang, boolean onPromotion) {
        return new FeaturePriceResponse(
            price.getId(),
            price.getKind(),
            price.getPriceSatang(),
            effectiveSatang,
            onPromotion,
            price.getPromotionLabel(),
            price.getDurationMonths()
        );
    }
}
