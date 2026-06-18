package fujipp.project.billing.dto;

import java.util.UUID;

/**
 * Admin grant of a feature to a bot (subject), free of charge — no wallet debit, no order.
 * Mirrors a feature purchase ({@code RENT_MONTHLY} / {@code RENT_PERMANENT}). {@code priceId}
 * is optional and only supplies the term + locked-in renew price for monthly rentals.
 * Unlike a user purchase, this does not require the bot's runtime to be active.
 */
public record AdminGrantFeatureRequest(
    UUID userId,
    String subjectId,
    UUID featureId,
    UUID priceId,
    String billingType
) {}
