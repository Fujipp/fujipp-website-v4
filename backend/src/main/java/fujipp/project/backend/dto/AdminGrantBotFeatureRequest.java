package fujipp.project.backend.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Admin grants a feature to a bot. The subject (bot id) and owner are resolved server-side.
 * {@code priceId} is optional (supplies the term + renew price for monthly rentals).
 */
public record AdminGrantBotFeatureRequest(
    @NotNull UUID featureId,
    UUID priceId,
    @NotNull String billingType
) {}
