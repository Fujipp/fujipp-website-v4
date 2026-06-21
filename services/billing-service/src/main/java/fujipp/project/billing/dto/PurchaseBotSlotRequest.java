package fujipp.project.billing.dto;

/**
 * Buy one permanent bot slot from wallet credit. {@code idempotencyKey} (a
 * client/backend-generated UUID) makes a retried submit return the original order
 * instead of charging — and granting — twice.
 */
public record PurchaseBotSlotRequest(
    String idempotencyKey
) {}
