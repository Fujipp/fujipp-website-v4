package fujipp.project.billing.dto;

import java.util.List;
import java.util.UUID;

/**
 * A VPS "cabinet" with its sellable seats. {@code freeSlots} counts seats the
 * caller can buy right now; the cabinet is full when it reaches zero.
 */
public record VpsNodeView(
    UUID id,
    String name,
    String label,
    String region,
    String status,
    int maxSlots,
    int freeSlots,
    List<VpsSlotView> slots
) {}
