package fujipp.project.billing.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * One seat across the whole fleet for the admin cabinet table. When OCCUPIED the
 * occupant fields say who (owner), which bot, which runtime, and when it expires.
 */
public record AdminSeatView(
    UUID nodeId,
    String nodeName,
    String nodeStatus,
    UUID slotId,
    int slotIndex,
    String occupancy,
    UUID runtimeId,
    UUID ownerUserId,
    String assignedBotId,
    LocalDate expiresAt
) {}
