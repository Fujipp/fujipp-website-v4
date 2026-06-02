package fujipp.project.backend.dto;

import fujipp.project.backend.model.Profile;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProfileResponse(
    UUID id,
    String email,
    String username,
    String displayName,
    String avatarUrl,
    String provider,
    String role,
    String bio,
    String website,
    String githubUrl,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static ProfileResponse from(Profile profile) {
        return new ProfileResponse(
            profile.getId(),
            profile.getEmail(),
            profile.getUsername(),
            profile.getDisplayName(),
            profile.getAvatarUrl(),
            profile.getProvider(),
            profile.getRole(),
            profile.getBio(),
            profile.getWebsite(),
            profile.getGithubUrl(),
            profile.getCreatedAt(),
            profile.getUpdatedAt()
        );
    }
}
