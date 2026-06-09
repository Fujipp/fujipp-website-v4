package fujipp.project.backend.dto;

import fujipp.project.backend.model.VpsNode;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Admin view of a VPS host. Never exposes the service token (only whether one is set). */
public record VpsNodeResponse(
    UUID id,
    String name,
    String label,
    String region,
    String status,
    int maxSlots,
    long usedSlots,
    long freeSlots,
    String orchestratorUrl,
    boolean hasServiceToken,
    String notes,
    OffsetDateTime createdAt
) {
    public static VpsNodeResponse from(VpsNode n, long used) {
        return new VpsNodeResponse(
            n.getId(),
            n.getName(),
            n.getLabel(),
            n.getRegion(),
            n.getStatus(),
            n.getMaxSlots(),
            used,
            Math.max(0, n.getMaxSlots() - used),
            n.getOrchestratorUrl(),
            n.getServiceTokenCipher() != null && !n.getServiceTokenCipher().isBlank(),
            n.getNotes(),
            n.getCreatedAt()
        );
    }
}
