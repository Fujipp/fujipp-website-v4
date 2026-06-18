package fujipp.project.billing.dto;

import java.util.UUID;

/**
 * Admin grant of runtime to a bot (subject), free of charge — no wallet debit, no order.
 * Mirrors a runtime purchase: an existing subscription for the subject is extended by the
 * plan's term, otherwise a new one is created.
 */
public record AdminGrantRuntimeRequest(
    UUID userId,
    String subjectId,
    UUID runtimePlanId
) {}
