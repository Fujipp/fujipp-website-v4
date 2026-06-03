package fujipp.project.billing.dto;

import fujipp.project.billing.model.RuntimePlan;

import java.util.UUID;

public record RuntimePlanResponse(
    UUID id,
    String code,
    String name,
    int durationMonths,
    long priceSatang,
    long effectivePriceSatang,
    boolean onPromotion,
    String promotionLabel,
    boolean featured
) {
    public static RuntimePlanResponse from(RuntimePlan plan, long effectiveSatang, boolean onPromotion) {
        return new RuntimePlanResponse(
            plan.getId(),
            plan.getCode(),
            plan.getName(),
            plan.getDurationMonths(),
            plan.getPriceSatang(),
            effectiveSatang,
            onPromotion,
            plan.getPromotionLabel(),
            plan.isFeatured()
        );
    }
}
