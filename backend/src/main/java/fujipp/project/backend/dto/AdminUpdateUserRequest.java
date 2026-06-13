package fujipp.project.backend.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Admin edit of any user's profile. Every field optional ({@code null} = unchanged).
 * {@code role} is USER or ADMIN. Username/display rules mirror self-service edits.
 */
public record AdminUpdateUserRequest(

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
    String githubUrl,

    @Pattern(regexp = "^(USER|ADMIN)$", message = "role must be USER or ADMIN")
    String role
) {}
