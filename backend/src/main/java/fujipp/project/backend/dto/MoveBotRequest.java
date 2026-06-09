package fujipp.project.backend.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Move a bot to another VPS host. */
public record MoveBotRequest(
    @NotNull(message = "targetNodeId is required")
    UUID targetNodeId
) {}
