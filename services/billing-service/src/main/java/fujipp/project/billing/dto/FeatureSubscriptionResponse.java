package fujipp.project.billing.dto;

import fujipp.project.billing.model.FeatureSubscription;

import java.time.LocalDate;
import java.util.UUID;

public record FeatureSubscriptionResponse(
    UUID id,
    UUID featureId,
    String scope,
    String externalSubjectId,
    String billingType,
    String status,
    LocalDate currentPeriodStart,
    LocalDate currentPeriodEnd,
    boolean autoRenew,
    Long renewPriceSatang
) {
    public static FeatureSubscriptionResponse from(FeatureSubscription s) {
        return new FeatureSubscriptionResponse(
            s.getId(), s.getFeatureId(), s.getScope(), s.getExternalSubjectId(),
            s.getBillingType(), s.getStatus(), s.getCurrentPeriodStart(),
            s.getCurrentPeriodEnd(), s.isAutoRenew(), s.getRenewPriceSatang());
    }
}
