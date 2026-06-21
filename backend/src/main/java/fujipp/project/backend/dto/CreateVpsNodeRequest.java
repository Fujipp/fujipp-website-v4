package fujipp.project.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/**
 * Register a VPS host. orchestratorUrl / serviceToken are optional — leave null to
 * use the backend's default runtime.* env config (as the primary shared VPS does).
 * The token is encrypted before storage.
 */
public record CreateVpsNodeRequest(
    @NotBlank(message = "name is required")
    String name,

    String label,

    String region,

    String orchestratorUrl,

    String serviceToken,

    @Min(value = 0, message = "maxSlots must be >= 0")
    int maxSlots,

    // Seats held back for backend/services (never sold). Must be 0..maxSlots.
    @Min(value = 0, message = "reservedSlots must be >= 0")
    int reservedSlots,

    // ACTIVE | DRAINING | OFFLINE — defaults to ACTIVE when blank.
    String status,

    String notes
) {}
