package fujipp.project.billing.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Admin: relocate a runtime to a different free seat (e.g. draining a problem VPS). */
public record AdminMoveSeatRequest(
    @NotNull(message = "vpsSlotId is required")
    UUID vpsSlotId
) {}
