package fujipp.project.billing.dto;

import fujipp.project.billing.model.RuntimePlan;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Full runtime plan view for the admin pricing editor (includes inactive + promo + ordering). */
public record AdminRuntimePlanResponse(
    UUID id,
    String code,
    String name,
    int durationMonths,
    long priceSatang,
    String currency,
    String promotionLabel,
    Long promotionPriceSatang,
    OffsetDateTime promotionStartsAt,
    OffsetDateTime promotionEndsAt,
    boolean featured,
    int sortOrder,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static AdminRuntimePlanResponse from(RuntimePlan plan) {
        return new AdminRuntimePlanResponse(
            plan.getId(),
            plan.getCode(),
            plan.getName(),
            plan.getDurationMonths(),
            plan.getPriceSatang(),
            plan.getCurrency(),
            plan.getPromotionLabel(),
            plan.getPromotionPriceSatang(),
            plan.getPromotionStartsAt(),
            plan.getPromotionEndsAt(),
            plan.isFeatured(),
            plan.getSortOrder(),
            plan.isActive(),
            plan.getCreatedAt(),
            plan.getUpdatedAt()
        );
    }
}
