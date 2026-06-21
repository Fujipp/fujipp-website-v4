package fujipp.project.backend.dto;

import fujipp.project.backend.model.VpsSlot;

import java.util.UUID;

/**
 * Admin view of one seat. {@code occupied} = an active runtime sits here right now
 * (derived from billing); {@code status} is the admin-set availability
 * (FREE/RESERVED/MAINTENANCE).
 */
public record VpsSlotResponse(
    UUID id,
    int slotIndex,
    String status,
    boolean occupied,
    String notes
) {
    public static VpsSlotResponse from(VpsSlot s, boolean occupied) {
        return new VpsSlotResponse(s.getId(), s.getSlotIndex(), s.getStatus(), occupied, s.getNotes());
    }
}
