package fujipp.project.billing.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * A purchase paid from wallet credit. {@code idempotencyKey} (a client-generated
 * UUID) makes a retried submit return the original order instead of charging twice.
 */
public record PurchaseRequest(
    String idempotencyKey,

    @NotEmpty(message = "At least one item is required")
    List<PurchaseItemRequest> items
) {}
