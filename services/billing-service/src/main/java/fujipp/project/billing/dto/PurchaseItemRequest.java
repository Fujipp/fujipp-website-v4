package fujipp.project.billing.dto;

import java.util.UUID;

/**
 * One basket line. Provide exactly one of:
 *   - priceId       → buy a feature SKU (kind comes from the price: RENT_MONTHLY / RENT_PERMANENT / SOURCE_CODE)
 *   - runtimePlanId → buy/extend runtime hosting
 *
 * externalSubjectId (the bot id) is required for RENT_MONTHLY and RUNTIME,
 * and must be omitted for RENT_PERMANENT and SOURCE_CODE.
 */
public record PurchaseItemRequest(
    UUID priceId,
    UUID runtimePlanId,
    String externalSubjectId
) {}
