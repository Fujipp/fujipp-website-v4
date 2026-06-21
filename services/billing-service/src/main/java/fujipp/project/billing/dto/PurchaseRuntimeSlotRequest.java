package fujipp.project.billing.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Buy runtime for a specific VPS seat. {@code externalSubjectId} is optional — if
 * given, the runtime is assigned to that bot immediately (it comes online); if
 * omitted, the runtime is bought unassigned and can be assigned later.
 * {@code idempotencyKey} makes a retried submit return the original order.
 */
public record PurchaseRuntimeSlotRequest(
    @NotNull(message = "runtimePlanId is required")
    UUID runtimePlanId,
    String externalSubjectId,
    String idempotencyKey
) {}
