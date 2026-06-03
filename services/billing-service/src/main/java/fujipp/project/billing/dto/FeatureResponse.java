package fujipp.project.billing.dto;

import fujipp.project.billing.model.FeatureCatalog;

import java.util.List;
import java.util.UUID;

public record FeatureResponse(
    UUID id,
    String code,
    String name,
    String description,
    String category,
    String currentSourceVersion,
    boolean featured,
    List<FeaturePriceResponse> prices
) {
    public static FeatureResponse from(FeatureCatalog feature, List<FeaturePriceResponse> prices) {
        return new FeatureResponse(
            feature.getId(),
            feature.getCode(),
            feature.getName(),
            feature.getDescription(),
            feature.getCategory(),
            feature.getCurrentSourceVersion(),
            feature.isFeatured(),
            prices
        );
    }
}
