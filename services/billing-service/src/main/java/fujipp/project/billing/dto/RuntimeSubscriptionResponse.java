package fujipp.project.billing.dto;

import fujipp.project.billing.model.RuntimeSubscription;

import java.time.LocalDate;
import java.util.UUID;

public record RuntimeSubscriptionResponse(
    UUID id,
    String externalSubjectId,
    UUID vpsSlotId,
    UUID runtimePlanId,
    String status,
    LocalDate currentPeriodStart,
    LocalDate currentPeriodEnd,
    boolean autoRenew,
    Long renewPriceSatang,
    UUID renewPlanId
) {
    public static RuntimeSubscriptionResponse from(RuntimeSubscription s) {
        return new RuntimeSubscriptionResponse(
            s.getId(), s.getExternalSubjectId(), s.getVpsSlotId(), s.getRuntimePlanId(), s.getStatus(),
            s.getCurrentPeriodStart(), s.getCurrentPeriodEnd(), s.isAutoRenew(),
            s.getRenewPriceSatang(), s.getRenewPlanId());
    }
}
