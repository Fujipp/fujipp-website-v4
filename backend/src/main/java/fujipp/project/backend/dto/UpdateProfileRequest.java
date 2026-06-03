package fujipp.project.backend.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(

    @Size(min = 3, max = 30)
    @Pattern(regexp = "^[a-zA-Z0-9_.-]+$", message = "Username can only contain letters, numbers, underscores, dots, and hyphens")
    String username,

    @Size(max = 100)
    String displayName,

    @Size(max = 500)
    String bio,

    @Size(max = 255)
    String website,

    @Size(max = 255)
    String githubUrl
) {}
