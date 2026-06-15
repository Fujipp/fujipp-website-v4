package fujipp.project.billing.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Admin override of one user's runtime subscription. Every field optional ({@code null}
 * = unchanged). Set {@code clearRenewPrice=true} to remove the locked-in renewal price.
 */
public record AdminUpdateRuntimeSubscriptionRequest(
    Long renewPriceSatang,
    Boolean clearRenewPrice,
    UUID runtimePlanId,
    UUID renewPlanId,
    String status,
    LocalDate currentPeriodEnd,
    Boolean autoRenew
) {}
