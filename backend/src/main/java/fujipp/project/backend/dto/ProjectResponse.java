package fujipp.project.backend.dto;

import tools.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProjectResponse(
    UUID id,
    String slug,
    String category,
    String status,
    boolean featured,
    String architectureImage,
    JsonNode content,
    JsonNode overview,
    JsonNode roles,
    JsonNode techStack,
    JsonNode gallery,
    JsonNode links,
    JsonNode stack,
    JsonNode stackGroups,
    JsonNode timeline,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
}
