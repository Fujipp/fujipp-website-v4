package fujipp.project.backend.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Transfer a bot to another user. */
public record TransferBotRequest(
    @NotNull UUID newUserId
) {}
