package fujipp.project.billing.dto;

import java.util.UUID;

/**
 * One basket line. Provide exactly one of:
 *   - priceId       → buy a feature SKU (kind comes from the price: RENT_MONTHLY / RENT_PERMANENT / SOURCE_CODE)
 *   - runtimePlanId → buy/extend runtime hosting
 *
 * externalSubjectId (the bot id) is required for feature purchases (RENT_MONTHLY,
 * RENT_PERMANENT — features are per-bot) and for RUNTIME. It must be omitted only
 * for SOURCE_CODE, which is owned by the user, not tied to a bot.
 */
public record PurchaseItemRequest(
    UUID priceId,
    UUID runtimePlanId,
    String externalSubjectId
) {}
