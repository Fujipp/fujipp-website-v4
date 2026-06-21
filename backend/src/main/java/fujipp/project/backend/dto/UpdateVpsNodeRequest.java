package fujipp.project.backend.dto;

/**
 * Update a VPS host. All fields optional — only non-null values are applied. A blank
 * serviceToken keeps the existing token; a non-blank one re-encrypts and replaces it.
 * The node name is immutable and cannot be changed here.
 */
public record UpdateVpsNodeRequest(
    String label,
    String region,
    String orchestratorUrl,
    String serviceToken,
    Integer maxSlots,
    Integer reservedSlots,
    String status,
    String notes
) {}
