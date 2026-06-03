package fujipp.project.backend.controller;

import fujipp.project.backend.dto.ProfileResponse;
import fujipp.project.backend.dto.UpdateProfileRequest;
import fujipp.project.backend.model.Profile;
import fujipp.project.backend.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final ProfileService profileService;

    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String email = jwt.getClaimAsString("email");

        Map<String, Object> userMeta = jwt.getClaim("user_metadata");
        String displayName = extractString(userMeta, "full_name", "name", "user_name");
        String avatarUrl   = extractString(userMeta, "avatar_url");

        Map<String, Object> appMeta = jwt.getClaim("app_metadata");
        String provider = appMeta != null ? (String) appMeta.get("provider") : null;

        Profile profile = profileService.getOrCreateProfile(userId, email, displayName, avatarUrl, provider);
        return ResponseEntity.ok(ProfileResponse.from(profile));
    }

    @PutMapping("/profile")
    public ResponseEntity<ProfileResponse> updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid UpdateProfileRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        Profile profile = profileService.updateProfile(userId, request);
        return ResponseEntity.ok(ProfileResponse.from(profile));
    }

    private String extractString(Map<String, Object> meta, String... keys) {
        if (meta == null) return null;
        for (String key : keys) {
            Object val = meta.get(key);
            if (val instanceof String s && !s.isBlank()) return s;
        }
        return null;
    }
}
