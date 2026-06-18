package fujipp.project.backend.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Admin grants runtime to a bot. The subject (bot id) and owner are resolved server-side. */
public record AdminGrantBotRuntimeRequest(
    @NotNull UUID runtimePlanId
) {}
