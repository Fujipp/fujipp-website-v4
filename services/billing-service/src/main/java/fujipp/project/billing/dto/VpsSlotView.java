package fujipp.project.billing.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * One seat in the server-cabinet view.
 *
 * {@code occupancy}:
 *   FREE        — sellable (status FREE and no active runtime)
 *   OCCUPIED    — an active runtime sits here ({@code mine} tells if it's the caller's)
 *   RESERVED    — kept for backend/services, not for sale
 *   MAINTENANCE — temporarily unavailable
 *
 * Runtime fields are populated only when OCCUPIED; {@code assignedBotId} is null
 * when the occupying runtime was bought but not yet assigned to a bot.
 */
public record VpsSlotView(
    UUID id,
    int slotIndex,
    String occupancy,
    boolean mine,
    UUID runtimeId,
    String assignedBotId,
    LocalDate expiresAt
) {}
