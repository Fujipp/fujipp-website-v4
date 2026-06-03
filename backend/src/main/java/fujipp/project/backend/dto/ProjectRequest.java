package fujipp.project.backend.dto;

import tools.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProjectRequest(
    @NotBlank String slug,
    @NotBlank String category,
    @NotBlank String status,
    boolean featured,
    Integer featuredOrder,
    String architectureImage,
    @NotNull JsonNode content,
    @NotNull JsonNode overview,
    @NotNull JsonNode roles,
    @NotNull JsonNode techStack,
    @NotNull JsonNode gallery,
    @NotNull JsonNode links,
    @NotNull JsonNode stack,
    @NotNull JsonNode stackGroups,
    @NotNull JsonNode timeline
) {
}
