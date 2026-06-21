package fujipp.project.backend.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Flip a single seat between FREE and MAINTENANCE (RESERVED is managed via the
 * node's reservedSlots, not per-seat here).
 */
public record UpdateSlotStatusRequest(
    @NotBlank(message = "status is required")
    String status
) {}
