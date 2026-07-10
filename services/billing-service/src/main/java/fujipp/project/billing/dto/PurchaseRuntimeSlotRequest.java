package fujipp.project.billing.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Buy runtime for a specific VPS seat. Runtime is deliberately bought into the
 * customer's unassigned inventory; selecting a bot happens afterwards from the
 * dashboard. {@code idempotencyKey} makes a retried submit return the original
 * order.
 */
public record PurchaseRuntimeSlotRequest(
    @NotNull(message = "runtimePlanId is required")
    UUID runtimePlanId,
    String idempotencyKey
) {}
