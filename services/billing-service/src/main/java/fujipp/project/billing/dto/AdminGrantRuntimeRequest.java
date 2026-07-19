package fujipp.project.billing.dto;

import java.util.UUID;

/**
 * Admin grant of a new runtime seat, free of charge — no wallet debit and no order.
 * The seat is mandatory; the bot subject is optional so the runtime may be assigned later.
 */
public record AdminGrantRuntimeRequest(
    UUID userId,
    String subjectId,
    UUID runtimePlanId,
    UUID vpsSlotId
) {}
