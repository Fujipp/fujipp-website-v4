package fujipp.project.billing.dto;

import java.time.LocalDate;

/**
 * Admin override of one user's feature subscription. Every field optional ({@code null}
 * = unchanged). Set {@code clearRenewPrice=true} to remove the locked-in renewal price.
 */
public record AdminUpdateFeatureSubscriptionRequest(
    Long renewPriceSatang,
    Boolean clearRenewPrice,
    String status,
    LocalDate currentPeriodEnd,
    Boolean autoRenew
) {}
