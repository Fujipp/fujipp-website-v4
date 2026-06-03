package fujipp.project.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record FeaturedProjectsRequest(
    @NotNull
    @Size(max = 3)
    List<UUID> projectIds
) {
}
