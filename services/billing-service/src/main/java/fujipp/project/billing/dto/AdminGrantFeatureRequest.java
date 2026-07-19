package fujipp.project.billing.dto;

import java.util.UUID;

/**
 * Admin grant of a feature, free of charge — no wallet debit and no order. The bot subject
 * is optional; a null subject keeps this row in the user's unused feature stack.
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
